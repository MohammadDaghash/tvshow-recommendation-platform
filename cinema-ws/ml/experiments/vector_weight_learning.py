#!/usr/bin/env python3

import argparse
import json
import math
import sys
from pathlib import Path

FEATURE_FIELDS = [
    "vectorSimilarity",
    "tmdbRating",
    "popularity",
    "yearSimilarity",
    "languagePreference",
]

FEATURE_ALIASES = {
    "vectorSimilarity": ["vectorSimilarity", "genreSimilarity", "categoryPreference"],
    "tmdbRating": ["tmdbRating"],
    "popularity": ["popularity"],
    "yearSimilarity": ["yearSimilarity"],
    "languagePreference": ["languagePreference"],
}

FEATURE_DEFAULTS = {
    "languagePreference": 70,
}

DEFAULT_RUNTIME_WEIGHTS = {
    "vectorSimilarity": 0.75,
    "tmdbRating": 0.10,
    "popularity": 0.05,
    "yearSimilarity": 0.05,
    "languagePreference": 0.05,
}


def to_number(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    return number if math.isfinite(number) else None


def clamp(value, minimum=0.0, maximum=1.0):
    return max(minimum, min(maximum, value))


def normalize_feature(value):
    number = to_number(value)

    if number is None:
        return None

    return clamp(number / 100.0)


def get_breakdown_value(breakdown, field):
    for alias in FEATURE_ALIASES[field]:
        if alias in breakdown:
            return breakdown[alias]

    return FEATURE_DEFAULTS.get(field)


def complete_weight_map(weights):
    return {
        field: float(weights.get(field, 0.0))
        for field in FEATURE_FIELDS
    }


def normalize_positive_weights(raw_weights, fallback=None):
    fallback_weights = complete_weight_map(fallback or DEFAULT_RUNTIME_WEIGHTS)
    positive_weights = {
        field: max(0.0, float(raw_weights.get(field, 0.0)))
        for field in FEATURE_FIELDS
    }
    total = sum(positive_weights.values())

    if total <= 0:
        fallback_total = sum(fallback_weights.values()) or 1.0
        return {
            field: round(fallback_weights[field] / fallback_total, 4)
            for field in FEATURE_FIELDS
        }

    return {
        field: round(positive_weights[field] / total, 4)
        for field in FEATURE_FIELDS
    }


def build_data_warnings(sample_count, positive_count, negative_count):
    warnings = []

    if sample_count < 50:
        warnings.append("low_sample_count")
    if positive_count < 10:
        warnings.append("low_positive_count")
    if negative_count < 10:
        warnings.append("low_negative_count")

    larger_class = max(positive_count, negative_count)
    smaller_class = min(positive_count, negative_count)

    if larger_class > 0 and smaller_class / larger_class < 0.25:
        warnings.append("class_imbalance")

    return warnings


def label_training_row(
    row,
    positive_rating_threshold=8,
    negative_rating_threshold=5,
):
    rating = to_number(row.get("rating"))

    if row.get("wasRated") and rating is not None:
        if rating >= positive_rating_threshold:
            return 1
        if rating <= negative_rating_threshold:
            return 0
        return None

    if row.get("wasIgnored"):
        return 0

    if row.get("wasAccepted"):
        return 1

    return None


def extract_training_examples(
    export_data,
    positive_rating_threshold=8,
    negative_rating_threshold=5,
):
    examples = []

    for row in export_data.get("rows", []):
        label = label_training_row(
            row,
            positive_rating_threshold=positive_rating_threshold,
            negative_rating_threshold=negative_rating_threshold,
        )

        if label is None:
            continue

        breakdown = row.get("scoreBreakdown") or {}
        features = [
            normalize_feature(get_breakdown_value(breakdown, field))
            for field in FEATURE_FIELDS
        ]

        if any(value is None for value in features):
            continue

        examples.append(
            {
                "title": row.get("title", ""),
                "label": label,
                "features": features,
                "modelVersion": row.get("modelVersion", ""),
            }
        )

    return examples


def _fallback_result(examples, status):
    positive_count = sum(1 for example in examples if example["label"] == 1)
    negative_count = sum(1 for example in examples if example["label"] == 0)

    return {
        "status": status,
        "sampleCount": len(examples),
        "positiveCount": positive_count,
        "negativeCount": negative_count,
        "warnings": build_data_warnings(len(examples), positive_count, negative_count),
        "weights": complete_weight_map(DEFAULT_RUNTIME_WEIGHTS),
        "coefficients": dict.fromkeys(FEATURE_FIELDS, 0.0),
        "metrics": {
            "trainingAccuracy": None,
            "rocAuc": None,
        },
    }


def learn_weights_from_examples(examples, random_state=42):
    labels = [example["label"] for example in examples]

    if len(set(labels)) < 2:
        return _fallback_result(examples, "insufficient_labels")

    try:
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import accuracy_score, roc_auc_score
    except ImportError:
        return _fallback_result(examples, "sklearn_unavailable")

    features = np.array([example["features"] for example in examples], dtype=float)
    labels_array = np.array(labels, dtype=int)
    model = LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        random_state=random_state,
        solver="liblinear",
    )

    model.fit(features, labels_array)

    probabilities = model.predict_proba(features)[:, 1]
    predictions = model.predict(features)
    coefficients = {
        field: round(float(value), 6)
        for field, value in zip(FEATURE_FIELDS, model.coef_[0])
    }

    return {
        "status": "trained",
        "sampleCount": len(examples),
        "positiveCount": int(labels_array.sum()),
        "negativeCount": int(len(labels_array) - labels_array.sum()),
        "warnings": build_data_warnings(
            len(examples),
            int(labels_array.sum()),
            int(len(labels_array) - labels_array.sum()),
        ),
        "weights": normalize_positive_weights(coefficients),
        "coefficients": coefficients,
        "intercept": round(float(model.intercept_[0]), 6),
        "metrics": {
            "trainingAccuracy": round(float(accuracy_score(labels_array, predictions)), 4),
            "rocAuc": round(float(roc_auc_score(labels_array, probabilities)), 4),
        },
    }


def learn_weights_from_export(
    export_data,
    positive_rating_threshold=8,
    negative_rating_threshold=5,
):
    examples = extract_training_examples(
        export_data,
        positive_rating_threshold=positive_rating_threshold,
        negative_rating_threshold=negative_rating_threshold,
    )

    return learn_weights_from_examples(examples)


def load_json(path):
    if path == "-":
        return json.load(sys.stdin)

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def print_text_report(result):
    print("Python Vector Weight Learning")
    print(
        f"Status: {result['status']} | samples={result['sampleCount']} | "
        f"positive={result['positiveCount']} | negative={result['negativeCount']}"
    )
    print(
        "Learned runtime weights: "
        + ", ".join(
            f"{field}={round(result['weights'][field] * 100)}%"
            for field in FEATURE_FIELDS
        )
    )
    if result["warnings"]:
        print("Warnings: " + ", ".join(result["warnings"]))
    print(
        "Coefficients: "
        + ", ".join(f"{field}={result['coefficients'][field]}" for field in FEATURE_FIELDS)
    )
    metrics = result["metrics"]
    print(
        f"Training accuracy: {metrics['trainingAccuracy']} | ROC-AUC: {metrics['rocAuc']}"
    )


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Learn recommendation score weights from exported training data."
    )
    parser.add_argument(
        "--input",
        default="-",
        help="Path to training export JSON, or '-' for stdin.",
    )
    parser.add_argument("--output", help="Optional path for learned weights JSON.")
    parser.add_argument("--json", action="store_true", help="Print JSON report.")
    parser.add_argument("--positive-threshold", type=float, default=8)
    parser.add_argument("--negative-threshold", type=float, default=5)

    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv or sys.argv[1:])
    export_data = load_json(args.input)
    result = learn_weights_from_export(
        export_data,
        positive_rating_threshold=args.positive_threshold,
        negative_rating_threshold=args.negative_threshold,
    )

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print_text_report(result)


if __name__ == "__main__":
    main()

import math
import random


def round_float(value, places=4):
    if value is None:
        return None

    return round(float(value), places)


def safe_divide(numerator, denominator):
    return numerator / denominator if denominator else 0.0


def wilson_interval(successes, total, z=1.96):
    if total <= 0:
        return {
            "estimate": 0.0,
            "lower": 0.0,
            "upper": 0.0,
        }

    p_hat = successes / total
    z_squared = z * z
    denominator = 1 + z_squared / total
    center = (p_hat + z_squared / (2 * total)) / denominator
    margin = (
        z
        * math.sqrt((p_hat * (1 - p_hat) + z_squared / (4 * total)) / total)
        / denominator
    )

    return {
        "estimate": round_float(p_hat),
        "lower": round_float(max(0.0, center - margin)),
        "upper": round_float(min(1.0, center + margin)),
    }


def brier_score(labels, probabilities):
    if not labels:
        return 0.0

    squared_error = [
        (float(probability) - int(label)) ** 2
        for label, probability in zip(labels, probabilities)
    ]

    return round_float(sum(squared_error) / len(squared_error))


def log_loss(labels, probabilities, epsilon=1e-15):
    if not labels:
        return 0.0

    total_loss = 0.0

    for label, probability in zip(labels, probabilities):
        clean_probability = min(1 - epsilon, max(epsilon, float(probability)))
        total_loss += (
            int(label) * math.log(clean_probability)
            + (1 - int(label)) * math.log(1 - clean_probability)
        )

    return round_float(-total_loss / len(labels))


def expected_calibration_error(labels, probabilities, bin_count=10):
    if not labels:
        return 0.0

    total = len(labels)
    calibration_error = 0.0

    for bin_index in range(bin_count):
        lower = bin_index / bin_count
        upper = (bin_index + 1) / bin_count
        is_last_bin = bin_index == bin_count - 1
        bucket = [
            (label, probability)
            for label, probability in zip(labels, probabilities)
            if lower <= probability < upper or (is_last_bin and probability == 1)
        ]

        if not bucket:
            continue

        bucket_labels = [label for label, _ in bucket]
        bucket_probabilities = [probability for _, probability in bucket]
        bucket_accuracy = sum(bucket_labels) / len(bucket_labels)
        bucket_confidence = sum(bucket_probabilities) / len(bucket_probabilities)
        calibration_error += (
            len(bucket) / total * abs(bucket_accuracy - bucket_confidence)
        )

    return round_float(calibration_error)


def bootstrap_metric_interval(
    values,
    metric_fn,
    iterations=1000,
    confidence=0.95,
    random_state=42,
):
    if not values:
        return {
            "estimate": None,
            "lower": None,
            "upper": None,
        }

    rng = random.Random(random_state)
    estimates = []

    for _ in range(iterations):
        sample = [values[rng.randrange(len(values))] for _ in values]
        estimates.append(float(metric_fn(sample)))

    estimates.sort()
    alpha = 1 - confidence
    lower_index = max(0, int((alpha / 2) * len(estimates)))
    upper_index = min(len(estimates) - 1, int((1 - alpha / 2) * len(estimates)))

    return {
        "estimate": round_float(metric_fn(values)),
        "lower": round_float(estimates[lower_index]),
        "upper": round_float(estimates[upper_index]),
    }


def binary_auc(labels, probabilities):
    positives = [
        probability
        for label, probability in zip(labels, probabilities)
        if int(label) == 1
    ]
    negatives = [
        probability
        for label, probability in zip(labels, probabilities)
        if int(label) == 0
    ]

    if not positives or not negatives:
        return None

    wins = 0.0
    comparisons = len(positives) * len(negatives)

    for positive_probability in positives:
        for negative_probability in negatives:
            if positive_probability > negative_probability:
                wins += 1
            elif positive_probability == negative_probability:
                wins += 0.5

    return round_float(wins / comparisons)


def build_confusion_matrix(labels, probabilities, threshold=0.5):
    matrix = {
        "truePositive": 0,
        "falsePositive": 0,
        "trueNegative": 0,
        "falseNegative": 0,
    }

    for label, probability in zip(labels, probabilities):
        prediction = 1 if probability >= threshold else 0

        if label == 1 and prediction == 1:
            matrix["truePositive"] += 1
        elif label == 0 and prediction == 1:
            matrix["falsePositive"] += 1
        elif label == 0 and prediction == 0:
            matrix["trueNegative"] += 1
        elif label == 1 and prediction == 0:
            matrix["falseNegative"] += 1

    return matrix


def build_classification_diagnostics(
    labels,
    probabilities,
    threshold=0.5,
    bootstrap_iterations=1000,
):
    clean_labels = [int(label) for label in labels]
    clean_probabilities = [float(probability) for probability in probabilities]
    matrix = build_confusion_matrix(clean_labels, clean_probabilities, threshold)
    total = len(clean_labels)
    positive_count = sum(clean_labels)
    predicted_positive = matrix["truePositive"] + matrix["falsePositive"]

    metrics = {
        "accuracy": round_float(
            safe_divide(matrix["truePositive"] + matrix["trueNegative"], total)
        ),
        "precision": round_float(
            safe_divide(matrix["truePositive"], predicted_positive)
        ),
        "recall": round_float(safe_divide(matrix["truePositive"], positive_count)),
        "rocAuc": binary_auc(clean_labels, clean_probabilities),
        "brierScore": brier_score(clean_labels, clean_probabilities),
        "logLoss": log_loss(clean_labels, clean_probabilities),
        "expectedCalibrationError": expected_calibration_error(
            clean_labels,
            clean_probabilities,
        ),
    }
    brier_values = [
        (probability - label) ** 2
        for label, probability in zip(clean_labels, clean_probabilities)
    ]

    return {
        "sampleCount": total,
        "positiveCount": positive_count,
        "negativeCount": total - positive_count,
        "confusionMatrix": matrix,
        "metrics": metrics,
        "confidenceIntervals": {
            "positiveRate": wilson_interval(positive_count, total),
            "accuracy": wilson_interval(
                matrix["truePositive"] + matrix["trueNegative"],
                total,
            ),
        },
        "bootstrapIntervals": {
            "brierScore": bootstrap_metric_interval(
                brier_values,
                lambda sample: sum(sample) / len(sample),
                iterations=bootstrap_iterations,
            ),
        },
    }

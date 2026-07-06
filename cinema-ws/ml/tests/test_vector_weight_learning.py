import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR / "experiments"))

from vector_weight_learning import (  # noqa: E402
    FEATURE_FIELDS,
    extract_training_examples,
    label_training_row,
    learn_weights_from_examples,
    normalize_positive_weights,
)


def row(
    *,
    vector=70,
    tmdb=70,
    popularity=50,
    year=50,
    language=100,
    accepted=False,
    ignored=False,
    rated=False,
    rating=None,
):
    return {
        "title": "Synthetic Show",
        "scoreBreakdown": {
            "vectorSimilarity": vector,
            "tmdbRating": tmdb,
            "popularity": popularity,
            "yearSimilarity": year,
            "languagePreference": language,
        },
        "wasAccepted": accepted,
        "wasIgnored": ignored,
        "wasRated": rated,
        "rating": rating,
    }


class VectorWeightLearningTest(unittest.TestCase):
    def test_label_training_row_prefers_ratings_then_actions(self):
        self.assertEqual(label_training_row(row(rated=True, rating=9)), 1)
        self.assertEqual(label_training_row(row(rated=True, rating=4)), 0)
        self.assertIsNone(label_training_row(row(rated=True, rating=6)))
        self.assertEqual(label_training_row(row(accepted=True)), 1)
        self.assertEqual(label_training_row(row(ignored=True)), 0)

    def test_extract_training_examples_keeps_only_labelled_complete_rows(self):
        export_data = {
            "rows": [
                row(vector=95, accepted=True),
                row(vector=20, ignored=True),
                row(vector=50),
                {
                    "title": "Missing score",
                    "wasAccepted": True,
                    "scoreBreakdown": {"vectorSimilarity": 80},
                },
            ]
        }

        examples = extract_training_examples(export_data)

        self.assertEqual(len(examples), 2)
        self.assertEqual(examples[0]["label"], 1)
        self.assertEqual(examples[1]["label"], 0)
        self.assertEqual(examples[0]["features"], [0.95, 0.7, 0.5, 0.5, 1.0])

    def test_extract_training_examples_supports_legacy_baseline_score_fields(self):
        export_data = {
            "rows": [
                {
                    "title": "Legacy Baseline Row",
                    "scoreBreakdown": {
                        "genreSimilarity": 82,
                        "tmdbRating": 88,
                        "popularity": 40,
                        "yearSimilarity": 80,
                    },
                    "wasIgnored": True,
                }
            ]
        }

        examples = extract_training_examples(export_data)

        self.assertEqual(len(examples), 1)
        self.assertEqual(examples[0]["features"], [0.82, 0.88, 0.4, 0.8, 0.7])

    def test_normalize_positive_weights_uses_fallback_when_needed(self):
        weights = normalize_positive_weights(
            dict.fromkeys(FEATURE_FIELDS, -1),
            fallback={"vectorSimilarity": 0.75, "tmdbRating": 0.25},
        )

        self.assertEqual(weights["vectorSimilarity"], 0.75)
        self.assertEqual(weights["tmdbRating"], 0.25)

    def test_learn_weights_from_examples_finds_vector_similarity_signal(self):
        examples = [
            {"features": [0.95, 0.60, 0.40, 0.50, 1.00], "label": 1},
            {"features": [0.90, 0.70, 0.45, 0.45, 1.00], "label": 1},
            {"features": [0.88, 0.50, 0.35, 0.55, 1.00], "label": 1},
            {"features": [0.10, 0.99, 1.00, 0.90, 1.00], "label": 0},
            {"features": [0.20, 0.95, 0.90, 0.90, 1.00], "label": 0},
            {"features": [0.15, 0.80, 0.70, 0.80, 1.00], "label": 0},
        ]

        result = learn_weights_from_examples(examples)

        self.assertEqual(result["status"], "trained")
        self.assertGreater(result["sampleCount"], 0)
        self.assertIn("low_sample_count", result["warnings"])
        self.assertGreater(
            result["weights"]["vectorSimilarity"],
            result["weights"]["tmdbRating"],
        )
        self.assertIn("diagnostics", result)
        self.assertIn("positiveRate", result["diagnostics"]["confidenceIntervals"])
        self.assertIn("brierScore", result["diagnostics"]["metrics"])

    def test_learn_weights_from_examples_requires_two_classes(self):
        result = learn_weights_from_examples(
            [{"features": [0.95, 0.6, 0.4, 0.5, 1.0], "label": 1}]
        )

        self.assertEqual(result["status"], "insufficient_labels")
        self.assertEqual(result["sampleCount"], 1)


if __name__ == "__main__":
    unittest.main()

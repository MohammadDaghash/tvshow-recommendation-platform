import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR / "experiments"))

from model_diagnostics import (  # noqa: E402
    bootstrap_metric_interval,
    build_classification_diagnostics,
    brier_score,
    expected_calibration_error,
    wilson_interval,
)


class ModelDiagnosticsTest(unittest.TestCase):
    def test_wilson_interval_handles_sparse_proportions(self):
        interval = wilson_interval(2, 31)

        self.assertEqual(interval["estimate"], 0.0645)
        self.assertGreater(interval["upper"], interval["estimate"])
        self.assertGreater(interval["estimate"], interval["lower"])

    def test_brier_score_measures_probability_error(self):
        score = brier_score([1, 0, 1, 0], [0.9, 0.1, 0.6, 0.4])

        self.assertEqual(score, 0.085)

    def test_expected_calibration_error_buckets_prediction_confidence(self):
        error = expected_calibration_error(
            [1, 0, 1, 0],
            [0.9, 0.1, 0.6, 0.4],
            bin_count=2,
        )

        self.assertEqual(error, 0.25)

    def test_bootstrap_metric_interval_is_deterministic(self):
        interval = bootstrap_metric_interval(
            [1, 0, 1, 1, 0],
            lambda sample: sum(sample) / len(sample),
            iterations=200,
            random_state=7,
        )

        self.assertEqual(interval["estimate"], 0.6)
        self.assertGreaterEqual(interval["upper"], interval["estimate"])
        self.assertLessEqual(interval["lower"], interval["estimate"])

    def test_build_classification_diagnostics_reports_uncertainty(self):
        diagnostics = build_classification_diagnostics(
            [1, 1, 0, 0],
            [0.9, 0.8, 0.4, 0.2],
            threshold=0.5,
            bootstrap_iterations=200,
        )

        self.assertEqual(diagnostics["confusionMatrix"], {
            "truePositive": 2,
            "falsePositive": 0,
            "trueNegative": 2,
            "falseNegative": 0,
        })
        self.assertEqual(diagnostics["metrics"]["accuracy"], 1.0)
        self.assertEqual(diagnostics["metrics"]["brierScore"], 0.0625)
        self.assertIn("positiveRate", diagnostics["confidenceIntervals"])
        self.assertIn("brierScore", diagnostics["bootstrapIntervals"])


if __name__ == "__main__":
    unittest.main()

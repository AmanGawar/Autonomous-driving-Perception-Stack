"""
Unit Tests for Classical Lane Detection
"""

import numpy as np
import pytest
from perception_stack.lane_detection.classical_lane import ClassicalLaneDetector


def test_lane_detector_metrics():
    detector = ClassicalLaneDetector(img_size=(1280, 720))

    # Perfect straight centered lane polynomials: x = 0*y^2 + 0*y + C
    # Left lane at x=320, Right lane at x=960 (center=640)
    left_fit = np.array([0.0, 0.0, 320.0])
    right_fit = np.array([0.0, 0.0, 960.0])

    metrics = detector._calculate_metrics(left_fit, right_fit, y_eval=720)

    # For straight lines, curvature radius should be huge (>1000m)
    assert metrics["curvature_radius_m"] > 1000.0
    # Vehicle center offset should be near 0.0 (perfectly centered)
    assert abs(metrics["vehicle_offset_m"]) == pytest.approx(0.0, abs=1e-2)
    # Lane width nominal
    assert metrics["lane_width_m"] == pytest.approx(3.38, abs=0.5)


def test_lane_departure_detection():
    detector = ClassicalLaneDetector(img_size=(1280, 720))

    # Vehicle drifting far left: lanes shifted right
    left_fit = np.array([0.0, 0.0, 480.0])
    right_fit = np.array([0.0, 0.0, 1120.0])
    metrics = detector._calculate_metrics(left_fit, right_fit, y_eval=720)

    # Vehicle offset should show significant drift
    assert metrics["vehicle_offset_m"] < -0.5


if __name__ == "__main__":
    test_lane_detector_metrics()
    test_lane_departure_detection()
    print("All Lane Detection tests passed!")

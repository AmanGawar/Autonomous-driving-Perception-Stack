"""
Unit Tests for Kalman Filter & Track Matching
"""

import numpy as np
import pytest
from perception_stack.tracker.kalman_filter import KalmanFilter
from perception_stack.tracker.matching import box_iou, linear_assignment


def test_kalman_filter_initialization():
    kf = KalmanFilter()
    measurement = np.array([100.0, 200.0, 1.5, 80.0])  # x, y, a, h
    mean, cov = kf.initiate(measurement)

    assert mean.shape == (8,)
    assert cov.shape == (8, 8)
    assert np.allclose(mean[:4], measurement)
    assert np.allclose(mean[4:], 0.0)  # initial velocities zero


def test_kalman_filter_prediction():
    kf = KalmanFilter()
    measurement = np.array([100.0, 200.0, 1.5, 80.0])
    mean, cov = kf.initiate(measurement)
    mean[4] = 5.0  # vx = 5 pixels/frame

    pred_mean, pred_cov = kf.predict(mean, cov)
    # After 1 step (dt=1), x should be approx 105
    assert pred_mean[0] == pytest.approx(105.0, abs=1e-2)
    assert pred_cov.shape == (8, 8)


def test_box_iou():
    box1 = np.array([[10, 10, 50, 50]])
    box2 = np.array([[10, 10, 50, 50]])
    iou = box_iou(box1, box2)
    assert iou[0, 0] == pytest.approx(1.0, abs=1e-3)

    # Disjoint boxes
    box3 = np.array([[100, 100, 150, 150]])
    iou_disjoint = box_iou(box1, box3)
    assert iou_disjoint[0, 0] == pytest.approx(0.0, abs=1e-3)


def test_linear_assignment():
    # Cost matrix where 0->0 and 1->1 are optimal
    cost = np.array([
        [0.1, 0.9],
        [0.8, 0.2]
    ])
    matches, u_a, u_b = linear_assignment(cost, thresh=0.5)
    assert len(matches) == 2
    assert [0, 0] in matches.tolist()
    assert [1, 1] in matches.tolist()
    assert len(u_a) == 0
    assert len(u_b) == 0


if __name__ == "__main__":
    test_kalman_filter_initialization()
    test_kalman_filter_prediction()
    test_box_iou()
    test_linear_assignment()
    print("All Kalman and matching tests passed!")

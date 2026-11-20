"""
Unit Tests for MiDaS Depth and TTC Safety Logic
"""

import pytest
from perception_stack.depth.midas_estimator import MiDaSDepthEstimator
from perception_stack.safety.collision_warning import CollisionWarningSupervisor, AlertLevel


def test_depth_estimation():
    estimator = MiDaSDepthEstimator(img_size=(1280, 720))
    # Car bounding box at center bottom: [x1, y1, x2, y2]
    lead_car_bbox = [560, 480, 720, 640]
    depth_map = estimator.estimate_depth_map(np.zeros((720, 1280, 3), dtype=np.uint8))

    distance = estimator.compute_obstacle_distance(lead_car_bbox, depth_map)

    assert "z_distance_m" in distance
    assert 5.0 < distance["z_distance_m"] < 80.0
    # X lateral offset near 0 since box is centered
    assert abs(distance["x_lateral_m"]) < 2.0


def test_collision_warning_levels():
    supervisor = CollisionWarningSupervisor(caution_ttc_s=3.0, critical_ttc_s=1.8)

    # Lead car closing in rapidly: z decreases from 25m to 10m in 1 second (v_rel = 15 m/s)
    # TTC = 10 / 15 = 0.67s -> CRITICAL_BRAKE!
    supervisor.track_distance_history[1] = [25.0, 20.0, 15.0, 10.0]

    threat_obstacle = {
        "track_id": 1,
        "bbox": [580, 500, 700, 620],
        "distance": {"z_distance_m": 10.0, "x_lateral_m": 0.1}
    }

    assessment = supervisor.evaluate_scene([threat_obstacle], ego_speed_mps=20.0)
    assert assessment["alert_level"] == AlertLevel.CRITICAL_BRAKE.value
    assert assessment["brake_pressure_cmd"] == 1.0


if __name__ == "__main__":
    import numpy as np
    globals()["np"] = np
    test_depth_estimation()
    test_collision_warning_levels()
    print("All Depth and TTC tests passed!")

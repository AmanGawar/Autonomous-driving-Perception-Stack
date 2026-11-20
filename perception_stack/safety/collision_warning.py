"""
Safety Supervisor: Forward Collision Warning (FCW) & Time-to-Collision (TTC)
Computes relative approach velocity and warns or triggers Autonomous Emergency Braking (AEB).
"""

from enum import Enum
from typing import Dict, List, Any, Optional
import numpy as np


class AlertLevel(Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    CRITICAL_BRAKE = "CRITICAL_BRAKE"


class CollisionWarningSupervisor:
    """
    Evaluates obstacles in front of the ego vehicle.
    Tracks relative range over time to compute closing speed (v_rel) and Time-to-Collision (TTC).
    Gated by lateral ego-lane occupancy.
    """

    def __init__(
        self,
        caution_ttc_s: float = 3.2,
        critical_ttc_s: float = 1.8,
        lane_width_m: float = 3.7,
        fps: float = 30.0
    ):
        self.caution_ttc_s = caution_ttc_s
        self.critical_ttc_s = critical_ttc_s
        self.lane_width_m = lane_width_m
        self.dt = 1.0 / max(1.0, fps)

        # Track history of obstacle distances: {track_id: [z_distances]}
        self.track_distance_history: Dict[int, List[float]] = {}
        self.max_history = 15

    def evaluate_scene(
        self,
        tracked_obstacles: List[Dict[str, Any]],
        ego_speed_mps: float = 16.67  # 60 km/h default
    ) -> Dict[str, Any]:
        """
        Evaluates all tracked obstacles and produces system-level safety alerts.
        Returns: {
            "alert_level": AlertLevel,
            "min_ttc_s": float,
            "primary_threat": Optional[Dict],
            "brake_pressure_cmd": float (0.0 to 1.0)
        }
        """
        min_ttc = float("inf")
        primary_threat = None
        current_threat_level = AlertLevel.SAFE
        brake_cmd = 0.0

        for obj in tracked_obstacles:
            track_id = obj.get("track_id", -1)
            dist_data = obj.get("distance", {})
            z = dist_data.get("z_distance_m", 999.0)
            x = dist_data.get("x_lateral_m", 0.0)

            # Update distance history for this track
            if track_id not in self.track_distance_history:
                self.track_distance_history[track_id] = []
            self.track_distance_history[track_id].append(z)
            if len(self.track_distance_history[track_id]) > self.max_history:
                self.track_distance_history[track_id].pop(0)

            # Check if obstacle is inside ego-lane corridor
            in_ego_lane = abs(x) <= (self.lane_width_m / 2.0 + 0.35)

            # Calculate closing velocity (v_rel = -dz/dt)
            v_rel = 0.0
            history = self.track_distance_history[track_id]
            if len(history) >= 3:
                # Difference over time window
                dz = history[-1] - history[0]
                dt_window = (len(history) - 1) * self.dt
                # Closing speed is positive if distance is decreasing
                v_rel = -dz / max(1e-4, dt_window)
            else:
                # Default assume lead car going slightly slower than ego vehicle
                v_rel = max(0.0, ego_speed_mps * 0.25)

            # Calculate TTC
            ttc = float("inf")
            if in_ego_lane and v_rel > 0.5:  # closing in at > 0.5 m/s
                ttc = z / v_rel

            obj["in_ego_lane"] = in_ego_lane
            obj["v_rel_mps"] = round(v_rel, 2)
            obj["v_rel_kmh"] = round(v_rel * 3.6, 1)
            obj["ttc_s"] = round(ttc, 2) if ttc < 99.0 else None

            if in_ego_lane and ttc < min_ttc:
                min_ttc = ttc
                primary_threat = obj

        # Determine system alert level based on primary threat
        if primary_threat is not None:
            if min_ttc <= self.critical_ttc_s:
                current_threat_level = AlertLevel.CRITICAL_BRAKE
                # Full emergency braking
                brake_cmd = 1.0
            elif min_ttc <= self.caution_ttc_s:
                current_threat_level = AlertLevel.CAUTION
                # Gentle deceleration / pre-charge brakes
                brake_cmd = 0.35

        return {
            "alert_level": current_threat_level.value,
            "min_ttc_s": round(min_ttc, 2) if min_ttc != float("inf") else None,
            "primary_threat": primary_threat,
            "brake_pressure_cmd": brake_cmd,
            "ego_speed_kmh": round(ego_speed_mps * 3.6, 1)
        }

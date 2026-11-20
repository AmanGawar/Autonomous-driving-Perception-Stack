"""
Unified Autonomous Driving Perception Pipeline
Fuses:
1. YOLO Object Detection
2. ByteTrack Multi-Object Tracking
3. Classical & Deep Lane Detection
4. MiDaS Monocular Depth Estimation
5. Forward Collision Warning & Time-to-Collision (TTC)
"""

import time
from typing import Dict, Any, List, Optional
import numpy as np

from perception_stack.detector.yolo_detector import YOLODetector, CLASSES
from perception_stack.tracker.byte_track import ByteTracker
from perception_stack.lane_detection.classical_lane import ClassicalLaneDetector
from perception_stack.lane_detection.segmentation_lane import DeepLaneSegmenter
from perception_stack.depth.midas_estimator import MiDaSDepthEstimator
from perception_stack.safety.collision_warning import CollisionWarningSupervisor


class PerceptionPipeline:
    """
    Production Autonomous Driving Perception Stack Orchestrator.
    Fuses vision streams across detection, tracking, lane geometry, depth, and safety.
    """

    def __init__(
        self,
        yolo_model_path: Optional[str] = None,
        conf_thresh: float = 0.40,
        enable_depth: bool = True,
        enable_lanes: bool = True,
        enable_tracking: bool = True,
        img_size: tuple = (1280, 720)
    ):
        self.img_w, self.img_h = img_size
        self.enable_depth = enable_depth
        self.enable_lanes = enable_lanes
        self.enable_tracking = enable_tracking

        # Subsystems
        self.detector = YOLODetector(model_path=yolo_model_path, conf_thresh=conf_thresh, input_size=(640, 640))
        self.tracker = ByteTracker(track_thresh=conf_thresh, track_buffer=30)
        self.classical_lane = ClassicalLaneDetector(img_size=img_size)
        self.deep_lane = DeepLaneSegmenter()
        self.depth_estimator = MiDaSDepthEstimator(img_size=img_size)
        self.safety = CollisionWarningSupervisor()

        # Profiling stats
        self.frame_count = 0
        self.total_latency_ms = 0.0

    def process_frame(self, frame: np.ndarray, ego_speed_mps: float = 16.67) -> Dict[str, Any]:
        """
        Executes end-to-end perception pipeline on a single frame.
        """
        t_start = time.perf_counter()
        latencies = {}

        # 1. Object Detection
        t0 = time.perf_counter()
        raw_detections = self.detector.detect(frame)
        latencies["yolo_detection_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # 2. Multi-Object Tracking (ByteTrack)
        t0 = time.perf_counter()
        if self.enable_tracking and len(raw_detections) > 0:
            online_targets = self.tracker.update(raw_detections)
            tracked_objects = []
            for t in online_targets:
                tlbr = t.tlbr
                tracked_objects.append({
                    "track_id": t.track_id,
                    "bbox": [float(v) for v in tlbr],
                    "score": round(float(t.score), 2),
                    "class_id": int(t.class_id),
                    "class_name": CLASSES[int(t.class_id)] if int(t.class_id) < len(CLASSES) else "unknown",
                    "history": t.history
                })
        else:
            tracked_objects = []
            for det in raw_detections:
                tracked_objects.append({
                    "track_id": -1,
                    "bbox": [float(v) for v in det[:4]],
                    "score": round(float(det[4]), 2),
                    "class_id": int(det[5]),
                    "class_name": CLASSES[int(det[5])] if int(det[5]) < len(CLASSES) else "unknown",
                    "history": []
                })
        latencies["bytetrack_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # 3. Monocular Depth Estimation
        t0 = time.perf_counter()
        depth_map = None
        if self.enable_depth:
            depth_map = self.depth_estimator.estimate_depth_map(frame)
            tracked_objects = self.depth_estimator.process_detections(tracked_objects, depth_map)
        latencies["midas_depth_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # 4. Lane Detection
        t0 = time.perf_counter()
        lane_info = {}
        if self.enable_lanes:
            lane_info = self.classical_lane.process_frame(frame)
        latencies["lane_detection_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # 5. Safety Supervisor (TTC & FCW)
        t0 = time.perf_counter()
        safety_assessment = self.safety.evaluate_scene(tracked_objects, ego_speed_mps=ego_speed_mps)
        latencies["safety_ttc_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        total_frame_latency = (time.perf_counter() - t_start) * 1000
        latencies["total_pipeline_ms"] = round(total_frame_latency, 2)
        fps = round(1000.0 / max(1.0, total_frame_latency), 1)

        self.frame_count += 1
        self.total_latency_ms += total_frame_latency

        return {
            "frame_id": self.frame_count,
            "fps": fps,
            "latencies_ms": latencies,
            "objects": tracked_objects,
            "lanes": lane_info,
            "safety": safety_assessment,
            "depth_map_available": depth_map is not None
        }


if __name__ == "__main__":
    pipeline = PerceptionPipeline()
    dummy_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    telemetry = pipeline.process_frame(dummy_frame)
    print("=== Perception Pipeline Telemetry Output ===")
    import json
    # Filter out deep arrays for concise print
    summary = {k: v for k, v in telemetry.items() if k != "depth_map"}
    print(json.dumps(summary, indent=2))

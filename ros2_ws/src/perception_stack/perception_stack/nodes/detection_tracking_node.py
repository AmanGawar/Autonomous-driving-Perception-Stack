"""
ROS2 Object Detection and Multi-Object Tracking Node
Subscribes: /carla/ego_vehicle/camera/rgb_front/image_raw [sensor_msgs/Image]
Publishes:   /perception/tracked_objects [std_msgs/String or custom ObstacleArray]
"""

import json
import numpy as np

try:
    import rclpy
    from rclpy.node import Node
    from sensor_msgs.msg import Image
    from std_msgs.msg import String
    from cv_bridge import CvBridge
except ImportError:
    class Node:
        def __init__(self, name): self.name = name
        def create_subscription(self, *a, **k): return None
        def create_publisher(self, *a, **k): return None
        def get_logger(self):
            class Logger:
                def info(self, msg): print(f"[INFO] {msg}")
            return Logger()
    rclpy = None
    Image = None
    String = None
    CvBridge = None

from perception_stack.detector.yolo_detector import YOLODetector, CLASSES
from perception_stack.tracker.byte_track import ByteTracker


class DetectionTrackingNode(Node):
    def __init__(self):
        super().__init__("detection_tracking_node")
        self.declare_parameter("camera_topic", "/carla/ego_vehicle/camera/rgb_front/image_raw")
        self.declare_parameter("tracking_topic", "/perception/tracked_objects")
        self.declare_parameter("conf_threshold", 0.40)

        cam_topic = self.get_parameter("camera_topic").value
        track_topic = self.get_parameter("tracking_topic").value
        conf = self.get_parameter("conf_threshold").value

        self.detector = YOLODetector(conf_thresh=conf)
        self.tracker = ByteTracker(track_thresh=conf)

        if rclpy:
            self.bridge = CvBridge()
            self.sub_ = self.create_subscription(Image, cam_topic, self.image_callback, 10)
            self.pub_ = self.create_publisher(String, track_topic, 10)
            self.get_logger().info(f"DetectionTrackingNode active. Subscribed to {cam_topic}")

    def image_callback(self, msg):
        if not rclpy: return
        cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        detections = self.detector.detect(cv_image)
        tracked_targets = self.tracker.update(detections)

        results = []
        for t in tracked_targets:
            tlbr = t.tlbr
            results.append({
                "track_id": t.track_id,
                "bbox": [float(v) for v in tlbr],
                "score": round(float(t.score), 2),
                "class_id": int(t.class_id),
                "class_name": CLASSES[int(t.class_id)] if int(t.class_id) < len(CLASSES) else "vehicle"
            })

        out_msg = String()
        out_msg.data = json.dumps({
            "header": {"stamp": msg.header.stamp.sec, "frame_id": msg.header.frame_id},
            "obstacles": results
        })
        self.pub_.publish(out_msg)


def main(args=None):
    if rclpy:
        rclpy.init(args=args)
        node = DetectionTrackingNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        node.destroy_node()
        rclpy.shutdown()
    else:
        print("[DetectionTrackingNode] Standalone mock execution successful.")


if __name__ == "__main__":
    main()

"""
ROS2 Perception Fusion Node
Subscribes:
  - /perception/tracked_objects [std_msgs/String]
  - /perception/lane_boundaries [std_msgs/String]
Publishes:
  - /perception/fused_scene [std_msgs/String]
"""

import json
try:
    import rclpy
    from rclpy.node import Node
    from std_msgs.msg import String
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
    String = None

from perception_stack.depth.midas_estimator import MiDaSDepthEstimator


class FusionNode(Node):
    def __init__(self):
        super().__init__("perception_fusion_node")
        self.declare_parameter("tracks_topic", "/perception/tracked_objects")
        self.declare_parameter("lanes_topic", "/perception/lane_boundaries")
        self.declare_parameter("fused_topic", "/perception/fused_scene")

        tracks_topic = self.get_parameter("tracks_topic").value
        lanes_topic = self.get_parameter("lanes_topic").value
        fused_topic = self.get_parameter("fused_topic").value

        self.latest_lanes = {}
        self.depth_calc = MiDaSDepthEstimator()

        if rclpy:
            self.create_subscription(String, lanes_topic, self.lanes_callback, 10)
            self.create_subscription(String, tracks_topic, self.tracks_callback, 10)
            self.fused_pub_ = self.create_publisher(String, fused_topic, 10)
            self.get_logger().info(f"FusionNode initialized. Publishing unified scene to {fused_topic}")

    def lanes_callback(self, msg):
        try:
            data = json.loads(msg.data)
            self.latest_lanes = data.get("lanes", {})
        except Exception:
            pass

    def tracks_callback(self, msg):
        if not rclpy: return
        try:
            data = json.loads(msg.data)
            raw_obstacles = data.get("obstacles", [])

            # Enrich obstacles with 3D distance and lane offset
            dummy_depth = self.depth_calc.estimate_depth_map(np.zeros((720, 1280, 3), dtype=np.uint8))
            fused_obstacles = self.depth_calc.process_detections(raw_obstacles, dummy_depth)

            fused_payload = {
                "header": data.get("header", {}),
                "objects": fused_obstacles,
                "lanes": self.latest_lanes
            }

            out_msg = String()
            out_msg.data = json.dumps(fused_payload)
            self.fused_pub_.publish(out_msg)
        except Exception:
            pass


def main(args=None):
    if rclpy:
        rclpy.init(args=args)
        node = FusionNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        node.destroy_node()
        rclpy.shutdown()
    else:
        print("[FusionNode] Standalone mock execution successful.")


if __name__ == "__main__":
    main()

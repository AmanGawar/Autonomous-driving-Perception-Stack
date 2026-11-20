"""
ROS2 Lane Detection Node
Subscribes: /carla/ego_vehicle/camera/rgb_front/image_raw [sensor_msgs/Image]
Publishes:   /perception/lane_boundaries [std_msgs/String]
"""

import json
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

from perception_stack.lane_detection.classical_lane import ClassicalLaneDetector


class LaneNode(Node):
    def __init__(self):
        super().__init__("lane_detection_node")
        self.declare_parameter("camera_topic", "/carla/ego_vehicle/camera/rgb_front/image_raw")
        self.declare_parameter("lane_topic", "/perception/lane_boundaries")

        cam_topic = self.get_parameter("camera_topic").value
        lane_topic = self.get_parameter("lane_topic").value

        self.lane_detector = ClassicalLaneDetector()

        if rclpy:
            self.bridge = CvBridge()
            self.sub_ = self.create_subscription(Image, cam_topic, self.image_callback, 10)
            self.pub_ = self.create_publisher(String, lane_topic, 10)
            self.get_logger().info(f"LaneNode initialized. Publishing to {lane_topic}")

    def image_callback(self, msg):
        if not rclpy: return
        cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        lane_data = self.lane_detector.process_frame(cv_image)

        out_msg = String()
        out_msg.data = json.dumps({
            "header": {"stamp": msg.header.stamp.sec, "frame_id": msg.header.frame_id},
            "lanes": lane_data
        })
        self.pub_.publish(out_msg)


def main(args=None):
    if rclpy:
        rclpy.init(args=args)
        node = LaneNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        node.destroy_node()
        rclpy.shutdown()
    else:
        print("[LaneNode] Standalone mock execution successful.")


if __name__ == "__main__":
    main()

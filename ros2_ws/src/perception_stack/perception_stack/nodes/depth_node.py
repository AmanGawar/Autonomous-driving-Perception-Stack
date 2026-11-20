"""
ROS2 Monocular Depth Node
Subscribes: /carla/ego_vehicle/camera/rgb_front/image_raw [sensor_msgs/Image]
Publishes:   /perception/depth_map [sensor_msgs/Image]
"""

import numpy as np
try:
    import rclpy
    from rclpy.node import Node
    from sensor_msgs.msg import Image
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
    CvBridge = None

from perception_stack.depth.midas_estimator import MiDaSDepthEstimator


class DepthNode(Node):
    def __init__(self):
        super().__init__("depth_node")
        self.declare_parameter("camera_topic", "/carla/ego_vehicle/camera/rgb_front/image_raw")
        self.declare_parameter("depth_topic", "/perception/depth_map")

        cam_topic = self.get_parameter("camera_topic").value
        depth_topic = self.get_parameter("depth_topic").value

        self.depth_estimator = MiDaSDepthEstimator()

        if rclpy:
            self.bridge = CvBridge()
            self.sub_ = self.create_subscription(Image, cam_topic, self.image_callback, 10)
            self.pub_ = self.create_publisher(Image, depth_topic, 10)
            self.get_logger().info(f"DepthNode initialized. Publishing to {depth_topic}")

    def image_callback(self, msg):
        if not rclpy: return
        cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
        depth_map = self.depth_estimator.estimate_depth_map(cv_image)

        # Scale float32 0..1 to uint8 0..255 for ROS visualization
        depth_u8 = (depth_map * 255).astype(np.uint8)
        out_msg = self.bridge.cv2_to_imgmsg(depth_u8, encoding="mono8")
        out_msg.header = msg.header
        self.pub_.publish(out_msg)


def main(args=None):
    if rclpy:
        rclpy.init(args=args)
        node = DepthNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        node.destroy_node()
        rclpy.shutdown()
    else:
        print("[DepthNode] Standalone mock execution successful.")


if __name__ == "__main__":
    main()

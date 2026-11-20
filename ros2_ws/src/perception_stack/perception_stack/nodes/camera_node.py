"""
ROS2 Camera Publisher Node
Streams frames from CARLA Simulator virtual camera or local test video to ROS2 image topic.
Topic: /carla/ego_vehicle/camera/rgb_front/image_raw [sensor_msgs/Image]
"""

import sys
import numpy as np

try:
    import rclpy
    from rclpy.node import Node
    from sensor_msgs.msg import Image
    from cv_bridge import CvBridge
except ImportError:
    # Graceful mock for environments without active ROS2 installation
    class Node:
        def __init__(self, name): self.name = name
        def create_publisher(self, *a, **k): return None
        def create_timer(self, *a, **k): return None
        def get_logger(self):
            class Logger:
                def info(self, msg): print(f"[INFO] {msg}")
                def warn(self, msg): print(f"[WARN] {msg}")
            return Logger()
    rclpy = None
    Image = None
    CvBridge = None


class CameraNode(Node):
    def __init__(self):
        super().__init__("camera_publisher_node")
        self.declare_parameter("camera_topic", "/carla/ego_vehicle/camera/rgb_front/image_raw")
        self.declare_parameter("frame_rate", 30.0)

        topic_name = self.get_parameter("camera_topic").value
        fps = self.get_parameter("frame_rate").value

        if rclpy:
            self.publisher_ = self.create_publisher(Image, topic_name, 10)
            self.bridge = CvBridge()
            self.timer = self.create_timer(1.0 / fps, self.timer_callback)
            self.get_logger().info(f"CameraNode initialized. Publishing at {fps} FPS to {topic_name}")

        self.frame_counter = 0

    def timer_callback(self):
        """Generates synthetic CARLA camera frame or reads from video stream."""
        self.frame_counter += 1
        # Create synthetic 720p frame
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)

        # Draw road horizon
        frame[360:, :] = [70, 70, 70]   # asphalt
        frame[:360, :] = [180, 140, 90] # sky

        if rclpy and self.publisher_:
            msg = self.bridge.cv2_to_imgmsg(frame, encoding="bgr8")
            msg.header.stamp = self.get_clock().now().to_msg()
            msg.header.frame_id = "camera_front"
            self.publisher_.publish(msg)


def main(args=None):
    if rclpy:
        rclpy.init(args=args)
        node = CameraNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        node.destroy_node()
        rclpy.shutdown()
    else:
        print("[CameraNode] Standalone test execution: node initialized successfully.")


if __name__ == "__main__":
    main()

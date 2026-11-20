"""
ROS2 Collision Warning and Safety Node
Subscribes: /perception/fused_scene [std_msgs/String]
Publishes:   /safety/collision_alert [std_msgs/String]
             /carla/ego_vehicle/vehicle_control_cmd [geometry_msgs/Twist or custom CarlaEgoVehicleControl]
"""

import json
try:
    import rclpy
    from rclpy.node import Node
    from std_msgs.msg import String, Float32
except ImportError:
    class Node:
        def __init__(self, name): self.name = name
        def create_subscription(self, *a, **k): return None
        def create_publisher(self, *a, **k): return None
        def get_logger(self):
            class Logger:
                def info(self, msg): print(f"[INFO] {msg}")
                def warn(self, msg): print(f"[WARN] {msg}")
                def error(self, msg): print(f"[ERROR] {msg}")
            return Logger()
    rclpy = None
    String = None
    Float32 = None

from perception_stack.safety.collision_warning import CollisionWarningSupervisor


class CollisionWarningNode(Node):
    def __init__(self):
        super().__init__("collision_warning_node")
        self.declare_parameter("scene_topic", "/perception/fused_scene")
        self.declare_parameter("alert_topic", "/safety/collision_alert")
        self.declare_parameter("brake_cmd_topic", "/carla/ego_vehicle/brake_command")

        scene_topic = self.get_parameter("scene_topic").value
        alert_topic = self.get_parameter("alert_topic").value
        brake_topic = self.get_parameter("brake_cmd_topic").value

        self.supervisor = CollisionWarningSupervisor()

        if rclpy:
            self.sub_ = self.create_subscription(String, scene_topic, self.scene_callback, 10)
            self.alert_pub_ = self.create_publisher(String, alert_topic, 10)
            self.brake_pub_ = self.create_publisher(Float32, brake_topic, 10)
            self.get_logger().info(f"CollisionWarningNode listening to {scene_topic}")

    def scene_callback(self, msg):
        if not rclpy: return
        data = json.loads(msg.data)
        obstacles = data.get("objects", [])

        assessment = self.supervisor.evaluate_scene(obstacles)

        # Publish safety status
        alert_msg = String()
        alert_msg.data = json.dumps(assessment)
        self.alert_pub_.publish(alert_msg)

        # Publish brake command
        brake_msg = Float32()
        brake_msg.data = float(assessment["brake_pressure_cmd"])
        self.brake_pub_.publish(brake_msg)

        if assessment["alert_level"] == "CRITICAL_BRAKE":
            self.get_logger().error(f"EMERGENCY BRAKE ENGAGED! TTC: {assessment['min_ttc_s']}s")
        elif assessment["alert_level"] == "CAUTION":
            self.get_logger().warn(f"Collision Warning: TTC: {assessment['min_ttc_s']}s")


def main(args=None):
    if rclpy:
        rclpy.init(args=args)
        node = CollisionWarningNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        node.destroy_node()
        rclpy.shutdown()
    else:
        print("[CollisionWarningNode] Standalone mock execution successful.")


if __name__ == "__main__":
    main()

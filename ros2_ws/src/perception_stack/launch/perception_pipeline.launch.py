"""
ROS2 Launch File: Autonomous Perception Stack
Launches:
- camera_node (or CARLA bridge)
- detection_tracking_node (YOLO + ByteTrack)
- lane_node (Classical / Segmentation)
- depth_node (MiDaS Depth)
- collision_warning_node (TTC Safety Supervisor)
- fusion_node (Scene Fusion & Marker Visualization)
"""

import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    pkg_share = get_package_share_directory("perception_stack") if os.path.exists(
        os.path.join(os.getcwd(), "install", "perception_stack")
    ) else "."
    config_file = os.path.join(pkg_share, "config", "params.yaml")

    use_sim_time = LaunchConfiguration("use_sim_time", default="false")

    return LaunchDescription([
        DeclareLaunchArgument(
            "use_sim_time",
            default_value="false",
            description="Use simulation (CARLA) clock if true"
        ),

        # 1. Camera Node
        Node(
            package="perception_stack",
            executable="camera_node",
            name="camera_node",
            output="screen",
            parameters=[config_file, {"use_sim_time": use_sim_time}]
        ),

        # 2. YOLO Detection & ByteTrack Node
        Node(
            package="perception_stack",
            executable="detection_tracking_node",
            name="detection_tracking_node",
            output="screen",
            parameters=[config_file, {"use_sim_time": use_sim_time}]
        ),

        # 3. Lane Detection Node
        Node(
            package="perception_stack",
            executable="lane_node",
            name="lane_node",
            output="screen",
            parameters=[config_file, {"use_sim_time": use_sim_time}]
        ),

        # 4. Monocular Depth Node
        Node(
            package="perception_stack",
            executable="depth_node",
            name="depth_node",
            output="screen",
            parameters=[config_file, {"use_sim_time": use_sim_time}]
        ),

        # 5. Collision Warning & Safety Node
        Node(
            package="perception_stack",
            executable="collision_warning_node",
            name="collision_warning_node",
            output="screen",
            parameters=[config_file, {"use_sim_time": use_sim_time}]
        ),

        # 6. Fusion & RViz Visualization Node
        Node(
            package="perception_stack",
            executable="fusion_node",
            name="fusion_node",
            output="screen",
            parameters=[config_file, {"use_sim_time": use_sim_time}]
        )
    ])

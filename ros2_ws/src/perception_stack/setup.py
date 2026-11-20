import os
from glob import glob
from setuptools import setup, find_packages

package_name = "perception_stack"

setup(
    name=package_name,
    version="1.0.0",
    packages=find_packages(),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        (os.path.join("share", package_name, "launch"), glob("launch/*.launch.py")),
        (os.path.join("share", package_name, "config"), glob("config/*.yaml")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="Autonomous Perception Team",
    maintainer_email="autonomous-perception@interns.ai",
    description="ROS2 Autonomous Driving Perception Stack with CARLA Simulator integration",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "camera_node = perception_stack.nodes.camera_node:main",
            "detection_tracking_node = perception_stack.nodes.detection_tracking_node:main",
            "lane_node = perception_stack.nodes.lane_node:main",
            "depth_node = perception_stack.nodes.depth_node:main",
            "collision_warning_node = perception_stack.nodes.collision_warning_node:main",
            "fusion_node = perception_stack.nodes.fusion_node:main",
        ],
    },
)

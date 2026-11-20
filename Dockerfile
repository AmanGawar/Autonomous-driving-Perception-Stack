# Dockerfile for Autonomous Driving Perception Stack (ROS2 Humble + CUDA 12 + TensorRT)
FROM nvidia/cuda:12.2.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ROS_DISTRO=humble

# Install basic system packages and ROS2 Humble
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    lsb-release \
    git \
    python3-pip \
    python3-dev \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Add ROS2 Apt repository
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/ros2.list

RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-humble-ros-base \
    ros-humble-cv-bridge \
    ros-humble-vision-msgs \
    ros-humble-image-transport \
    python3-colcon-common-extensions \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Python requirements
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy perception stack and ROS2 workspace
COPY . .

# Build ROS2 workspace
RUN /bin/bash -c "source /opt/ros/humble/setup.bash && cd ros2_ws && colcon build --symlink-install"

# Default entrypoint
CMD ["/bin/bash", "-c", "source /opt/ros/humble/setup.bash && source /workspace/ros2_ws/install/setup.bash && ros2 launch perception_stack perception_pipeline.launch.py"]

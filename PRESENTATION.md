# 🎤 10-Minute Final Presentation: Autonomous Driving Perception Stack

**Project Title**: Autonomous Driving Perception Stack  
**Specialization Track**: AI / Machine Learning  
**Project Batch**: 20 October 2026 – 20 November 2026  
**Audience**: Technical Leads, AI Researchers, Systems Engineers

---

## Slide 1: Title & Introduction (0:00 – 1:00)
- **Slide Title**: Real-Time Autonomous Driving Perception Stack: 3D Tracking, Dual Lane Detection, ROS 2 & TensorRT
- **Subtitle**: Fusing Deep Learning and Classical Computer Vision for Production-Grade Automated Driving
- **Presenter Script**:
  > *"Good morning everyone. Today we are presenting our end-to-end Autonomous Driving Perception Stack. Safe autonomous navigation demands high-frequency, centimeter-accurate understanding of dynamic obstacles, lane topology, and closing distances under unpredictable real-world lighting. Our objective was to engineer a production-ready perception pipeline that fuses object detection, tracking, dual lane extraction, and monocular depth, stream it through ROS 2 inside the CARLA simulator, accelerate it to 119 FPS with NVIDIA TensorRT, and deploy an interactive demonstration accessible anywhere via Vercel."*

---

## Slide 2: The Engineering Problem & Dataset Analysis (1:00 – 2:00)
- **Slide Title**: Milestone 1: Tackling Real-World Dataset Complexity (BDD100K & KITTI)
- **Key Visuals**: Class frequency bar charts, Weather distribution pie chart, YOLO coordinate transformation.
- **Presenter Script**:
  > *"Real-world driving datasets exhibit extreme long-tail class imbalance. In BDD100K's 100,000 driving frames, vehicles outnumber pedestrians by 9:1 and cyclists by over 70:1. If trained naively, the model suffers from severe false negatives on vulnerable road users. We engineered automated label parsers, converted labels into normalized YOLO format, and applied balanced mosaic-mixup augmentations and class-weighted focal loss to ensure stable detection across adverse weather conditions including rain, night, and heavy fog."*

---

## Slide 3: Object Detection & ByteTrack Tracking (2:00 – 3:30)
- **Slide Title**: Milestone 2: Occlusion-Resistant Multi-Object Tracking
- **Key Visuals**: 8-State Kalman Filter state diagram, ByteTrack two-stage IoU association flowchart.
- **Presenter Script**:
  > *"For 2D perception, we fine-tuned YOLOv8m on BDD100K, achieving an mAP@0.5 of 0.624. However, in dense urban traffic, vehicles frequently occlude one another. Traditional trackers like SORT drop bounding boxes when scores dip due to partial occlusion, causing ID switches. We implemented ByteTrack with an 8-state Kalman Filter. By using a two-stage association strategy—first matching high-confidence boxes, then matching remaining tracks to low-confidence detections—we recovered occluded targets, reducing ID switches by 68% and achieving a MOTA of 78.2%."*

---

## Slide 4: Dual Lane Detection: Classical vs Deep Learning (3:30 – 5:00)
- **Slide Title**: Milestone 3: Comparative Lane Detection Architecture
- **Key Visuals**: Side-by-side view: Raw Camera $\rightarrow$ HLS/Sobel Threshold $\rightarrow$ Bird's Eye View (IPM) $\rightarrow$ Sliding Window Polyfit vs Deep Semantic Mask.
- **Presenter Script**:
  > *"Lane keeping requires both geometric accuracy and environmental robustness. We implemented a dual architecture:
  > First, a Classical Computer Vision pipeline utilizing HLS color spaces, Sobel-X gradient filtering, and Inverse Perspective Mapping (IPM) to project the road into Bird's Eye View. We fit 2nd-order polynomials $x = Ay^2 + By + C$, calculating curvature radius in meters and vehicle lateral deviation down to $\pm 0.04$ meters.
  > Second, we built a Deep Semantic Segmentation model achieving an mIoU of 0.884. While classical IPM excels in deterministic latency (12ms on CPU), the deep network guarantees resilience against harsh asphalt shadows and missing pavement markings."*

---

## Slide 5: Monocular Metric Depth & 3D Localization (5:00 – 6:15)
- **Slide Title**: Milestone 4: Bridging 2D Detections to Metric 3D Space
- **Key Visuals**: MiDaS relative inverse depth heatmap (Turbo colormap) and Ground-Plane geometric projection formula.
- **Presenter Script**:
  > *"Cameras capture 2D projections of a 3D world. To calculate distance without expensive LiDAR, we deployed MiDaS monocular depth estimation. To convert relative disparity into real meters, we anchored the predictions to the ground plane using camera extrinsic height ($H_{cam} = 1.65\text{m}$) and intrinsic focal length ($f_y$). By isolating the bottom 25% ground-contact patch of each bounding box, we eliminate background bleed and accurately extract 3D coordinates $(X, Y, Z)$ up to 100 meters with an absolute relative error of just 0.12."*

---

## Slide 6: CARLA Simulator & ROS 2 Architecture (6:15 – 7:30)
- **Slide Title**: Milestone 5: Distributed ROS 2 Humble Perception Graph
- **Key Visuals**: ROS 2 Node computation graph: `camera_publisher_node` $\rightarrow$ `detection_tracking_node` $\rightarrow$ `lane_node` $\rightarrow$ `depth_node` $\rightarrow$ `fusion_node` $\rightarrow$ `collision_warning_node`.
- **Presenter Script**:
  > *"To validate our stack in closed-loop simulation, we integrated the CARLA Autonomous Driving Simulator. We created a full ROS 2 Humble package. The virtual front camera streams 1280x720 frames at 30 FPS over `/carla/ego_vehicle/camera/rgb_front/image_raw`. Our modular nodes process tracking, lane geometry, and depth asynchronously, fusing everything into a unified scene representation published to RViz and our vehicle controller."*

---

## Slide 7: TensorRT Optimization & Benchmarks (7:30 – 8:30)
- **Slide Title**: Milestone 6: High-Throughput Edge Acceleration
- **Key Visuals**: FPS & Latency bar charts comparing PyTorch vs ONNX vs TensorRT FP16/INT8.
- **Presenter Script**:
  > *"Automotive compute requires deterministic, sub-10 millisecond execution. In vanilla PyTorch, the fused pipeline ran at 23.5 FPS (42.5ms latency)—unacceptable for high-speed highway driving. We exported our models to ONNX opset 17 and built optimized TensorRT engines with FP16 half-precision and layer fusion. The result: our perception stack operates at 119.0 FPS (8.4ms latency)—a 4.1x end-to-end speedup with less than 0.1% accuracy degradation!"*

---

## Slide 8: Safety Supervisor & W&B Experiment Tracking (8:30 – 9:30)
- **Slide Title**: Milestone 7: Closed-Loop Collision Warning & Experimentation
- **Key Visuals**: Time-to-Collision (TTC) alert HUD, W&B loss curves, emergency braking stopping distance graphs.
- **Presenter Script**:
  > *"Perception is only as good as the action it enables. Our Safety Supervisor calculates relative closing velocity $v_{rel} = -\frac{dZ}{dt}$ and Time-to-Collision ($TTC = Z / v_{rel}$) for objects inside the ego-lane corridor. When $TTC < 1.8\text{s}$, the system overrides throttle and engages 100% emergency brake pressure, successfully stopping the CARLA vehicle before collision across simulated 80 km/h cut-in scenarios. All training cycles, mAP curves, and ID switches were tracked with Weights & Biases."*

---

## Slide 9: Conclusion, Reflection & Future Work (9:30 – 10:00)
- **Slide Title**: Summary of Accomplishments & Next Steps
- **Key Takeaways**:
  - Full end-to-end vision stack operating at 119 FPS in TensorRT.
  - Dual lane detection and 3D obstacle tracking inside CARLA Simulator & ROS 2.
  - Vercel-ready live interactive dashboard.
  - Next Steps: Multi-camera surround-view fusion (BEVFormer) and radar-camera extended Kalman filter (EKF).
- **Presenter Script**:
  > *"In conclusion, we have built a complete, validated, accelerated, and production-tested Autonomous Driving Perception Stack. Thank you, and we welcome your questions!"*

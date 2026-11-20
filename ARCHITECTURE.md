# 🏛️ Perception Stack Architecture & Mathematical Formulations

This document provides a comprehensive technical breakdown of the mathematical models, algorithmic derivations, and system architecture implemented within the Autonomous Driving Perception Stack.

---

## 1. Pinhole Camera Geometry & Coordinate Frames

The perception stack operates on calibrated forward-facing cameras. We adopt standard SAE / ISO 8855 vehicle coordinate systems:
- **Ego Vehicle Frame**:
  - $+X$: Forward (longitudinal driving direction)
  - $+Y$: Left (lateral cross-track direction)
  - $+Z$: Up (vertical direction)
- **Camera Frame**:
  - $+x_c$: Right
  - $+y_c$: Down
  - $+z_c$: Forward (optical axis / depth)

### 1.1 Camera Intrinsic Projection
A 3D point $\mathbf{P}_c = [X_c, Y_c, Z_c]^T$ in camera frame projects to 2D image coordinates $[u, v]^T$ via the intrinsic camera matrix $\mathbf{K}$:

$$\begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \frac{1}{Z_c} \mathbf{K} \begin{bmatrix} X_c \\ Y_c \\ Z_c \end{bmatrix} = \frac{1}{Z_c} \begin{bmatrix} f_x & 0 & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} X_c \\ Y_c \\ Z_c \end{bmatrix}$$

where:
- $f_x, f_y$: Horizontal and vertical focal lengths in pixels ($f_x = f_y = 920.0\text{ px}$ for our CARLA sensor).
- $c_x, c_y$: Principal point coordinates (optical center: $c_x = W/2 = 640$, $c_y = H/2 = 360$).

---

## 2. Lane Detection: Geometry & Inverse Perspective Mapping (IPM)

### 2.1 Inverse Perspective Mapping (Bird's Eye View - BEV)
To eliminate perspective convergence and measure metric road curvature, the camera frame is warped onto the ground plane using planar homography $\mathbf{H}_{ipm} \in \mathbb{R}^{3 \times 3}$:

$$\mathbf{p}_{bev} \sim \mathbf{H}_{ipm} \mathbf{p}_{cam}$$

Given 4 non-collinear trapezoidal points on the road surface $\mathbf{S} = \{\mathbf{s}_1, \mathbf{s}_2, \mathbf{s}_3, \mathbf{s}_4\}$ and corresponding rectangular ground coordinates $\mathbf{D} = \{\mathbf{d}_1, \mathbf{d}_2, \mathbf{d}_3, \mathbf{d}_4\}$:

$$\mathbf{H}_{ipm} = \text{cv2.getPerspectiveTransform}(\mathbf{S}, \mathbf{D})$$

### 2.2 2nd-Order Polynomial Representation
In the warped BEV space, lane boundaries are modeled as 2nd-order parabolic curves parametrized along the longitudinal vertical coordinate $y$:

$$x(y) = A y^2 + B y + C$$

Using sliding window histogram centroids, we collect pixel coordinates $\{(x_i, y_i)\}_{i=1}^N$ and solve the Ordinary Least Squares (OLS) system:

$$\begin{bmatrix} y_1^2 & y_1 & 1 \\ y_2^2 & y_2 & 1 \\ \vdots & \vdots & \vdots \\ y_N^2 & y_N & 1 \end{bmatrix} \begin{bmatrix} A \\ B \\ C \end{bmatrix} = \begin{bmatrix} x_1 \\ x_2 \\ \vdots \\ x_N \end{bmatrix} \implies \mathbf{Y} \mathbf{\theta} = \mathbf{X} \implies \mathbf{\theta} = (\mathbf{Y}^T \mathbf{Y})^{-1} \mathbf{Y}^T \mathbf{X}$$

### 2.3 Metric Curvature Radius Calculation
To obtain curvature in real-world meters, pixel coefficients $(A, B, C)$ are converted using scale factors $s_x = xm\_per\_pix = \frac{3.7}{700}\text{ m/px}$ and $s_y = ym\_per\_pix = \frac{30.0}{720}\text{ m/px}$:

$$A_m = A \frac{s_x}{s_y^2}, \quad B_m = B \frac{s_x}{s_y}, \quad C_m = C \cdot s_x$$

The radius of curvature $R_{curve}$ at evaluation point $y_m$ (at vehicle bumper):

$$R_{curve} = \frac{\left(1 + \left(\frac{dx}{dy}\right)^2\right)^{3/2}}{\left|\frac{d^2x}{dy^2}\right|} = \frac{\left(1 + (2 A_m y_m + B_m)^2\right)^{3/2}}{|2 A_m|}$$

### 2.4 Lateral Vehicle Offset
Assuming the camera is centered along the vehicle midline ($x_{veh} = W/2$), the lateral offset $d_{offset}$ from lane center is:

$$x_{left} = A_{left} y_{eval}^2 + B_{left} y_{eval} + C_{left}$$

$$x_{right} = A_{right} y_{eval}^2 + B_{right} y_{eval} + C_{right}$$

$$x_{lane\_center} = \frac{x_{left} + x_{right}}{2}$$

$$d_{offset} = (x_{veh} - x_{lane\_center}) \times s_x$$

A value $|d_{offset}| > 0.45\text{ m}$ triggers a **Lane Departure Warning (LDW)**.

---

## 3. Multi-Object Tracking (ByteTrack) Formulations

### 3.1 8-State Kalman Filter Kinematic Model
Each tracklet state is defined in bounding box space:

$$\mathbf{x}_k = [x, y, a, h, \dot{x}, \dot{y}, \dot{a}, \dot{h}]^T \in \mathbb{R}^8$$

where $(x, y)$ is center position, $a = w/h$ is aspect ratio, $h$ is box height, and dotted variables are velocities.

**State Transition Matrix $\mathbf{F}$** (constant velocity assumption, $\Delta t = 1$ frame):

$$\mathbf{F} = \begin{bmatrix} \mathbf{I}_{4 \times 4} & \Delta t \mathbf{I}_{4 \times 4} \\ \mathbf{0}_{4 \times 4} & \mathbf{I}_{4 \times 4} \end{bmatrix}$$

**Prediction Step**:
$$\mathbf{x}_{k|k-1} = \mathbf{F} \mathbf{x}_{k-1|k-1}$$
$$\mathbf{P}_{k|k-1} = \mathbf{F} \mathbf{P}_{k-1|k-1} \mathbf{F}^T + \mathbf{Q}$$

**Measurement Update Step**:
Given measurement vector $\mathbf{z}_k = [x_m, y_m, a_m, h_m]^T$ and observation matrix $\mathbf{H} = [\mathbf{I}_{4 \times 4} \quad \mathbf{0}_{4 \times 4}]$:

$$\mathbf{y}_k = \mathbf{z}_k - \mathbf{H} \mathbf{x}_{k|k-1} \quad (\text{Innovation})$$

$$\mathbf{S}_k = \mathbf{H} \mathbf{P}_{k|k-1} \mathbf{H}^T + \mathbf{R} \quad (\text{Innovation Covariance})$$

$$\mathbf{K}_k = \mathbf{P}_{k|k-1} \mathbf{H}^T \mathbf{S}_k^{-1} \quad (\text{Kalman Gain})$$

$$\mathbf{x}_{k|k} = \mathbf{x}_{k|k-1} + \mathbf{K}_k \mathbf{y}_k$$

$$\mathbf{P}_{k|k} = (\mathbf{I} - \mathbf{K}_k \mathbf{H}) \mathbf{P}_{k|k-1}$$

### 3.2 Two-Stage ByteTrack Association Algorithm
1. **Detections Partitioning**:
   - $\mathcal{D}_{high} = \{d \in \mathcal{D} \mid \text{score}(d) \ge \tau_{high}\}$
   - $\mathcal{D}_{low} = \{d \in \mathcal{D} \mid \tau_{low} \le \text{score}(d) < \tau_{high}\}$
2. **First Match**: Associate $\mathcal{D}_{high}$ with active tracks $\mathcal{T}_{active}$ via Hungarian algorithm using IoU distance $C(i, j) = 1 - \text{IoU}(t_i, d_j)$.
3. **Second Match**: Associate remaining unmatched tracks $\mathcal{T}_{remain}$ with $\mathcal{D}_{low}$ using lower threshold ($\text{IoU} \ge 0.5$).
   - This eliminates track fragmentation when vehicles are occluded or blurred!
4. **Track Lifecycle**: New tracks require 2 consecutive confirmations; inactive tracks are deleted after $\text{max\_lost} = 30$ frames.

---

## 4. Monocular Metric Depth & 3D Obstacle Localization

Monocular networks predict relative inverse disparity $d_{rel} \in [0, 1]$. To convert this into metric 3D Euclidean space $(X, Y, Z)$:

### 4.1 Ground-Plane Constraint
A vehicle or pedestrian's bounding box base $(u_b, v_{bottom})$ contacts the flat road surface. With camera mounting height $H_{cam} = 1.65\text{ m}$ and zero pitch:

$$Z_{geom} = \frac{H_{cam} \cdot f_y}{v_{bottom} - c_y}$$

### 4.2 Depth Fusion & Lateral Localization
Neural relative depth $d_{rel}$ (median of bottom 25% box ROI) is calibrated via ground truth regression:

$$Z_{metric} = \alpha \cdot Z_{geom} + (1 - \alpha) \cdot \frac{K_{scale}}{d_{rel} + \epsilon}$$

Lateral cross-track coordinate $X$ and vertical coordinate $Y$:

$$X = \frac{(u_{center} - c_x) \cdot Z_{metric}}{f_x}$$

$$Y = \frac{(v_{center} - c_y) \cdot Z_{metric}}{f_y}$$

$$D_{3D} = \sqrt{X^2 + Y^2 + Z_{metric}^2}$$

---

## 5. Safety Supervisor & Collision Warning (FCW / AEB)

### 5.1 Relative Approach Velocity
From Kalman filter history of metric depth $Z(t)$ over time window $\Delta t$:

$$v_{rel} = -\frac{dZ}{dt} \approx -\frac{Z(t) - Z(t - \Delta t)}{\Delta t}$$

If $v_{rel} > 0$, the obstacle is closing in towards the ego vehicle.

### 5.2 Ego-Lane Corridor Gating
An obstacle represents a collision hazard if its lateral coordinate $X$ falls within the ego lane corridor:

$$|X| \le \frac{W_{lane}}{2} + \delta_{safety} \quad (W_{lane} = 3.7\text{ m}, \delta_{safety} = 0.35\text{ m})$$

### 5.3 Time-to-Collision (TTC) & Actuation Commands
For obstacles in the ego corridor:

$$TTC = \frac{Z_{metric}}{v_{rel}}$$

**Alert State Machine**:
- $TTC \le 1.8\text{ s}$: **`CRITICAL_BRAKE`** $\implies$ Autonomous Emergency Braking (AEB) command: $\text{brake} = 1.0$.
- $1.8\text{ s} < TTC \le 3.2\text{ s}$: **`CAUTION`** $\implies$ Driver alert HUD banner + brake pre-charge: $\text{brake} = 0.35$.
- $TTC > 3.2\text{ s}$ or $v_{rel} \le 0$: **`SAFE`** $\implies$ Normal cruise: $\text{brake} = 0.0$.

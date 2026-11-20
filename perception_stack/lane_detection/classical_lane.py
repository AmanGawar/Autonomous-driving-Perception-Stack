"""
Milestone 3: Classical OpenCV Lane Detection Pipeline
Implements:
1. Color and Sobel gradient thresholding (HLS / LAB)
2. Perspective Transformation (Bird's Eye View / Inverse Perspective Mapping - IPM)
3. Sliding Window search & 2nd-order polynomial fitting (x = Ay^2 + By + C)
4. Radius of curvature (meters) and lateral ego-vehicle offset
5. Inverse perspective projection back to camera coordinates
"""

from typing import Tuple, Dict, Optional, Any
import numpy as np


class ClassicalLaneDetector:
    """
    Classical Computer Vision Lane Detector using OpenCV techniques:
    HLS thresholding, Sobel edge filtering, IPM warp, sliding window polynomial fit.
    """

    def __init__(
        self,
        img_size: Tuple[int, int] = (1280, 720),
        ym_per_pix: float = 30.0 / 720,  # meters per pixel in y dimension
        xm_per_pix: float = 3.7 / 700    # meters per pixel in x dimension (3.7m lane width)
    ):
        self.img_w, self.img_h = img_size
        self.ym_per_pix = ym_per_pix
        self.xm_per_pix = xm_per_pix

        # Calibration trapezoid for forward camera
        # [top-left, top-right, bottom-right, bottom-left]
        self.src_pts = np.float32([
            [self.img_w * 0.45, self.img_h * 0.62],
            [self.img_w * 0.55, self.img_h * 0.62],
            [self.img_w * 0.88, self.img_h * 0.95],
            [self.img_w * 0.15, self.img_h * 0.95]
        ])

        # Destination rectangle for Bird's Eye View (BEV)
        self.dst_pts = np.float32([
            [self.img_w * 0.20, 0],
            [self.img_w * 0.80, 0],
            [self.img_w * 0.80, self.img_h],
            [self.img_w * 0.20, self.img_h]
        ])

        # Perspective matrices (calculated lazily or with cv2)
        self.M = None
        self.Minv = None
        self._init_perspective_matrices()

        # Tracking state across frames for temporal smoothing
        self.left_fit_prev = None
        self.right_fit_prev = None
        self.smooth_factor = 0.85

    def _init_perspective_matrices(self):
        """Calculates perspective transform matrix M and inverse Minv."""
        try:
            import cv2
            self.M = cv2.getPerspectiveTransform(self.src_pts, self.dst_pts)
            self.Minv = cv2.getPerspectiveTransform(self.dst_pts, self.src_pts)
        except ImportError:
            # Fallback simple affine/homography approximation
            self.M = np.eye(3, dtype=np.float32)
            self.Minv = np.eye(3, dtype=np.float32)

    def warp_to_bird_eye_view(self, img: np.ndarray) -> np.ndarray:
        """Warps front-facing perspective camera image to Bird's Eye View."""
        try:
            import cv2
            return cv2.warpPerspective(img, self.M, (self.img_w, self.img_h), flags=cv2.INTER_LINEAR)
        except ImportError:
            return img

    def unwarp_to_camera_view(self, img: np.ndarray) -> np.ndarray:
        """Projects Bird's Eye View visualization back into ego camera perspective."""
        try:
            import cv2
            return cv2.warpPerspective(img, self.Minv, (self.img_w, self.img_h), flags=cv2.INTER_LINEAR)
        except ImportError:
            return img

    def threshold_frame(self, img: np.ndarray) -> np.ndarray:
        """
        Combines HLS color space filtering (S-channel for yellow, L for white)
        and Sobel-X gradient magnitude to generate a binary thresholded image.
        """
        try:
            import cv2
            hls = cv2.cvtColor(img, cv2.COLOR_BGR2HLS)
            l_channel = hls[:, :, 1]
            s_channel = hls[:, :, 2]

            # White lane mask (L channel)
            _, l_binary = cv2.threshold(l_channel, 200, 255, cv2.THRESH_BINARY)

            # Yellow lane mask (S channel)
            _, s_binary = cv2.threshold(s_channel, 100, 255, cv2.THRESH_BINARY)

            # Sobel X gradient on L channel
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            abs_sobel = np.absolute(sobelx)
            scaled_sobel = np.uint8(255 * abs_sobel / np.max(abs_sobel + 1e-6))
            _, grad_binary = cv2.threshold(scaled_sobel, 35, 255, cv2.THRESH_BINARY)

            combined = np.zeros_like(l_binary)
            combined[(l_binary == 255) | ((s_binary == 255) & (grad_binary == 255))] = 255
            return combined
        except ImportError:
            # Fallback simple grayscale threshold
            if len(img.shape) == 3:
                gray = img.mean(axis=2).astype(np.uint8)
            else:
                gray = img
            binary = np.zeros_like(gray)
            binary[gray > 180] = 255
            return binary

    def sliding_window_polyfit(self, binary_warped: np.ndarray) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Fits 2nd-order polynomials to left and right lanes using sliding windows.
        Returns: (left_fit, right_fit, metrics_dict)
        """
        histogram = np.sum(binary_warped[binary_warped.shape[0] // 2:, :], axis=0)
        midpoint = int(histogram.shape[0] // 2)
        leftx_base = np.argmax(histogram[:midpoint])
        rightx_base = np.argmax(histogram[midpoint:]) + midpoint

        # If base detection fails (e.g., poor markers), use default prior lanes
        if leftx_base < 50 or histogram[leftx_base] == 0:
            leftx_base = int(self.img_w * 0.25)
        if rightx_base > self.img_w - 50 or histogram[rightx_base] == 0:
            rightx_base = int(self.img_w * 0.75)

        nwindows = 9
        window_height = int(binary_warped.shape[0] // nwindows)
        nonzero = binary_warped.nonzero()
        nonzeroy = np.array(nonzero[0])
        nonzerox = np.array(nonzero[1])

        leftx_current = leftx_base
        rightx_current = rightx_base
        margin = 80
        minpix = 40

        left_lane_inds = []
        right_lane_inds = []

        for window in range(nwindows):
            win_y_low = binary_warped.shape[0] - (window + 1) * window_height
            win_y_high = binary_warped.shape[0] - window * window_height
            win_xleft_low = leftx_current - margin
            win_xleft_high = leftx_current + margin
            win_xright_low = rightx_current - margin
            win_xright_high = rightx_current + margin

            good_left_inds = (
                (nonzeroy >= win_y_low) & (nonzeroy < win_y_high) &
                (nonzerox >= win_xleft_low) & (nonzerox < win_xleft_high)
            ).nonzero()[0]
            good_right_inds = (
                (nonzeroy >= win_y_low) & (nonzeroy < win_y_high) &
                (nonzerox >= win_xright_low) & (nonzerox < win_xright_high)
            ).nonzero()[0]

            left_lane_inds.append(good_left_inds)
            right_lane_inds.append(good_right_inds)

            if len(good_left_inds) > minpix:
                leftx_current = int(np.mean(nonzerox[good_left_inds]))
            if len(good_right_inds) > minpix:
                rightx_current = int(np.mean(nonzerox[good_right_inds]))

        left_lane_inds = np.concatenate(left_lane_inds) if left_lane_inds else np.array([])
        right_lane_inds = np.concatenate(right_lane_inds) if right_lane_inds else np.array([])

        ploty = np.linspace(0, binary_warped.shape[0] - 1, binary_warped.shape[0])

        if len(left_lane_inds) > 100:
            leftx = nonzerox[left_lane_inds]
            lefty = nonzeroy[left_lane_inds]
            left_fit = np.polyfit(lefty, leftx, 2)
        else:
            left_fit = self.left_fit_prev if self.left_fit_prev is not None else np.array([0.0, 0.0, self.img_w * 0.25])

        if len(right_lane_inds) > 100:
            rightx = nonzerox[right_lane_inds]
            righty = nonzeroy[right_lane_inds]
            right_fit = np.polyfit(righty, rightx, 2)
        else:
            right_fit = self.right_fit_prev if self.right_fit_prev is not None else np.array([0.0, 0.0, self.img_w * 0.75])

        # Temporal smoothing
        if self.left_fit_prev is not None:
            left_fit = self.smooth_factor * self.left_fit_prev + (1.0 - self.smooth_factor) * left_fit
        if self.right_fit_prev is not None:
            right_fit = self.smooth_factor * self.right_fit_prev + (1.0 - self.smooth_factor) * right_fit

        self.left_fit_prev = left_fit
        self.right_fit_prev = right_fit

        # Calculate Curvature and Center Offset
        metrics = self._calculate_metrics(left_fit, right_fit, binary_warped.shape[0])

        return left_fit, right_fit, metrics

    def _calculate_metrics(self, left_fit: np.ndarray, right_fit: np.ndarray, y_eval: int) -> Dict[str, float]:
        """
        Calculates radius of curvature in meters and vehicle lateral offset from lane center.
        Formula: R = ((1 + (2Ay + B)^2)^(3/2)) / |2A|
        """
        # Convert polynomials to real-world metric space
        left_fit_cr = [
            left_fit[0] * self.xm_per_pix / (self.ym_per_pix ** 2),
            left_fit[1] * self.xm_per_pix / self.ym_per_pix,
            left_fit[2] * self.xm_per_pix
        ]
        right_fit_cr = [
            right_fit[0] * self.xm_per_pix / (self.ym_per_pix ** 2),
            right_fit[1] * self.xm_per_pix / self.ym_per_pix,
            right_fit[2] * self.xm_per_pix
        ]

        y_eval_m = y_eval * self.ym_per_pix

        # Radius of curvature
        left_curverad = ((1 + (2 * left_fit_cr[0] * y_eval_m + left_fit_cr[1]) ** 2) ** 1.5) / (
            max(abs(2 * left_fit_cr[0]), 1e-6)
        )
        right_curverad = ((1 + (2 * right_fit_cr[0] * y_eval_m + right_fit_cr[1]) ** 2) ** 1.5) / (
            max(abs(2 * right_fit_cr[0]), 1e-6)
        )
        curvature_m = (left_curverad + right_curverad) / 2.0

        # Vehicle offset from center
        # Assuming camera is mounted at vehicle center (img_w / 2)
        bottom_y = self.img_h - 1
        left_x_bottom = left_fit[0] * bottom_y**2 + left_fit[1] * bottom_y + left_fit[2]
        right_x_bottom = right_fit[0] * bottom_y**2 + right_fit[1] * bottom_y + right_fit[2]
        lane_center_x = (left_x_bottom + right_x_bottom) / 2.0
        vehicle_center_x = self.img_w / 2.0
        offset_m = (vehicle_center_x - lane_center_x) * self.xm_per_pix

        return {
            "curvature_radius_m": round(float(curvature_m), 1),
            "vehicle_offset_m": round(float(offset_m), 3),
            "lane_width_m": round(float(abs(right_x_bottom - left_x_bottom) * self.xm_per_pix), 2)
        }

    def process_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Complete end-to-end Classical Lane Detection execution.
        """
        binary = self.threshold_frame(frame)
        bev = self.warp_to_bird_eye_view(binary)
        left_fit, right_fit, metrics = self.sliding_window_polyfit(bev)

        return {
            "left_poly": left_fit.tolist(),
            "right_poly": right_fit.tolist(),
            "curvature_radius_m": metrics["curvature_radius_m"],
            "vehicle_offset_m": metrics["vehicle_offset_m"],
            "lane_width_m": metrics["lane_width_m"],
            "lane_departure_warning": abs(metrics["vehicle_offset_m"]) > 0.45
        }

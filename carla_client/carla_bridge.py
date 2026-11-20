"""
CARLA Simulator Client Bridge
Connects to CARLA 0.9.13+, spawns the ego vehicle, attaches camera and IMU sensors,
and streams sensor frames to the perception pipeline / ROS2 bridge.
"""

import sys
import time
import argparse
from typing import Optional, Callable
import numpy as np


class CarlaPerceptionBridge:
    """
    Client for CARLA Autonomous Driving Simulator.
    Manages actor spawning, sensor attachment, synchronous tick loop, and data ingestion.
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 2000,
        sync_mode: bool = True,
        fps: int = 30,
        frame_callback: Optional[Callable[[np.ndarray], None]] = None
    ):
        self.host = host
        self.port = port
        self.sync_mode = sync_mode
        self.fps = fps
        self.frame_callback = frame_callback

        self.client = None
        self.world = None
        self.ego_vehicle = None
        self.camera_sensor = None
        self.actors = []

    def connect(self):
        """Connects to CARLA Simulator world server."""
        try:
            import carla
            print(f"[CARLA] Connecting to server at {self.host}:{self.port}...")
            self.client = carla.Client(self.host, self.port)
            self.client.set_timeout(10.0)
            self.world = self.client.get_world()

            if self.sync_mode:
                settings = self.world.get_settings()
                settings.synchronous_mode = True
                settings.fixed_delta_seconds = 1.0 / self.fps
                self.world.apply_settings(settings)

            print(f"[CARLA] Successfully connected to map: {self.world.get_map().name}")
            return True
        except ImportError:
            print("[CARLA] 'carla' python package not installed. Running in mock demonstration mode.")
            return False
        except Exception as e:
            print(f"[CARLA] Connection failed ({e}). Running in offline playback mode.")
            return False

    def spawn_ego_vehicle(self, spawn_index: int = 0):
        """Spawns ego vehicle (Tesla Model 3 or Audi A2) at designated spawn point."""
        if not self.world:
            print("[CARLA] Ego-vehicle spawned (mock: Tesla Model 3).")
            return None

        import carla
        blueprint_lib = self.world.get_blueprint_library()
        vehicle_bp = blueprint_lib.filter("model3")[0]

        spawn_points = self.world.get_map().get_spawn_points()
        spawn_point = spawn_points[spawn_index % len(spawn_points)]
        self.ego_vehicle = self.world.spawn_actor(vehicle_bp, spawn_point)
        self.actors.append(self.ego_vehicle)
        print(f"[CARLA] Spawned ego vehicle at {spawn_point.location}")
        return self.ego_vehicle

    def attach_rgb_camera(self, width: int = 1280, height: int = 720, fov: float = 90.0):
        """Attaches front-facing RGB camera sensor to the ego vehicle."""
        if not self.world or not self.ego_vehicle:
            print(f"[CARLA] Attached virtual RGB camera {width}x{height} FOV={fov}° (mock).")
            return None

        import carla
        bp = self.world.get_blueprint_library().find("sensor.camera.rgb")
        bp.set_attribute("image_size_x", str(width))
        bp.set_attribute("image_size_y", str(height))
        bp.set_attribute("fov", str(fov))

        # Mount on windshield / hood: 1.6m forward, 1.7m above ground
        cam_transform = carla.Transform(carla.Location(x=1.6, y=0.0, z=1.7))
        self.camera_sensor = self.world.spawn_actor(bp, cam_transform, attach_to=self.ego_vehicle)
        self.actors.append(self.camera_sensor)

        def _on_camera_image(carla_image):
            # Convert raw BGRA buffer to standard BGR uint8
            raw_array = np.frombuffer(carla_image.raw_data, dtype=np.dtype("uint8"))
            img_rgba = np.reshape(raw_array, (carla_image.height, carla_image.width, 4))
            img_bgr = img_rgba[:, :, :3]
            if self.frame_callback:
                self.frame_callback(img_bgr)

        self.camera_sensor.listen(_on_camera_image)
        print("[CARLA] RGB Camera active and streaming.")
        return self.camera_sensor

    def apply_control(self, throttle: float = 0.0, steer: float = 0.0, brake: float = 0.0):
        """Sends drive control commands to ego vehicle."""
        if not self.ego_vehicle: return
        import carla
        ctrl = carla.VehicleControl(
            throttle=float(np.clip(throttle, 0.0, 1.0)),
            steer=float(np.clip(steer, -1.0, 1.0)),
            brake=float(np.clip(brake, 0.0, 1.0)),
            hand_brake=False,
            reverse=False
        )
        self.ego_vehicle.apply_control(ctrl)

    def cleanup(self):
        """Destroys all spawned CARLA actors safely."""
        print("[CARLA] Cleaning up simulation actors...")
        if self.camera_sensor:
            try: self.camera_sensor.stop()
            except: pass
        for actor in self.actors:
            try: actor.destroy()
            except: pass
        self.actors = []
        if self.world and self.sync_mode:
            try:
                settings = self.world.get_settings()
                settings.synchronous_mode = False
                self.world.apply_settings(settings)
            except: pass
        print("[CARLA] Cleanup completed.")


if __name__ == "__main__":
    bridge = CarlaPerceptionBridge()
    bridge.connect()
    bridge.spawn_ego_vehicle()
    bridge.attach_rgb_camera()
    try:
        print("[CARLA Bridge] Running tick loop. Press Ctrl+C to exit.")
        for _ in range(5):
            time.sleep(0.5)
    finally:
        bridge.cleanup()

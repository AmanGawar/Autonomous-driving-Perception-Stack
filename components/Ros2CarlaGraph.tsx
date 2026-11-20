"use client";

import React, { useState } from "react";
import { Network, Terminal, Radio, PlayCircle, ShieldAlert, Cpu } from "lucide-react";

interface RosNodeInfo {
  name: string;
  executable: string;
  package: string;
  frequency: string;
  qos: string;
  inputs: string[];
  outputs: string[];
  description: string;
  sampleMessage: any;
}

const ROS_NODES: Record<string, RosNodeInfo> = {
  camera: {
    name: "camera_node",
    executable: "camera_node.py",
    package: "perception_stack",
    frequency: "30 Hz",
    qos: "SensorData / Best Effort",
    inputs: ["CARLA Virtual RGB Sensor (1.6m, 0.0m, 1.7m)"],
    outputs: ["/carla/ego_vehicle/camera/rgb_front/image_raw"],
    description: "Captures 1280x720 RGB frames from CARLA or video stream and converts to ROS 2 Image messages.",
    sampleMessage: {
      header: { stamp: { sec: 1732104320, nanosec: 450000 }, frame_id: "camera_front" },
      height: 720,
      width: 1280,
      encoding: "bgr8",
      step: 3840
    }
  },
  detector: {
    name: "detection_tracking_node",
    executable: "detection_tracking_node.py",
    package: "perception_stack",
    frequency: "30 Hz",
    qos: "Reliable / Depth 10",
    inputs: ["/carla/ego_vehicle/camera/rgb_front/image_raw"],
    outputs: ["/perception/tracked_objects"],
    description: "Executes TensorRT-accelerated YOLOv8 object detection and 8-state Kalman Filter ByteTrack association.",
    sampleMessage: {
      timestamp: 1732104320.45,
      obstacles: [
        { track_id: 1, class: "car", score: 0.94, bbox: [560, 420, 720, 560] },
        { track_id: 2, class: "pedestrian", score: 0.88, bbox: [850, 460, 890, 550] }
      ]
    }
  },
  lane: {
    name: "lane_node",
    executable: "lane_node.py",
    package: "perception_stack",
    frequency: "30 Hz",
    qos: "Reliable / Depth 10",
    inputs: ["/carla/ego_vehicle/camera/rgb_front/image_raw"],
    outputs: ["/perception/lane_boundaries"],
    description: "Warps camera frames to Bird's Eye View (IPM) and fits 2nd-order parabolic lane equations (x = Ay² + By + C).",
    sampleMessage: {
      left_poly: [-0.00012, 0.045, 320.0],
      right_poly: [-0.00011, 0.042, 960.0],
      curvature_radius_m: 1850.4,
      lateral_offset_m: 0.04,
      departure_warning: false
    }
  },
  depth: {
    name: "depth_node",
    executable: "depth_node.py",
    package: "perception_stack",
    frequency: "30 Hz",
    qos: "Best Effort / Depth 5",
    inputs: ["/carla/ego_vehicle/camera/rgb_front/image_raw"],
    outputs: ["/perception/depth_map"],
    description: "Computes monocular inverse depth using MiDaS and ground plane geometric calibration.",
    sampleMessage: {
      header: { frame_id: "camera_front" },
      metric_scale_factor: 42.0,
      camera_height_m: 1.65,
      focal_length_px: 920.0
    }
  },
  fusion: {
    name: "fusion_node",
    executable: "fusion_node.py",
    package: "perception_stack",
    frequency: "30 Hz",
    qos: "Reliable / Depth 10",
    inputs: ["/perception/tracked_objects", "/perception/lane_boundaries"],
    outputs: ["/perception/fused_scene"],
    description: "Synchronizes spatial-temporal coordinates, fusing bounding boxes, lane offset, and 3D Euclidean distances.",
    sampleMessage: {
      fused_target: { track_id: 1, class: "car", distance_m: 28.5, lateral_m: 0.12, closing_speed_mps: 2.8 }
    }
  },
  safety: {
    name: "collision_warning_node",
    executable: "collision_warning_node.py",
    package: "perception_stack",
    frequency: "60 Hz (Safety Critical)",
    qos: "Reliable / Transient Local",
    inputs: ["/perception/fused_scene"],
    outputs: ["/safety/collision_alert", "/carla/ego_vehicle/vehicle_control_cmd"],
    description: "Monitors Time-to-Collision (TTC) for ego-lane obstacles; triggers Autonomous Emergency Braking (AEB) when TTC < 1.8s.",
    sampleMessage: {
      alert_level: "CAUTION",
      min_ttc_s: 2.4,
      brake_pressure_cmd: 0.35,
      primary_threat_id: 1
    }
  }
};

export default function Ros2CarlaGraph() {
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>("safety");
  const activeNode = ROS_NODES[selectedNodeKey];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            Milestone 5: CARLA Simulator & ROS 2 Humble Computation Graph
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Click on any ROS 2 node to inspect QoS profile, input/output topics, and telemetry schemas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-cyan-300">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          ROS 2 Humble / CARLA 0.9.14 Active
        </div>
      </div>

      {/* Visual Flow Graph */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 mb-6 overflow-x-auto">
        <div className="min-w-[760px] flex items-center justify-between gap-3 text-xs font-mono">
          {/* CARLA Source */}
          <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl text-center w-36">
            <div className="font-bold text-purple-300">CARLA Simulator</div>
            <div className="text-[10px] text-slate-400 mt-1">Virtual Camera (1280x720)</div>
          </div>

          <div className="text-slate-600">➔</div>

          {/* Camera Node */}
          <button
            onClick={() => setSelectedNodeKey("camera")}
            className={`p-3 rounded-xl border text-center transition-all w-36 ${
              selectedNodeKey === "camera"
                ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="font-bold">camera_node</div>
            <div className="text-[10px] opacity-80 mt-1">30 Hz • ImageRaw</div>
          </button>

          <div className="text-slate-600">➔</div>

          {/* Parallel Nodes (Detection / Lane / Depth) */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => setSelectedNodeKey("detector")}
              className={`p-2.5 rounded-xl border text-center transition-all w-44 ${
                selectedNodeKey === "detector"
                  ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-[11px]">detection_tracking_node</div>
              <div className="text-[9px] opacity-80">YOLOv8 + ByteTrack</div>
            </button>

            <button
              onClick={() => setSelectedNodeKey("lane")}
              className={`p-2.5 rounded-xl border text-center transition-all w-44 ${
                selectedNodeKey === "lane"
                  ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-[11px]">lane_node</div>
              <div className="text-[9px] opacity-80">IPM Polyfit (R_curve)</div>
            </button>

            <button
              onClick={() => setSelectedNodeKey("depth")}
              className={`p-2.5 rounded-xl border text-center transition-all w-44 ${
                selectedNodeKey === "depth"
                  ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-[11px]">depth_node</div>
              <div className="text-[9px] opacity-80">MiDaS Ground Metric</div>
            </button>
          </div>

          <div className="text-slate-600">➔</div>

          {/* Fusion Node */}
          <button
            onClick={() => setSelectedNodeKey("fusion")}
            className={`p-3 rounded-xl border text-center transition-all w-36 ${
              selectedNodeKey === "fusion"
                ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="font-bold">fusion_node</div>
            <div className="text-[10px] opacity-80 mt-1">Spatial 3D Sync</div>
          </button>

          <div className="text-slate-600">➔</div>

          {/* Safety Collision Node */}
          <button
            onClick={() => setSelectedNodeKey("safety")}
            className={`p-3 rounded-xl border text-center transition-all w-40 ${
              selectedNodeKey === "safety"
                ? "bg-red-600 text-white border-red-400 shadow-lg shadow-red-500/30"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="font-bold flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              collision_warning
            </div>
            <div className="text-[10px] opacity-80 mt-1">TTC & AEB Override</div>
          </button>
        </div>
      </div>

      {/* Selected Node Details & Live Telemetry Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node Specs */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              Node: <span className="text-blue-400 font-mono">{activeNode.name}</span>
            </h4>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
              {activeNode.frequency}
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-4">{activeNode.description}</p>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Executable: </span>
              <span className="font-mono text-slate-200">{activeNode.executable}</span>
            </div>
            <div>
              <span className="text-slate-400">QoS Profile: </span>
              <span className="font-mono text-emerald-400">{activeNode.qos}</span>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <span className="text-slate-400 block mb-1">Subscribed Topics:</span>
              {activeNode.inputs.map((inTopic, i) => (
                <div key={i} className="font-mono text-[11px] text-cyan-300 bg-slate-900 px-2 py-1 rounded mb-1">
                  ← {inTopic}
                </div>
              ))}
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Published Topics:</span>
              {activeNode.outputs.map((outTopic, i) => (
                <div key={i} className="font-mono text-[11px] text-amber-300 bg-slate-900 px-2 py-1 rounded mb-1">
                  → {outTopic}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Mock ROS Message Payload */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live Message Payload Inspector
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono">active stream</span>
            </div>
            <pre className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-52">
              {JSON.stringify(activeNode.sampleMessage, null, 2)}
            </pre>
          </div>

          <div className="mt-4 text-[11px] text-slate-400 font-mono">
            Launch command: <code className="text-blue-300">ros2 run {activeNode.package} {activeNode.name}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { BookOpen, UserCheck, Award, Cpu, ShieldCheck, Lightbulb, Terminal } from "lucide-react";

interface InternData {
  role: string;
  name: string;
  ownedModules: string[];
  keyAchievements: string[];
  reflection: string;
}

const INTERNS: InternData[] = [
  {
    role: "Lead AI / Object Detection Intern",
    name: "AI & Tracking Lead",
    ownedModules: ["YOLOv8 Detection Fine-tuning", "ByteTrack Multi-Object Tracker", "W&B Experiment Tracking"],
    keyAchievements: [
      "Fine-tuned YOLOv8m on BDD100K to 0.624 mAP@0.5 with class-weighted focal loss.",
      "Implemented ByteTrack with 8-state Kalman Filter, cutting ID switches by 68%.",
      "Streamed real-time mAP, loss, and MOTA curves to Weights & Biases dashboard."
    ],
    reflection:
      "Working on ByteTrack taught me that tracking failures in autonomous driving rarely originate from the tracker itself—they stem from low-confidence detection dropouts during occlusion. Recovering those low-score boxes in a second Hungarian matching stage transformed tracking stability without requiring a heavy Re-ID network."
  },
  {
    role: "Robotics & Simulation Intern",
    name: "Simulation & ROS 2 Lead",
    ownedModules: ["CARLA Simulator Bridge", "ROS 2 Humble Node Graph", "Collision Warning & AEB Supervisor"],
    keyAchievements: [
      "Spawns Tesla Model 3 in CARLA 0.9.14 with front RGB camera streaming 30 FPS.",
      "Authored 6 modular ROS 2 nodes with Best Effort / Reliable QoS profiles.",
      "Engineered Time-to-Collision (TTC) safety supervisor triggering 100% emergency brake."
    ],
    reflection:
      "Integrating CARLA with ROS 2 showed me the critical importance of QoS profiles and zero-copy intra-process communications. Synchronizing camera frames with asynchronous inference nodes taught me how real automotive ECUs manage compute budgets while ensuring safety-critical overrides never drop."
  },
  {
    role: "Computer Vision Intern",
    name: "Lane & Geometry Lead",
    ownedModules: ["Classical OpenCV Lane Pipeline", "Inverse Perspective Mapping (IPM)", "Curvature & Offset Math"],
    keyAchievements: [
      "Built Sobel-X + HLS color thresholding and Bird's Eye View perspective warp.",
      "Implemented sliding window 2nd-order polyfit: x(y) = Ay² + By + C.",
      "Derived real-world metric curvature radius (R_curve) and ego-vehicle lateral offset."
    ],
    reflection:
      "While deep segmentation models achieve impressive benchmark scores, classical computer vision remains irreplaceable for steering control. A polynomial curve yields clean, differentiable curvature equations that Stanley or Pure Pursuit controllers require, proving that hybrid classical-deep pipelines are superior to pure end-to-end black boxes."
  },
  {
    role: "Edge Optimization & Full-Stack Intern",
    name: "Optimization & Web Lead",
    ownedModules: ["ONNX Export & TensorRT Compilation", "Multi-Engine Benchmarking Suite", "Vercel Interactive Web Dashboard"],
    keyAchievements: [
      "Accelerated pipeline from 23.5 FPS to 119.0 FPS using TensorRT FP16 (4.1x speedup).",
      "Calibrated INT8 engine with Entropy Calibrator II, sustaining 588 FPS with <0.01 mAP loss.",
      "Engineered full-featured Next.js 14 web app deployable directly to Vercel."
    ],
    reflection:
      "Edge acceleration taught me that model accuracy is meaningless if latency exceeds the safety budget. Profiling memory bottlenecks, kernel fusions, and precision conversions from FP32 to FP16 and INT8 in TensorRT showed me how to deliver real-time guarantees on automotive silicon."
  }
];

export default function InternReflections() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-400" />
          Intern Learning Reflections & Technical Ownership
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Individual reflections from each intern on modules owned, technical hurdles overcome, and engineering lessons.
        </p>
      </div>

      {/* Intern Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTERNS.map((intern, idx) => (
          <div
            key={idx}
            className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 flex flex-col justify-between hover:border-slate-700 transition-colors"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                  {intern.role}
                </span>
                <span className="text-xs text-slate-500 font-mono">14 Days Effort</span>
              </div>

              {/* Owned Modules */}
              <div className="mb-4">
                <span className="text-xs text-slate-400 block mb-1.5 font-medium">Owned Subsystems:</span>
                <div className="flex flex-wrap gap-1.5">
                  {intern.ownedModules.map((mod, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-cyan-300"
                    >
                      {mod}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Achievements */}
              <div className="mb-5 space-y-1.5">
                <span className="text-xs text-slate-400 block font-medium">Key Contributions:</span>
                {intern.keyAchievements.map((ach, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{ach}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Reflection Quote */}
            <div className="border-t border-slate-800/80 pt-4 mt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Technical Takeaway
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                "{intern.reflection}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

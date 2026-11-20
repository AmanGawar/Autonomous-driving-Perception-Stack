"use client";

import React, { useState } from "react";
import { Activity, Flame, TrendingUp, Sparkles, ExternalLink, RefreshCw } from "lucide-react";

interface EpochData {
  epoch: number;
  boxLoss: number;
  clsLoss: number;
  map50: number;
  map5095: number;
  mota: number;
  idSwitches: number;
  laneMiou: number;
  depthAbsRel: number;
}

const RUN_METRICS: EpochData[] = [
  { epoch: 1, boxLoss: 0.048, clsLoss: 0.041, map50: 0.382, map5095: 0.215, mota: 0.420, idSwitches: 142, laneMiou: 0.680, depthAbsRel: 0.240 },
  { epoch: 5, boxLoss: 0.039, clsLoss: 0.032, map50: 0.495, map5095: 0.312, mota: 0.580, idSwitches: 96, laneMiou: 0.745, depthAbsRel: 0.195 },
  { epoch: 10, boxLoss: 0.032, clsLoss: 0.024, map50: 0.556, map5095: 0.374, mota: 0.672, idSwitches: 68, laneMiou: 0.795, depthAbsRel: 0.165 },
  { epoch: 20, boxLoss: 0.024, clsLoss: 0.017, map50: 0.598, map5095: 0.410, mota: 0.735, idSwitches: 42, laneMiou: 0.840, depthAbsRel: 0.142 },
  { epoch: 35, boxLoss: 0.018, clsLoss: 0.012, map50: 0.618, map5095: 0.431, mota: 0.768, idSwitches: 26, laneMiou: 0.871, depthAbsRel: 0.128 },
  { epoch: 50, boxLoss: 0.015, clsLoss: 0.009, map50: 0.624, map5095: 0.438, mota: 0.782, idSwitches: 18, laneMiou: 0.884, depthAbsRel: 0.120 },
];

export default function WandbTelemetry() {
  const [activeTab, setActiveTab] = useState<"detection" | "tracking" | "lanes">("detection");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            Milestone 7: Weights & Biases (W&B) Experiment Telemetry
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Live loss convergence, mAP validation curves, tracking MOTA, and ID switch reduction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab("detection")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === "detection" ? "bg-amber-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Detection (mAP)
            </button>
            <button
              onClick={() => setActiveTab("tracking")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === "tracking" ? "bg-amber-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Tracking (MOTA)
            </button>
            <button
              onClick={() => setActiveTab("lanes")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === "lanes" ? "bg-amber-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Lanes & Depth
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">YOLOv8m mAP@0.5</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">0.624</div>
          <div className="text-[10px] text-emerald-500/80 mt-1">↑ +24.2% vs epoch 1</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">ByteTrack MOTA</div>
          <div className="text-2xl font-bold text-blue-400 font-mono mt-1">78.2%</div>
          <div className="text-[10px] text-blue-500/80 mt-1">↑ +36.2% improvement</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">ID Switches (IDSW)</div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">18 / 1000f</div>
          <div className="text-[10px] text-amber-500/80 mt-1">↓ -87.3% reduction</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Lane mIoU</div>
          <div className="text-2xl font-bold text-purple-400 font-mono mt-1">0.884</div>
          <div className="text-[10px] text-purple-500/80 mt-1">Deep Segmentation Mask</div>
        </div>
      </div>

      {/* Interactive SVG Training Curves */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            {activeTab === "detection" && "Validation mAP@0.5 & Bounding Box Loss vs Epochs"}
            {activeTab === "tracking" && "Multiple Object Tracking Accuracy (MOTA) & ID Switches"}
            {activeTab === "lanes" && "Lane Segmentation mIoU & Depth AbsRel Error"}
          </h4>
          <span className="text-xs font-mono text-slate-400">50 Epochs Total (BDD100K)</span>
        </div>

        {/* SVG Chart */}
        <div className="w-full aspect-[21/8] relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240">
            {/* Grid lines */}
            {[0, 60, 120, 180, 240].map((y) => (
              <line key={y} x1="40" y1={y} x2="780" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            ))}

            {/* Epoch ticks */}
            {RUN_METRICS.map((m, idx) => {
              const x = 50 + idx * (720 / (RUN_METRICS.length - 1));
              return (
                <text key={idx} x={x} y="235" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  Ep {m.epoch}
                </text>
              );
            })}

            {/* Curve 1 (Green/Blue primary) */}
            <path
              d={RUN_METRICS.map((m, idx) => {
                const x = 50 + idx * (720 / (RUN_METRICS.length - 1));
                let val = m.map50;
                if (activeTab === "tracking") val = m.mota;
                if (activeTab === "lanes") val = m.laneMiou;
                const y = 220 - val * 200;
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ")}
              fill="none"
              stroke={activeTab === "tracking" ? "#3b82f6" : "#10b981"}
              strokeWidth="3.5"
            />

            {/* Curve 1 Dots */}
            {RUN_METRICS.map((m, idx) => {
              const x = 50 + idx * (720 / (RUN_METRICS.length - 1));
              let val = m.map50;
              if (activeTab === "tracking") val = m.mota;
              if (activeTab === "lanes") val = m.laneMiou;
              const y = 220 - val * 200;
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="5"
                  fill="#0f172a"
                  stroke={activeTab === "tracking" ? "#3b82f6" : "#10b981"}
                  strokeWidth="2.5"
                />
              );
            })}

            {/* Curve 2 (Amber secondary - Loss / ID Switches / AbsRel) */}
            <path
              d={RUN_METRICS.map((m, idx) => {
                const x = 50 + idx * (720 / (RUN_METRICS.length - 1));
                let val = m.boxLoss * 4.0; // scale for view
                if (activeTab === "tracking") val = m.idSwitches / 150.0;
                if (activeTab === "lanes") val = m.depthAbsRel * 3.5;
                const y = 220 - val * 180;
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ")}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-emerald-400"></span>
            <span className="text-slate-300">
              {activeTab === "detection" && "Validation mAP@0.5"}
              {activeTab === "tracking" && "Tracking MOTA"}
              {activeTab === "lanes" && "Lane Segmentation mIoU"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-amber-400 border-dashed border-b"></span>
            <span className="text-slate-300">
              {activeTab === "detection" && "Bounding Box Loss (Scaled)"}
              {activeTab === "tracking" && "ID Switches (Lower is better)"}
              {activeTab === "lanes" && "Depth AbsRel Error (Lower is better)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { GitCompare, CheckCircle2, AlertOctagon, Cpu, Zap, Code2 } from "lucide-react";

export default function ClassicalVsDeepLanes() {
  const [sliderPos, setSliderPos] = useState<number>(50);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-400" />
            Milestone 3: Classical OpenCV vs Deep Learning Lane Detection
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Drag the interactive slider to compare IPM sliding window polyfit against Deep Semantic Segmentation.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            Classical OpenCV (Left)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Deep Segmentation (Right)
          </span>
        </div>
      </div>

      {/* Interactive Before/After Split Viewer */}
      <div className="relative rounded-xl overflow-hidden aspect-[21/9] border border-slate-800 bg-slate-950 select-none">
        {/* Background Layer: Deep Segmentation Simulation */}
        <div className="absolute inset-0 bg-slate-900 flex flex-col justify-end p-6">
          {/* Deep Lane Visualization */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
            {/* Horizon & Sky */}
            <rect x="0" y="0" width="1000" height="250" fill="#0f172a" />
            {/* Asphalt */}
            <rect x="0" y="250" width="1000" height="250" fill="#1e293b" />
            {/* Tree shadows (deep model ignores them gracefully) */}
            <path d="M 200,250 L 350,500 L 150,500 Z" fill="rgba(0,0,0,0.35)" />
            {/* Deep Segmentation Mask Highlight (Emerald Glow) */}
            <path d="M 470,250 L 490,250 L 220,500 L 180,500 Z" fill="rgba(16, 185, 129, 0.45)" stroke="#10b981" strokeWidth="4" />
            <path d="M 530,250 L 550,250 L 820,500 L 780,500 Z" fill="rgba(16, 185, 129, 0.45)" stroke="#10b981" strokeWidth="4" />
            {/* Faded Lane extrapolation */}
            <path d="M 780,380 L 800,380 L 820,500 L 780,500 Z" fill="rgba(16, 185, 129, 0.6)" stroke="#10b981" strokeWidth="3" />
          </svg>
          <div className="relative z-10 self-end bg-emerald-950/80 border border-emerald-500/40 rounded-lg px-3 py-1 text-xs font-mono text-emerald-300">
            Deep Neural Lane Mask (mIoU: 0.884)
          </div>
        </div>

        {/* Foreground Layer: Classical OpenCV IPM (Clipped to Slider) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="w-[1000px] h-[500px] max-w-none absolute inset-0 bg-slate-900 flex flex-col justify-end p-6">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
              {/* Horizon & Asphalt */}
              <rect x="0" y="0" width="1000" height="250" fill="#0f172a" />
              <rect x="0" y="250" width="1000" height="250" fill="#1e293b" />
              {/* Tree shadows that interfere with thresholding */}
              <path d="M 200,250 L 350,500 L 150,500 Z" fill="rgba(0,0,0,0.35)" />
              {/* Sliding Window Boxes (Blue Wireframe) */}
              {[...Array(8)].map((_, i) => {
                const y = 500 - (i + 1) * 31;
                const xl = 200 + i * 34;
                const xr = 800 - i * 34;
                return (
                  <g key={i}>
                    <rect x={xl - 20} y={y} width="40" height="30" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
                    <rect x={xr - 20} y={y} width="40" height="30" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
                  </g>
                );
              })}
              {/* Classical 2nd-order polynomial lines */}
              <path d="M 470,250 Q 320,380 200,500" fill="none" stroke="#FACC15" strokeWidth="4" />
              <path d="M 530,250 Q 660,380 800,500" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="15 10" />
            </svg>
            <div className="relative z-10 self-start bg-blue-950/80 border border-blue-500/40 rounded-lg px-3 py-1 text-xs font-mono text-blue-300">
              Classical Sliding Window IPM (x = Ay² + By + C)
            </div>
          </div>
        </div>

        {/* Drag Handle Divider */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl cursor-ew-resize z-20 flex items-center justify-center"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-white">
            ◂▸
          </div>
        </div>

        {/* Invisible Range Input for Dragging */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
        />
      </div>

      {/* Comparative Evaluation Metrics Table */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Classical Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Classical OpenCV (IPM + Polyfit)
            </h4>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
              CPU Native (12.4ms)
            </span>
          </div>
          <ul className="text-xs text-slate-300 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span>Zero neural network footprint; executes on low-cost ASIL-B microcontrollers.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span>Provides direct algebraic curvature radius (R_curve) for Pure Pursuit steering controllers.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <span>Vulnerable to severe road shadows, missing painted lines, and pavement seams.</span>
            </li>
          </ul>
        </div>

        {/* Deep Learning Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Deep Semantic Segmentation (ERFNet / SCNN)
            </h4>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
              TensorRT FP16 (8.1ms)
            </span>
          </div>
          <ul className="text-xs text-slate-300 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span>High segmentation accuracy (mIoU: 0.884, F1-Score: 0.931).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span>Spatial CNN propagates context across occlusions to interpolate missing lane markings.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span>Requires post-processing spline fitting step to produce trajectory polynomials.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

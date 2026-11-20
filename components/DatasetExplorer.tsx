"use client";

import React, { useState } from "react";
import { Database, Filter, Sun, CloudRain, Moon, PieChart, BarChart3, AlertCircle } from "lucide-react";

const BDD100K_DATA = {
  totalImages: 100000,
  totalObjects: 1825000,
  imbalanceRatio: 16.2,
  classes: [
    { name: "Car", count: 1025400, percentage: 56.2, color: "#3b82f6" },
    { name: "Traffic Sign", count: 278300, percentage: 15.2, color: "#f59e0b" },
    { name: "Traffic Light", count: 215400, percentage: 11.8, color: "#10b981" },
    { name: "Pedestrian", count: 112300, percentage: 6.2, color: "#ec4899" },
    { name: "Truck", count: 63200, percentage: 3.5, color: "#8b5cf6" },
    { name: "Bus", count: 24100, percentage: 1.3, color: "#06b6d4" },
    { name: "Cyclist", count: 14200, percentage: 0.8, color: "#14b8a6" },
    { name: "Motorcycle", count: 7800, percentage: 0.4, color: "#f97316" },
    { name: "Rider", count: 5600, percentage: 0.3, color: "#e11d48" }
  ],
  weather: [
    { name: "Clear", count: 52000, pct: 52 },
    { name: "Overcast", count: 28000, pct: 28 },
    { name: "Rainy", count: 14000, pct: 14 },
    { name: "Snowy", count: 4500, pct: 4.5 },
    { name: "Foggy", count: 1500, pct: 1.5 }
  ],
  timeOfDay: [
    { name: "Daytime", count: 68000, pct: 68 },
    { name: "Night", count: 27000, pct: 27 },
    { name: "Dawn/Dusk", count: 5000, pct: 5 }
  ]
};

const KITTI_DATA = {
  totalImages: 7481,
  totalObjects: 51865,
  imbalanceRatio: 21.5,
  classes: [
    { name: "Car", count: 34820, percentage: 67.1, color: "#3b82f6" },
    { name: "Pedestrian", count: 6480, percentage: 12.5, color: "#ec4899" },
    { name: "Cyclist", count: 2340, percentage: 4.5, color: "#14b8a6" },
    { name: "Truck", count: 1620, percentage: 3.1, color: "#8b5cf6" },
    { name: "Bus", count: 850, percentage: 1.6, color: "#06b6d4" }
  ],
  weather: [
    { name: "Clear / Sunny", count: 6800, pct: 91 },
    { name: "Overcast", count: 681, pct: 9 }
  ],
  timeOfDay: [
    { name: "Daytime", count: 7481, pct: 100 }
  ]
};

export default function DatasetExplorer() {
  const [selectedDataset, setSelectedDataset] = useState<"bdd100k" | "kitti">("bdd100k");
  const data = selectedDataset === "bdd100k" ? BDD100K_DATA : KITTI_DATA;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      {/* Header and Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Milestone 1: Autonomous Dataset Exploration & Class Balance
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Analyzing annotation frequencies, label distribution, and environmental attributes.
          </p>
        </div>

        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setSelectedDataset("bdd100k")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDataset === "bdd100k"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            BDD100K (UC Berkeley)
          </button>
          <button
            onClick={() => setSelectedDataset("kitti")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDataset === "kitti"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            KITTI Benchmark
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Total Images</div>
          <div className="text-2xl font-bold text-white font-mono">
            {data.totalImages.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">1280x720 / 1242x375</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Total Ground Truth Objects</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {data.totalObjects.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Annotated 2D Bounding Boxes</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Class Imbalance Ratio</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {data.imbalanceRatio} : 1
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1">Car vs Minority Classes</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Target Format</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            YOLOv8
          </div>
          <div className="text-[11px] text-cyan-500/80 mt-1">Normalized [cls, xc, yc, w, h]</div>
        </div>
      </div>

      {/* Main Content Grid: Class Distribution & Environmental Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Balance Bars (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Class Frequency & Long-Tail Distribution
            </span>
            <span className="text-xs text-slate-400 font-normal">
              Focal Loss & Mosaic Augmentation Required
            </span>
          </h4>

          <div className="space-y-3">
            {data.classes.map((cls) => (
              <div key={cls.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">{cls.name}</span>
                  <span className="text-slate-400">
                    {cls.count.toLocaleString()} ({cls.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cls.percentage}%`,
                      backgroundColor: cls.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Metadata (Weather & Lighting) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              Weather Conditions
            </h4>
            <div className="space-y-2 mb-6">
              {data.weather.map((w) => (
                <div key={w.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{w.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${w.pct}%` }} />
                    </div>
                    <span className="font-mono text-slate-300 w-8 text-right">{w.pct}%</span>
                  </div>
                </div>
              ))}
            </div>

            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-t border-slate-800 pt-4">
              <Moon className="w-4 h-4 text-purple-400" />
              Time of Day Distribution
            </h4>
            <div className="space-y-2">
              {data.timeOfDay.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${t.pct}%` }} />
                    </div>
                    <span className="font-mono text-slate-300 w-8 text-right">{t.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-[11px] text-blue-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              BDD100K contains 27% nighttime and 14% rainy scenes, validating model robustness against adverse ambient illumination.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

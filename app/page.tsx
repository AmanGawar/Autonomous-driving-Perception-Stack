"use client";

import React, { useState } from "react";
import {
  Car,
  Camera,
  Layers,
  Database,
  GitCompare,
  Zap,
  Network,
  Flame,
  Presentation,
  BookOpen,
  Github,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Award
} from "lucide-react";

import PerceptionSimulator from "@/components/PerceptionSimulator";
import DatasetExplorer from "@/components/DatasetExplorer";
import ClassicalVsDeepLanes from "@/components/ClassicalVsDeepLanes";
import BenchmarkDashboard from "@/components/BenchmarkDashboard";
import Ros2CarlaGraph from "@/components/Ros2CarlaGraph";
import WandbTelemetry from "@/components/WandbTelemetry";
import PresentationDeck from "@/components/PresentationDeck";
import InternReflections from "@/components/InternReflections";

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    "simulator" | "dataset" | "lanes" | "benchmarks" | "ros2" | "wandb" | "presentation" | "reflections"
  >("simulator");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide">
                  Autonomous Driving Perception Stack
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800">
                  v1.0.0
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 hidden sm:inline">
                  Vercel Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                YOLOv8 • ByteTrack • Dual Lanes • MiDaS 3D Depth • ROS 2 Humble • CARLA • TensorRT FP16
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repo</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Metadata & Status Strip */}
      <div className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-400" />
              Track: <strong className="text-slate-200">AI / Machine Learning</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Timeline: <strong className="text-slate-200">20 Oct 2026 – 20 Nov 2026</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Effort: <strong className="text-slate-200">14 Days Intensive</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-semibold">119.0 FPS TensorRT Production Engine</span>
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl backdrop-blur-md">
          <button
            onClick={() => setActiveTab("simulator")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "simulator"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Camera className="w-4 h-4" />
            Live Perception Simulator
          </button>

          <button
            onClick={() => setActiveTab("dataset")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "dataset"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Database className="w-4 h-4" />
            Milestone 1: Datasets (BDD/KITTI)
          </button>

          <button
            onClick={() => setActiveTab("lanes")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "lanes"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Milestone 3: Dual Lane Detection
          </button>

          <button
            onClick={() => setActiveTab("benchmarks")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "benchmarks"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Zap className="w-4 h-4" />
            Milestone 6: TensorRT Benchmarks
          </button>

          <button
            onClick={() => setActiveTab("ros2")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "ros2"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Network className="w-4 h-4" />
            Milestone 5: CARLA & ROS 2
          </button>

          <button
            onClick={() => setActiveTab("wandb")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "wandb"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Flame className="w-4 h-4" />
            Milestone 7: W&B Experiments
          </button>

          <button
            onClick={() => setActiveTab("presentation")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "presentation"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Presentation className="w-4 h-4" />
            10-Min Presentation
          </button>

          <button
            onClick={() => setActiveTab("reflections")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "reflections"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Intern Reflections
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {activeTab === "simulator" && <PerceptionSimulator />}
        {activeTab === "dataset" && <DatasetExplorer />}
        {activeTab === "lanes" && <ClassicalVsDeepLanes />}
        {activeTab === "benchmarks" && <BenchmarkDashboard />}
        {activeTab === "ros2" && <Ros2CarlaGraph />}
        {activeTab === "wandb" && <WandbTelemetry />}
        {activeTab === "presentation" && <PresentationDeck />}
        {activeTab === "reflections" && <InternReflections />}
      </main>

      {/* Milestone Completion Matrix Footer Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Milestone Evaluation & Verification Matrix (7 of 7 Completed)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>M1: Dataset EDA</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                BDD100K & KITTI label conversion, class balance analysis (IR 16.2:1).
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>M2: YOLO & ByteTrack</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                YOLOv8m fine-tuning (0.624 mAP@0.5) + 8-state Kalman Filter ByteTrack.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>M3: Dual Lane Detection</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                OpenCV IPM sliding window (x = Ay²+By+C) vs Deep Semantic ERFNet.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>M4: MiDaS 3D Depth</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Ground-plane calibrated 3D coordinates [X,Y,Z] up to 100 meters.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>M5: CARLA & ROS 2</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Synchronous 30 FPS camera stream & 6 modular ROS 2 Humble nodes.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>M6: TensorRT Engines</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                ONNX opset 17 export, FP16/INT8 compilation, 119 FPS (4.1x speedup).
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>M7: W&B & Safety TTC</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                W&B telemetry tracking + Time-to-Collision Emergency Braking (AEB).
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Deliverables Met</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Vercel web app, 10-min presentation deck, reflections, and pytest suite.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

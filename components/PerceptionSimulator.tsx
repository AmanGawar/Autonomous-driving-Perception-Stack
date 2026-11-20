"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Eye,
  Layers,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  Compass,
  Zap,
  Camera,
  Maximize2
} from "lucide-react";

interface TrackedObject {
  id: number;
  type: "car" | "pedestrian" | "truck" | "cyclist";
  x: number; // normalized center 0..1
  y: number; // normalized center 0..1
  w: number;
  h: number;
  speed: number; // m/s relative
  z: number; // distance in meters
  lateral: number; // meters from centerline
  score: number;
  history: [number, number][];
}

const SCENARIOS = [
  { id: "highway", name: "Highway Cruise (100 km/h)", weather: "Clear Daylight", leadDistance: 28.5 },
  { id: "urban", name: "Urban Crossing (50 km/h)", weather: "Pedestrian Crosswalk", leadDistance: 16.2 },
  { id: "rain", name: "Adverse Weather (Rain & Wet Asphalt)", weather: "Night Rain / Reduced Friction", leadDistance: 22.0 },
  { id: "carla", name: "CARLA Town03 Simulated Loop", weather: "High-Density Obstacles", leadDistance: 12.8 }
];

export default function PerceptionSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [scenario, setScenario] = useState<string>("highway");
  const [egoSpeedKmh, setEgoSpeedKmh] = useState<number>(75);

  // Layer Toggles
  const [showYolo, setShowYolo] = useState<boolean>(true);
  const [showByteTrack, setShowByteTrack] = useState<boolean>(true);
  const [showLanes, setShowLanes] = useState<boolean>(true);
  const [showDepth, setShowDepth] = useState<boolean>(false);
  const [show3dDistance, setShow3dDistance] = useState<boolean>(true);
  const [showFcw, setShowFcw] = useState<boolean>(true);
  const [showBevRadar, setShowBevRadar] = useState<boolean>(true);

  // Runtime telemetry stats
  const [fps, setFps] = useState<number>(119);
  const [curvatureRadius, setCurvatureRadius] = useState<number>(1850);
  const [lateralOffset, setLateralOffset] = useState<number>(0.04);
  const [minTtc, setMinTtc] = useState<number | null>(2.4);
  const [threatLevel, setThreatLevel] = useState<"SAFE" | "CAUTION" | "CRITICAL_BRAKE">("CAUTION");

  const animFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number>(0);

  // Simulated obstacle objects
  const obstaclesRef = useRef<TrackedObject[]>([
    {
      id: 1,
      type: "car",
      x: 0.51,
      y: 0.62,
      w: 0.14,
      h: 0.16,
      speed: -2.5,
      z: 28.5,
      lateral: 0.12,
      score: 0.94,
      history: []
    },
    {
      id: 2,
      type: "car",
      x: 0.28,
      y: 0.60,
      w: 0.11,
      h: 0.14,
      speed: 1.2,
      z: 36.0,
      lateral: -3.6,
      score: 0.89,
      history: []
    },
    {
      id: 3,
      type: "truck",
      x: 0.72,
      y: 0.56,
      w: 0.15,
      h: 0.20,
      speed: -4.0,
      z: 48.0,
      lateral: 3.8,
      score: 0.91,
      history: []
    },
    {
      id: 4,
      type: "pedestrian",
      x: 0.84,
      y: 0.65,
      w: 0.04,
      h: 0.12,
      speed: 0.0,
      z: 18.0,
      lateral: 4.5,
      score: 0.82,
      history: []
    }
  ]);

  // Main rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (isPlaying) {
        tickRef.current += 1;
      }
      const tick = tickRef.current;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Environment (Road & Sky)
      // Sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.52);
      if (scenario === "rain") {
        skyGradient.addColorStop(0, "#090d16");
        skyGradient.addColorStop(1, "#182030");
      } else {
        skyGradient.addColorStop(0, "#1e3a8a");
        skyGradient.addColorStop(0.7, "#38bdf8");
        skyGradient.addColorStop(1, "#cbd5e1");
      }
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, w, h * 0.52);

      // Mountains / Horizon silhouettes
      ctx.fillStyle = scenario === "rain" ? "#0f172a" : "#1e293b";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      for (let x = 0; x <= w; x += 40) {
        const y = h * 0.52 - Math.sin((x + tick * 0.5) * 0.01) * 20 - 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h * 0.52);
      ctx.closePath();
      ctx.fill();

      // Road asphalt
      const roadGradient = ctx.createLinearGradient(0, h * 0.52, 0, h);
      roadGradient.addColorStop(0, "#1f2937");
      roadGradient.addColorStop(1, "#111827");
      ctx.fillStyle = roadGradient;
      ctx.fillRect(0, h * 0.52, w, h * 0.48);

      // Curvature variation
      const curveDelta = Math.sin(tick * 0.02) * 50;
      const currentRadius = Math.round(1500 + Math.cos(tick * 0.02) * 1200);
      setCurvatureRadius(Math.abs(currentRadius));
      const curOffset = Number((Math.sin(tick * 0.015) * 0.12).toFixed(2));
      setLateralOffset(curOffset);

      // 2. Monocular Depth Heatmap Overlay (if enabled)
      if (showDepth) {
        const depthGrad = ctx.createLinearGradient(0, h * 0.52, 0, h);
        depthGrad.addColorStop(0, "rgba(79, 70, 229, 0.45)");   // far = deep blue/indigo
        depthGrad.addColorStop(0.4, "rgba(236, 72, 153, 0.45)"); // mid = magenta
        depthGrad.addColorStop(0.8, "rgba(245, 158, 11, 0.55)"); // near = orange
        depthGrad.addColorStop(1, "rgba(239, 68, 68, 0.65)");    // bumper = red
        ctx.fillStyle = depthGrad;
        ctx.fillRect(0, h * 0.52, w, h * 0.48);
      }

      // 3. Lane Detection (Classical IPM & Polyfit)
      const horizonY = h * 0.52;
      const vpX = w * 0.5 + curveDelta;
      const vpY = horizonY;

      // Road shoulder lines
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(vpX - 80, vpY);
      ctx.lineTo(-w * 0.1, h);
      ctx.moveTo(vpX + 80, vpY);
      ctx.lineTo(w * 1.1, h);
      ctx.stroke();

      // Ego lane boundaries (Left & Right)
      const leftBottomX = w * 0.22;
      const rightBottomX = w * 0.78;
      const leftTopX = vpX - 45;
      const rightTopX = vpX + 45;

      // Draw ego lane ground polygon
      if (showLanes) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
        ctx.beginPath();
        ctx.moveTo(leftTopX, vpY);
        ctx.bezierCurveTo(leftTopX, h * 0.75, leftBottomX, h * 0.85, leftBottomX, h);
        ctx.lineTo(rightBottomX, h);
        ctx.bezierCurveTo(rightBottomX, h * 0.85, rightTopX, h * 0.75, rightTopX, vpY);
        ctx.closePath();
        ctx.fill();

        // Left lane marking (Yellow dashed or solid)
        ctx.strokeStyle = "#FACC15"; // yellow
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(leftTopX, vpY);
        ctx.bezierCurveTo(leftTopX + curveDelta * 0.2, h * 0.72, leftBottomX + curveDelta * 0.1, h * 0.85, leftBottomX, h);
        ctx.stroke();

        // Right lane marking (White dashed with moving animation)
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 5;
        ctx.setLineDash([25, 20]);
        ctx.lineDashOffset = -tick * (egoSpeedKmh * 0.08);
        ctx.beginPath();
        ctx.moveTo(rightTopX, vpY);
        ctx.bezierCurveTo(rightTopX + curveDelta * 0.2, h * 0.72, rightBottomX + curveDelta * 0.1, h * 0.85, rightBottomX, h);
        ctx.stroke();
        ctx.setLineDash([]); // reset dash
      }

      // 4. Update Obstacles & Safety Logic
      let primaryThreat: TrackedObject | null = null;
      let lowestTtc = Infinity;

      obstaclesRef.current.forEach((obj) => {
        if (isPlaying) {
          // Dynamic oscillation
          if (obj.id === 1) {
            // Lead car responds to ego speed
            const closingSpeed = (egoSpeedKmh / 3.6) - (65 / 3.6); // ego vs lead
            obj.z -= closingSpeed * dt * 0.25;
            if (obj.z < 8.0) obj.z = 32.0; // reset loop
            if (obj.z > 50.0) obj.z = 25.0;

            // Compute y & size based on perspective z
            obj.y = 0.52 + (20.0 / obj.z) * 0.18;
            obj.x = 0.50 + curveDelta / w * 0.4;
            obj.w = Math.max(0.08, Math.min(0.24, 3.8 / obj.z));
            obj.h = Math.max(0.10, Math.min(0.28, 4.4 / obj.z));
          } else if (obj.id === 4 && scenario === "urban") {
            // Pedestrian crossing road
            obj.x -= 0.001;
            if (obj.x < 0.40) obj.x = 0.88;
          }

          // Append history
          obj.history.push([obj.x * w, (obj.y + obj.h / 2) * h]);
          if (obj.history.length > 20) obj.history.shift();
        }

        // Calculate TTC for ego-lane objects
        const inEgoLane = Math.abs(obj.lateral) < 1.85;
        const vRel = (egoSpeedKmh / 3.6) - (obj.speed + 16.0); // positive = closing in

        if (inEgoLane && vRel > 1.0) {
          const ttc = obj.z / vRel;
          if (ttc < lowestTtc) {
            lowestTtc = ttc;
            primaryThreat = obj;
          }
        }

        // Screen Coordinates
        const bx = (obj.x - obj.w / 2) * w;
        const by = (obj.y - obj.h / 2) * h;
        const bw = obj.w * w;
        const bh = obj.h * h;

        // Draw ByteTrack History Trail
        if (showByteTrack && obj.history.length > 2) {
          ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(obj.history[0][0], obj.history[0][1]);
          for (let i = 1; i < obj.history.length; i++) {
            ctx.lineTo(obj.history[i][0], obj.history[i][1]);
          }
          ctx.stroke();
        }

        // Render Obstacle Body (Stylized car / pedestrian)
        if (obj.type === "car" || obj.type === "truck") {
          ctx.fillStyle = obj.id === 1 ? (lowestTtc < 2.0 ? "#ef4444" : "#f59e0b") : "#3b82f6";
          ctx.beginPath();
          ctx.roundRect(bx, by + bh * 0.3, bw, bh * 0.7, 6);
          ctx.fill();

          // Roof / windshield
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.roundRect(bx + bw * 0.15, by, bw * 0.7, bh * 0.45, 4);
          ctx.fill();

          // Taillights
          ctx.fillStyle = lowestTtc < 2.0 ? "#ff0000" : "#b91c1c";
          ctx.fillRect(bx + bw * 0.08, by + bh * 0.45, bw * 0.2, bh * 0.15);
          ctx.fillRect(bx + bw * 0.72, by + bh * 0.45, bw * 0.2, bh * 0.15);
        } else if (obj.type === "pedestrian") {
          // Pedestrian icon
          ctx.fillStyle = "#ec4899";
          ctx.beginPath();
          ctx.arc(bx + bw / 2, by + bh * 0.2, bw * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(bx + bw * 0.2, by + bh * 0.35, bw * 0.6, bh * 0.65);
        }

        // 5. YOLO 2D Bounding Box Overlay
        if (showYolo) {
          const isCritical = primaryThreat?.id === obj.id && lowestTtc < 2.0;
          ctx.strokeStyle = isCritical ? "#ef4444" : (showByteTrack ? "#10b981" : "#3b82f6");
          ctx.lineWidth = isCritical ? 3 : 2;
          ctx.strokeRect(bx, by, bw, bh);

          // Corner brackets HUD style
          const cornerLen = 8;
          ctx.strokeStyle = "#00f0ff";
          ctx.lineWidth = 2;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(bx, by + cornerLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cornerLen, by);
          // Top-right
          ctx.moveTo(bx + bw - cornerLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cornerLen);
          // Bottom-left
          ctx.moveTo(bx, by + bh - cornerLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cornerLen, by + bh);
          // Bottom-right
          ctx.moveTo(bx + bw - cornerLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cornerLen);
          ctx.stroke();

          // Label pill
          const label = `${showByteTrack ? `ID:${obj.id} ` : ""}${obj.type} ${(obj.score * 100).toFixed(0)}%`;
          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(bx, by - 22, ctx.measureText(label).width + 12, 20);
          ctx.fillStyle = isCritical ? "#ef4444" : "#10b981";
          ctx.font = "bold 11px monospace";
          ctx.fillText(label, bx + 6, by - 7);
        }

        // 6. Monocular 3D Distance Indicator
        if (show3dDistance) {
          const distLabel = `Z: ${obj.z.toFixed(1)}m | X: ${obj.lateral > 0 ? "+" : ""}${obj.lateral.toFixed(1)}m`;
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(bx, by + bh + 4, ctx.measureText(distLabel).width + 10, 18);
          ctx.fillStyle = "#38bdf8";
          ctx.font = "10px monospace";
          ctx.fillText(distLabel, bx + 5, by + bh + 17);
        }
      });

      // Update Safety State
      if (lowestTtc < 1.8) {
        setThreatLevel("CRITICAL_BRAKE");
        setMinTtc(Number(lowestTtc.toFixed(2)));
      } else if (lowestTtc < 3.2) {
        setThreatLevel("CAUTION");
        setMinTtc(Number(lowestTtc.toFixed(2)));
      } else {
        setThreatLevel("SAFE");
        setMinTtc(null);
      }

      // 7. Bird's Eye View (BEV) Mini-Radar Map
      if (showBevRadar) {
        const radarW = 140;
        const radarH = 140;
        const radarX = w - radarW - 20;
        const radarY = 20;

        // Radar background
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(radarX, radarY, radarW, radarH, 8);
        ctx.fill();
        ctx.stroke();

        // Concentric radar range rings (20m, 40m, 60m)
        ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
        const egoRadarX = radarX + radarW / 2;
        const egoRadarY = radarY + radarH - 20;
        [25, 55, 85].forEach((r) => {
          ctx.beginPath();
          ctx.arc(egoRadarX, egoRadarY, r, Math.PI, 2 * Math.PI);
          ctx.stroke();
        });

        // Lane guides on radar
        ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(egoRadarX - 18, egoRadarY); ctx.lineTo(egoRadarX - 18, radarY + 10);
        ctx.moveTo(egoRadarX + 18, egoRadarY); ctx.lineTo(egoRadarX + 18, radarY + 10);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ego Vehicle icon
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(egoRadarX - 6, egoRadarY - 10, 12, 18);

        // Blip for each obstacle
        obstaclesRef.current.forEach((obj) => {
          const blipX = egoRadarX + (obj.lateral / 8.0) * (radarW / 2);
          const blipY = egoRadarY - (obj.z / 60.0) * (radarH - 30);
          if (blipY > radarY && blipY < egoRadarY) {
            ctx.fillStyle = obj.id === 1 && lowestTtc < 2.0 ? "#ef4444" : "#10b981";
            ctx.beginPath();
            ctx.arc(blipX, blipY, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Radar Title
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px monospace";
        ctx.fillText("BEV RADAR (60m)", radarX + 10, radarY + 16);
      }

      // 8. Forward Collision Warning HUD Alert
      if (showFcw && threatLevel !== "SAFE" && minTtc !== null) {
        const isCritical = threatLevel === "CRITICAL_BRAKE";
        ctx.fillStyle = isCritical ? "rgba(239, 68, 68, 0.85)" : "rgba(245, 158, 11, 0.85)";
        ctx.fillRect(w / 2 - 190, 24, 380, 44);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - 190, 24, 380, 44);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        const alertText = isCritical
          ? `⚠️ EMERGENCY BRAKE ENGAGED! TTC: ${minTtc.toFixed(1)}s`
          : `⚠️ FORWARD COLLISION WARNING: TTC: ${minTtc.toFixed(1)}s`;
        ctx.fillText(alertText, w / 2, 52);
        ctx.textAlign = "left"; // reset
      }

      // Loop
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, scenario, egoSpeedKmh, showYolo, showByteTrack, showLanes, showDepth, show3dDistance, showFcw, showBevRadar, threatLevel, minTtc]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      {/* Header & Scenario Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              Real-Time Vision Perception Stream
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Running TensorRT FP16 Accelerated Pipeline • 1280x720 RGB @ 119 FPS
          </p>
        </div>

        {/* Scenario Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setScenario(sc.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                scenario === sc.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {sc.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video shadow-inner">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-cover"
        />

        {/* HUD Telemetry Overlay (Top-Left) */}
        <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-lg p-3 text-xs font-mono space-y-1.5 shadow-xl text-slate-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">FPS / Latency:</span>
            <span className="text-emerald-400 font-bold">{fps} FPS (8.4ms)</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Ego Speed:</span>
            <span className="text-blue-400 font-bold">{egoSpeedKmh} km/h</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Lane Curvature:</span>
            <span className="text-cyan-400 font-bold">{curvatureRadius} m</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Lateral Offset:</span>
            <span className={`font-bold ${Math.abs(lateralOffset) > 0.4 ? "text-red-400" : "text-slate-200"}`}>
              {lateralOffset > 0 ? `+${lateralOffset}` : lateralOffset} m
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1.5">
            <span className="text-slate-400">AEB Status:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              threatLevel === "CRITICAL_BRAKE"
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : threatLevel === "CAUTION"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}>
              {threatLevel}
            </span>
          </div>
        </div>

        {/* Bottom Playback Control Bar */}
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { tickRef.current = 0; }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset Scenario"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Scenario: <strong className="text-slate-200">{SCENARIOS.find(s => s.id === scenario)?.weather}</strong>
            </span>
          </div>

          {/* Ego Speed Slider */}
          <div className="flex items-center gap-3">
            <Gauge className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 whitespace-nowrap">Speed:</span>
            <input
              type="range"
              min="30"
              max="130"
              value={egoSpeedKmh}
              onChange={(e) => setEgoSpeedKmh(Number(e.target.value))}
              className="w-24 sm:w-36 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-200 w-12 text-right">{egoSpeedKmh} km/h</span>
          </div>
        </div>
      </div>

      {/* Perception Stack Layer Toggle Pills */}
      <div className="mt-6">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          Active Vision Pipeline Layers
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          <button
            onClick={() => setShowYolo(!showYolo)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              showYolo
                ? "bg-blue-950/60 border-blue-500/50 text-blue-300 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>YOLO 2D Boxes</span>
            <span className={`w-2 h-2 rounded-full ${showYolo ? "bg-blue-400" : "bg-slate-700"}`} />
          </button>

          <button
            onClick={() => setShowByteTrack(!showByteTrack)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              showByteTrack
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>ByteTrack IDs</span>
            <span className={`w-2 h-2 rounded-full ${showByteTrack ? "bg-emerald-400" : "bg-slate-700"}`} />
          </button>

          <button
            onClick={() => setShowLanes(!showLanes)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              showLanes
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>OpenCV Lanes</span>
            <span className={`w-2 h-2 rounded-full ${showLanes ? "bg-amber-400" : "bg-slate-700"}`} />
          </button>

          <button
            onClick={() => setShowDepth(!showDepth)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              showDepth
                ? "bg-purple-950/60 border-purple-500/50 text-purple-300 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>MiDaS Depth</span>
            <span className={`w-2 h-2 rounded-full ${showDepth ? "bg-purple-400" : "bg-slate-700"}`} />
          </button>

          <button
            onClick={() => setShow3dDistance(!show3dDistance)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              show3dDistance
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>3D Metrics (Z,X)</span>
            <span className={`w-2 h-2 rounded-full ${show3dDistance ? "bg-cyan-400" : "bg-slate-700"}`} />
          </button>

          <button
            onClick={() => setShowFcw(!showFcw)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              showFcw
                ? "bg-red-950/60 border-red-500/50 text-red-300 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>FCW / TTC</span>
            <span className={`w-2 h-2 rounded-full ${showFcw ? "bg-red-400" : "bg-slate-700"}`} />
          </button>

          <button
            onClick={() => setShowBevRadar(!showBevRadar)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              showBevRadar
                ? "bg-indigo-950/60 border-indigo-500/50 text-indigo-300 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>BEV Radar</span>
            <span className={`w-2 h-2 rounded-full ${showBevRadar ? "bg-indigo-400" : "bg-slate-700"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

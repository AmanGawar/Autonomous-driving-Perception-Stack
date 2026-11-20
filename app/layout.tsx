import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autonomous Driving Perception Stack | CARLA & ROS 2",
  description: "Production-grade autonomous vehicle perception pipeline with YOLOv8, ByteTrack, Dual Lane Detection, MiDaS Depth, TensorRT, and ROS 2.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}

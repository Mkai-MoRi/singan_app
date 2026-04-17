import type { Metadata } from "next";
import CameraPageClient from "./camera-page-client";

export const metadata: Metadata = {
  title: "SINGAN // 観測カメラ",
};

export default function CameraPage() {
  return <CameraPageClient />;
}

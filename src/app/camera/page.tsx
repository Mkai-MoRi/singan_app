import type { Metadata } from "next";
import CameraPageClient from "./camera-page-client";

export const metadata: Metadata = {
  title: "SINGAN // 観測カメラ",
};

export default function CameraPage() {
  return (
    <div className="flex min-h-0 min-h-full flex-1 basis-0 flex-col">
      <CameraPageClient />
    </div>
  );
}

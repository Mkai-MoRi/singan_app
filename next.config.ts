import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // スマホの LAN IP から dev の /_next 等へアクセスするときの許可（Next.js 16 の開発時 CSRF 対策）
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "127.0.0.1",
  ],
};

export default nextConfig;

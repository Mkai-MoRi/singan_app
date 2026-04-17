import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import AppChrome from "@/components/AppChrome";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "optional",
});

export const metadata: Metadata = {
  title: "SINGAN // 贋作鑑定端末",
  description: "作品の真贋を記録する観測端末",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full`}>
      <head>
        {/* Material Symbols は next/font 未対応のため CDN 経由（アイコンのみ） */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0..1,0&display=swap"
        />
        {/* フェーズ完了演出の漢字タイトル用（next/font 外で日本語グリフを確実に） */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@700;900&display=swap"
        />
      </head>
      <body className="relative flex h-dvh min-h-0 flex-col">
        <div className="noise-overlay" aria-hidden="true" />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  readAppraisalDeadlineMs,
  readAppraisalSessionStartMs,
  APPRAISAL_URGENT_REMAIN_FRACTION,
  APPRAISAL_URGENT_REMAIN_MAX_SEC,
} from "@/lib/appraisalSessionConfig";

function formatRemain(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** canvas に HUD（タイマーバー＋テキスト）を描画 */
function drawHudOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  deadline: number,
  sessionStart: number,
  now: number
) {
  const totalMs = Math.max(1, deadline - sessionStart);
  const remainMs = Math.max(0, deadline - now);
  const remainSec = remainMs / 1000;
  const elapsedMs = Math.min(totalMs, Math.max(0, now - sessionStart));
  const fillRatio = Math.min(1, elapsedMs / totalMs);
  const expired = remainMs <= 0;
  const urgentCap = Math.min(
    APPRAISAL_URGENT_REMAIN_MAX_SEC,
    (totalMs / 1000) * APPRAISAL_URGENT_REMAIN_FRACTION
  );
  const urgent = !expired && remainSec <= urgentCap;

  const scale = Math.max(1, w / 390);
  const hudH = 80 * scale;
  const y = h - hudH;
  const pad = 12 * scale;

  // Background
  ctx.fillStyle = "rgba(19,19,19,0.90)";
  ctx.fillRect(0, y, w, hudH);

  // Top hairline
  ctx.strokeStyle = "rgba(255,176,201,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();

  // "制限時間" label
  ctx.font = `700 ${9 * scale}px "Space Grotesk", sans-serif`;
  ctx.fillStyle = "#ffb0c9";
  ctx.textAlign = "left";
  ctx.fillText("制限時間", pad, y + 20 * scale);

  // Subtitle
  ctx.font = `${7 * scale}px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(221,191,200,0.65)";
  ctx.fillText("締切まで  バーが右端＝終了", pad, y + 33 * scale);

  // Remaining time (right-aligned)
  const timeStr = expired ? "0:00" : formatRemain(remainSec);
  ctx.font = `700 ${(urgent || expired ? 14 : 12) * scale}px "Space Mono", monospace`;
  ctx.fillStyle = expired || urgent ? "#ffb4ab" : "#ffb0c9";
  ctx.textAlign = "right";
  ctx.fillText(timeStr, w - pad, y + 30 * scale);
  ctx.textAlign = "left";

  // Bar track
  const barY = y + 46 * scale;
  const barH = 8 * scale;
  const barW = w - pad * 2;
  const radius = barH / 2;

  ctx.fillStyle = "rgba(42,42,42,0.9)";
  ctx.beginPath();
  ctx.roundRect(pad, barY, barW, barH, radius);
  ctx.fill();

  // Bar fill — interpolate --primary → --error as time runs out
  if (fillRatio > 0.001) {
    const remainFraction = expired ? 0 : Math.min(1, remainMs / totalMs);
    const heat = expired ? 1 : Math.min(1, Math.max(0, (0.18 - remainFraction) / 0.18));
    const g = Math.round(176 + (180 - 176) * heat);
    const b = Math.round(201 + (171 - 201) * heat);
    ctx.fillStyle = `rgb(255,${g},${b})`;
    ctx.beginPath();
    ctx.roundRect(pad, barY, barW * fillRatio, barH, radius);
    ctx.fill();
  }

  // Right-end marker
  ctx.strokeStyle = "#ffb0c9";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad + barW, barY - 1);
  ctx.lineTo(pad + barW, barY + barH + 1);
  ctx.stroke();
}

export default function CameraPageClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);

  // カメラ起動
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        if (!cancelled)
          setCameraError(err instanceof Error ? err.message : "カメラへのアクセスが拒否されました");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // タイマー監視
  useEffect(() => {
    function tick() {
      setDeadlineMs(readAppraisalDeadlineMs());
      setSessionStartMs(readAppraisalSessionStartMs());
      setClockMs(Date.now());
    }
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  // HUD 表示用の計算値
  const hasTimer = deadlineMs !== null && sessionStartMs !== null && clockMs !== null;
  const remainSec = hasTimer ? Math.max(0, (deadlineMs! - clockMs!) / 1000) : 0;
  const totalMs = hasTimer ? Math.max(1, deadlineMs! - sessionStartMs!) : 1;
  const elapsed = hasTimer ? Math.min(totalMs, Math.max(0, clockMs! - sessionStartMs!)) : 0;
  const fillRatio = elapsed / totalMs;
  const expired = hasTimer && remainSec <= 0;
  const urgentCap = Math.min(APPRAISAL_URGENT_REMAIN_MAX_SEC, (totalMs / 1000) * APPRAISAL_URGENT_REMAIN_FRACTION);
  const urgent = hasTimer && !expired && remainSec <= urgentCap;
  const remainFraction = hasTimer && !expired ? Math.min(1, (deadlineMs! - clockMs!) / totalMs) : 0;
  const heat = expired ? 1 : Math.min(1, Math.max(0, (0.18 - remainFraction) / 0.18));
  const barColor = `rgb(255,${Math.round(176 + 4 * heat)},${Math.round(201 - 30 * heat)})`;

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ① ビデオフレーム
    ctx.drawImage(video, 0, 0, w, h);

    // ② HUD（セッション中のみ）
    const d = readAppraisalDeadlineMs();
    const s = readAppraisalSessionStartMs();
    if (d !== null && s !== null) {
      drawHudOnCanvas(ctx, w, h, d, s, Date.now());
    }

    // ③ フラッシュ
    setFlashing(true);
    setTimeout(() => setFlashing(false), 160);

    // ④ プレビュー URL 生成
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    }, "image/png");
  }, []);

  const discard = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  if (cameraError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="material-symbols-outlined text-[32px] text-[color:var(--error)]" aria-hidden>
          no_photography
        </span>
        <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--error)]">
          カメラエラー
        </p>
        <p className="text-xs text-[color:var(--fg-muted)]">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* ── ファインダー ── */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={() => setCameraReady(true)}
          className="h-full w-full object-cover"
        />

        {/* 接続中 */}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--fg-muted)]">
              接続中…
            </p>
          </div>
        )}

        {/* コーナーマーカー */}
        {cameraReady && (
          <>
            <div className="pointer-events-none absolute top-3 left-3 h-5 w-5 border-t-2 border-l-2 border-[color:var(--primary)]/50" />
            <div className="pointer-events-none absolute top-3 right-3 h-5 w-5 border-t-2 border-r-2 border-[color:var(--primary)]/50" />
            <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-[color:var(--primary)]/50" />
            <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-[color:var(--primary)]/50" />
          </>
        )}

        {/* HUD オーバーレイ（セッション中） */}
        {hasTimer && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[color:color-mix(in_srgb,var(--hairline)_45%,transparent)] bg-[color:var(--bg)]/88 backdrop-blur-sm">
            <div className="flex items-end justify-between gap-3 px-3 pt-2.5 pb-2">
              <div>
                <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
                  制限時間
                </p>
                <p className="mt-0.5 font-mono text-[0.52rem] font-medium leading-snug text-[color:var(--fg-muted)]/90">
                  締切まで · バーが右端＝終了
                </p>
              </div>
              <div className={`flex flex-col items-end gap-0.5 ${urgent ? "appraisal-deadline-urgent-pulse" : ""}`}>
                <span className="font-mono text-[0.48rem] font-bold uppercase tracking-[0.16em] text-[color:var(--fg-muted)]">
                  残り
                </span>
                <span
                  className={`font-mono font-bold tabular-nums tracking-tight ${
                    expired || urgent
                      ? "text-[0.9rem] text-[color:var(--error)]"
                      : "text-[0.78rem] text-[color:var(--primary)]"
                  }`}
                >
                  {expired ? "0:00" : formatRemain(remainSec)}
                </span>
              </div>
            </div>
            <div className="px-3 pb-3">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--surface-high)_58%,var(--bg))]">
                <div
                  className="absolute inset-y-0 left-0 origin-left rounded-full transition-[transform] duration-200 ease-linear"
                  style={{ transform: `scaleX(${fillRatio})`, backgroundColor: barColor }}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[color:color-mix(in_srgb,var(--primary)_70%,var(--error))]" />
              </div>
            </div>
          </div>
        )}

        {/* セッション未開始バッジ */}
        {!hasTimer && cameraReady && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
            <span className="rounded-sm border border-[color:var(--surface-high)] bg-[color:var(--bg)]/70 px-2 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[color:var(--fg-muted)]/50">
              セッション未開始
            </span>
          </div>
        )}

        {/* シャッターフラッシュ */}
        {flashing && (
          <div className="pointer-events-none absolute inset-0 bg-white/60" />
        )}
      </div>

      {/* ── シャッターボタン ── */}
      <div className="flex items-center justify-center bg-[color:var(--bg)] py-5">
        <button
          type="button"
          onClick={capture}
          disabled={!cameraReady}
          aria-label="撮影"
          className="group relative h-16 w-16 rounded-full border-[3px] border-[color:var(--primary)] transition-transform active:scale-90 disabled:opacity-30"
        >
          <span className="absolute inset-[5px] rounded-full bg-[color:var(--primary)] transition-opacity group-active:opacity-60" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* ── プレビューシート ── */}
      {previewUrl && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[color:var(--bg)]">
          <div className="relative flex-1 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="撮影プレビュー"
              className="h-full w-full object-contain"
            />
            <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2">
              <span className="rounded-sm border border-[color:var(--primary)]/30 bg-[color:var(--bg)]/75 px-2 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.18em] text-[color:var(--primary)]/70">
                プレビュー
              </span>
            </div>
          </div>
          <div className="flex gap-2 border-t border-[color:var(--surface-high)] p-4">
            <button
              type="button"
              onClick={discard}
              className="flex-1 border border-[color:var(--surface-high)] bg-[color:var(--surface-low)] py-3 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--secondary)] transition-colors hover:border-[color:var(--primary)]/30"
            >
              撮り直す
            </button>
            <a
              href={previewUrl}
              download={`singan-${Date.now()}.png`}
              className="flex-1 bg-[color:var(--primary)] py-3 text-center font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--on-primary)] transition-opacity hover:opacity-90"
            >
              端末に保存
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

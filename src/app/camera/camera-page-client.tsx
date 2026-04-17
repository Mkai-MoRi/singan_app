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

// Chrome 99+ / Safari 15.4+ / Firefox 112+ 未満向けフォールバック
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** 撮影画像にスキャナー風オーバーレイを合成 */
function drawAppraisalOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  active: boolean
) {
  const scale = Math.max(1, w / 390);
  const pad = 14 * scale;

  // ビネット
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.50)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // 上部グラデーション
  const topGrad = ctx.createLinearGradient(0, 0, 0, 52 * scale);
  topGrad.addColorStop(0, "rgba(0,0,0,0.60)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, 52 * scale);

  // SINGAN ラベル（左）
  ctx.font = `700 ${8 * scale}px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(255,176,201,0.85)";
  ctx.textAlign = "left";
  ctx.fillText("SINGAN", pad, 18 * scale);

  // ステータス（右）
  ctx.textAlign = "right";
  ctx.fillStyle = active ? "rgba(255,176,201,0.80)" : "rgba(180,180,180,0.35)";
  ctx.fillText(active ? "鑑定中" : "STANDBY", w - pad, 18 * scale);
  ctx.textAlign = "left";

  // コーナーマーカー
  const cs = 20 * scale;
  const cp = 18 * scale;
  ctx.strokeStyle = active ? "rgba(255,176,201,0.65)" : "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2 * scale;
  const corners: [number, number, number, number][] = [
    [cp, cp, cp + cs, cp],           // TL horizontal
    [cp, cp, cp, cp + cs],           // TL vertical
    [w - cp - cs, cp, w - cp, cp],   // TR horizontal
    [w - cp, cp, w - cp, cp + cs],   // TR vertical
    [cp, h - cp, cp + cs, h - cp],   // BL horizontal
    [cp, h - cp - cs, cp, h - cp],   // BL vertical
    [w - cp - cs, h - cp, w - cp, h - cp], // BR horizontal
    [w - cp, h - cp - cs, w - cp, h - cp], // BR vertical
  ];
  corners.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });

  // 中央ターゲット枠
  const tx = w * 0.14;
  const tw = w * 0.72;
  const th = tw * (4 / 3);
  const ty = (h - th) / 2;
  ctx.strokeStyle = active ? "rgba(255,176,201,0.25)" : "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(tx, ty, tw, th);

  // 中央ラベル（ターゲット枠内 下部）
  ctx.font = `${6.5 * scale}px "Space Mono", monospace`;
  ctx.fillStyle = active ? "rgba(255,176,201,0.55)" : "rgba(255,255,255,0.20)";
  ctx.textAlign = "center";
  ctx.fillText(active ? "鑑定中 · ANALYZING" : "STANDBY", w / 2, ty + th - 10 * scale);
  ctx.textAlign = "left";
}

/** canvas にタイマーHUDを描画 */
function drawTimerHud(
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
  const urgentCap = Math.min(APPRAISAL_URGENT_REMAIN_MAX_SEC, (totalMs / 1000) * APPRAISAL_URGENT_REMAIN_FRACTION);
  const urgent = !expired && remainSec <= urgentCap;

  const scale = Math.max(1, w / 390);
  const hudH = 80 * scale;
  const y = h - hudH;
  const pad = 12 * scale;

  ctx.fillStyle = "rgba(19,19,19,0.90)";
  ctx.fillRect(0, y, w, hudH);

  ctx.strokeStyle = "rgba(255,176,201,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();

  ctx.font = `700 ${9 * scale}px "Space Grotesk", sans-serif`;
  ctx.fillStyle = "#ffb0c9";
  ctx.textAlign = "left";
  ctx.fillText("制限時間", pad, y + 20 * scale);

  ctx.font = `${7 * scale}px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(221,191,200,0.65)";
  ctx.fillText("締切まで  バーが右端＝終了", pad, y + 33 * scale);

  const timeStr = expired ? "0:00" : formatRemain(remainSec);
  ctx.font = `700 ${(urgent || expired ? 14 : 12) * scale}px "Space Mono", monospace`;
  ctx.fillStyle = expired || urgent ? "#ffb4ab" : "#ffb0c9";
  ctx.textAlign = "right";
  ctx.fillText(timeStr, w - pad, y + 30 * scale);
  ctx.textAlign = "left";

  const barY = y + 46 * scale;
  const barH = 8 * scale;
  const barW = w - pad * 2;
  const radius = barH / 2;

  ctx.fillStyle = "rgba(42,42,42,0.9)";
  ctx.beginPath();
  roundRectPath(ctx, pad, barY, barW, barH, radius);
  ctx.fill();

  if (fillRatio > 0.001) {
    const remainFraction = expired ? 0 : Math.min(1, remainMs / totalMs);
    const heat = expired ? 1 : Math.min(1, Math.max(0, (0.18 - remainFraction) / 0.18));
    ctx.fillStyle = `rgb(255,${Math.round(176 + 4 * heat)},${Math.round(201 - 30 * heat)})`;
    ctx.beginPath();
    roundRectPath(ctx, pad, barY, barW * fillRatio, barH, radius);
    ctx.fill();
  }

  ctx.strokeStyle = "#ffb0c9";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad + barW, barY - 1);
  ctx.lineTo(pad + barW, barY + barH + 1);
  ctx.stroke();
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "カメラへのアクセスが許可されていません。設定からカメラ権限を許可してください。";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "カメラが見つかりません。カメラが接続されているか確認してください。";
    case "NotReadableError":
    case "TrackStartError":
      return "カメラが他のアプリで使用中です。他のアプリを閉じて再度お試しください。";
    case "SecurityError":
      return "セキュリティエラーです。HTTPS 環境でアクセスしてください。";
    case "TypeError":
      return "このブラウザはカメラに対応していません。最新のブラウザをご使用ください。";
    default:
      return "カメラの起動に失敗しました。ブラウザを再起動してお試しください。";
  }
}

export default function CameraPageClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    function startStream(constraints: MediaStreamConstraints, fallback = false) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            cameraTimeoutRef.current = setTimeout(() => {
              if (!cancelled) setCameraError("カメラの映像が取得できませんでした。ブラウザを再起動してお試しください。");
            }, 15000);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (
            !fallback &&
            err instanceof DOMException &&
            (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError")
          ) {
            startStream({ video: true, audio: false }, true);
            return;
          }
          setCameraError(cameraErrorMessage(err));
        });
    }

    startStream({ video: { facingMode: { ideal: "environment" } }, audio: false });

    return () => {
      cancelled = true;
      if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // フラッシュタイマーのアンマウント時クリーンアップ
  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // プレビュー URL のアンマウント時クリーンアップ
  useEffect(() => {
    return () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
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
    if (!ctx) {
      setCameraError("撮影処理に失敗しました（Canvas が使用できません）。ブラウザを再起動してお試しください。");
      return;
    }

    // ① ビデオフレーム
    ctx.drawImage(video, 0, 0, w, h);

    // ② スキャナーオーバーレイ合成
    const d = readAppraisalDeadlineMs();
    const s = readAppraisalSessionStartMs();
    drawAppraisalOverlay(ctx, w, h, d !== null && s !== null);
    if (d !== null && s !== null) {
      drawTimerHud(ctx, w, h, d, s, Date.now());
    }

    // ③ プレビュー URL 生成（成功時にのみフラッシュ）
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("画像の生成に失敗しました。もう一度シャッターを押してください。");
        return;
      }
      let objectUrl: string;
      try {
        objectUrl = URL.createObjectURL(blob);
      } catch {
        setCameraError("画像の表示に失敗しました。もう一度シャッターを押してください。");
        return;
      }
      setFlashing(true);
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashing(false), 160);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    }, "image/png");
  }, []);

  const discard = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  // Web Share API で写真フォルダに保存（非対応ならダウンロード）
  const saveImage = useCallback(async () => {
    if (!previewUrl) return;
    const filename = `singan-${Date.now()}.png`;
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Share 失敗 → フォールバック
    }
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [previewUrl]);

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
    <>
      {/* スキャンライン CSS アニメーション */}
      <style>{`
        @keyframes singan-scan {
          0%   { top: 2%; }
          50%  { top: 92%; }
          100% { top: 2%; }
        }
        .singan-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          animation: singan-scan 4s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex h-full flex-col overflow-hidden bg-black">
        {/* ── ファインダー ── */}
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => {
              if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
              setCameraReady(true);
            }}
            onError={() => setCameraError("カメラの映像を取得できませんでした。ブラウザを再起動してお試しください。")}
            className="h-full w-full object-cover"
          />

          {/* 接続中 */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--fg-muted)]">
                接続中…
              </p>
            </div>
          )}

          {/* ── 鑑定スキャナーオーバーレイ（カメラ映像の上） ── */}
          {cameraReady && (
            <div className="pointer-events-none absolute inset-0">

              {/* ビネット */}
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.48) 100%)" }}
              />

              {/* 上部グラデーション＋ヘッダー */}
              <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/60 to-transparent flex items-start justify-between px-3.5 pt-2.5">
                <span className="font-mono text-[0.52rem] font-bold uppercase tracking-[0.22em] text-[color:var(--primary)]/85">
                  SINGAN
                </span>
                <span
                  className={`font-mono text-[0.52rem] font-bold uppercase tracking-[0.18em] ${
                    hasTimer ? "text-[color:var(--primary)]/85" : "text-white/25"
                  }`}
                >
                  {hasTimer ? "鑑定中" : "STANDBY"}
                </span>
              </div>

              {/* センタースキャンゾーン */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-[72%] aspect-[3/4] max-h-[58%]">

                  {/* ターゲット外枠 */}
                  <div
                    className={`absolute inset-0 border ${
                      hasTimer ? "border-[color:var(--primary)]/30" : "border-white/12"
                    }`}
                  />

                  {/* 四隅コーナーマーカー */}
                  <div className={`absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 ${hasTimer ? "border-[color:var(--primary)]/75" : "border-white/30"}`} />
                  <div className={`absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 ${hasTimer ? "border-[color:var(--primary)]/75" : "border-white/30"}`} />
                  <div className={`absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 ${hasTimer ? "border-[color:var(--primary)]/75" : "border-white/30"}`} />
                  <div className={`absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 ${hasTimer ? "border-[color:var(--primary)]/75" : "border-white/30"}`} />

                  {/* スキャンライン */}
                  <div className="absolute inset-x-0 overflow-hidden" style={{ top: "4%", bottom: "4%" }}>
                    <div
                      className="singan-scan-line"
                      style={{
                        background: hasTimer
                          ? "linear-gradient(to right, transparent, rgba(255,176,201,0.75) 30%, rgba(255,176,201,0.75) 70%, transparent)"
                          : "linear-gradient(to right, transparent, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.25) 70%, transparent)",
                        boxShadow: hasTimer ? "0 0 10px 2px rgba(255,176,201,0.35)" : "none",
                      }}
                    />
                  </div>

                  {/* 中央クロスヘア */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`relative h-5 w-5 ${hasTimer ? "opacity-40" : "opacity-15"}`}>
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[color:var(--primary)]" />
                      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[color:var(--primary)]" />
                    </div>
                  </div>

                  {/* ターゲット枠内 下部ラベル */}
                  <div className="absolute inset-x-0 bottom-2 flex justify-center">
                    <span
                      className={`font-mono text-[0.42rem] uppercase tracking-[0.18em] ${
                        hasTimer ? "text-[color:var(--primary)]/55" : "text-white/22"
                      }`}
                    >
                      {hasTimer ? "鑑定中 · ANALYZING" : "SESSION NOT STARTED"}
                    </span>
                  </div>
                </div>
              </div>

              {/* タイマーHUD（セッション中） */}
              {hasTimer && (
                <div className="absolute inset-x-0 bottom-0 border-t border-[color:color-mix(in_srgb,var(--primary)_18%,transparent)] bg-black/78 backdrop-blur-sm">
                  <div className="flex items-end justify-between gap-3 px-3 pt-2.5 pb-2">
                    <div>
                      <p className="font-mono text-[0.54rem] font-bold uppercase tracking-[0.16em] text-[color:var(--primary)]">
                        制限時間
                      </p>
                      <p className="mt-0.5 font-mono text-[0.48rem] leading-snug text-[color:var(--fg-muted)]/75">
                        締切まで · バーが右端＝終了
                      </p>
                    </div>
                    <div className={`flex flex-col items-end gap-0.5 ${urgent ? "appraisal-deadline-urgent-pulse" : ""}`}>
                      <span className="font-mono text-[0.44rem] font-bold uppercase tracking-[0.14em] text-[color:var(--fg-muted)]/70">
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
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/8">
                      <div
                        className="absolute inset-y-0 left-0 origin-left rounded-full transition-[transform] duration-200 ease-linear"
                        style={{ transform: `scaleX(${fillRatio})`, backgroundColor: barColor }}
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[color:color-mix(in_srgb,var(--primary)_70%,var(--error))]" />
                    </div>
                  </div>
                </div>
              )}

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
              <button
                type="button"
                onClick={saveImage}
                className="flex-1 bg-[color:var(--primary)] py-3 text-center font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--on-primary)] transition-opacity hover:opacity-90"
              >
                写真に保存
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

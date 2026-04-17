"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  readAppraisalDeadlineMs,
  readAppraisalSessionStartMs,
  APPRAISAL_URGENT_REMAIN_FRACTION,
  APPRAISAL_URGENT_REMAIN_MAX_SEC,
} from "@/lib/appraisalSessionConfig";

// ── ターミナルグリーン定数 ───────────────────────────────────────────────────
const G = "#a4e400";
const G80 = "rgba(164,228,0,0.80)";
const G50 = "rgba(164,228,0,0.50)";
const G25 = "rgba(164,228,0,0.25)";

// ── ユーティリティ ──────────────────────────────────────────────────────────

function formatRemain(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatTimecode(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:00`;
}

// Chrome 99+ / Safari 15.4+ / Firefox 112+ 未満向けフォールバック
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  if (typeof ctx.roundRect === "function") { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── canvas オーバーレイ描画 ─────────────────────────────────────────────────

function drawAppraisalOverlay(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  active: boolean
) {
  const sc = Math.max(1, w / 390);
  const pad = 14 * sc;

  // ビネット
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // 上部グラデーション
  const topG = ctx.createLinearGradient(0, 0, 0, 56 * sc);
  topG.addColorStop(0, "rgba(0,0,0,0.65)");
  topG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topG;
  ctx.fillRect(0, 0, w, 56 * sc);

  // ヘッダーテキスト
  ctx.font = `700 ${7.5 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = G80;
  ctx.textAlign = "left";
  ctx.fillText("DIAGNOSTIC_TERMINAL_V1.0", pad, 17 * sc);
  ctx.textAlign = "right";
  ctx.fillStyle = active ? G80 : "rgba(164,228,0,0.30)";
  ctx.fillText(active ? "鑑定中 · ANALYZING" : "STANDBY", w - pad, 17 * sc);
  ctx.textAlign = "left";

  // コーナーマーカー（4隅）
  const cs = 18 * sc;
  const cp = 20 * sc;
  ctx.strokeStyle = active ? "rgba(164,228,0,0.70)" : "rgba(164,228,0,0.25)";
  ctx.lineWidth = 2 * sc;
  [
    [cp, cp + cs, cp, cp, cp + cs, cp],
    [w - cp - cs, cp, w - cp, cp, w - cp, cp + cs],
    [cp, h - cp - cs, cp, h - cp, cp + cs, h - cp],
    [w - cp - cs, h - cp, w - cp, h - cp, w - cp, h - cp - cs],
  ].forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
  });

  // センタースキャン枠
  const tx = w * 0.14, tw = w * 0.72, th = tw * (4 / 3), ty = (h - th) / 2;
  ctx.strokeStyle = active ? G25 : "rgba(164,228,0,0.10)";
  ctx.lineWidth = 1;
  ctx.strokeRect(tx, ty, tw, th);

  // 下部ラベル（枠内）
  ctx.font = `${6 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = active ? "rgba(164,228,0,0.55)" : "rgba(164,228,0,0.18)";
  ctx.textAlign = "center";
  ctx.fillText(active ? "鑑定中 · ANALYZING" : "STANDBY", w / 2, ty + th - 8 * sc);
  ctx.textAlign = "left";
}

function drawTimerHud(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  deadline: number, sessionStart: number, now: number
) {
  const totalMs = Math.max(1, deadline - sessionStart);
  const remainMs = Math.max(0, deadline - now);
  const remainSec = remainMs / 1000;
  const fillRatio = Math.min(1, Math.min(totalMs, Math.max(0, now - sessionStart)) / totalMs);
  const expired = remainMs <= 0;
  const urgentCap = Math.min(APPRAISAL_URGENT_REMAIN_MAX_SEC, (totalMs / 1000) * APPRAISAL_URGENT_REMAIN_FRACTION);
  const urgent = !expired && remainSec <= urgentCap;

  const sc = Math.max(1, w / 390);
  const hudH = 80 * sc;
  const y = h - hudH;
  const pad = 12 * sc;

  ctx.fillStyle = "rgba(10,18,0,0.90)";
  ctx.fillRect(0, y, w, hudH);

  ctx.strokeStyle = G25;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();

  ctx.font = `700 ${9 * sc}px "Space Grotesk", sans-serif`;
  ctx.fillStyle = G;
  ctx.textAlign = "left";
  ctx.fillText("制限時間", pad, y + 20 * sc);

  ctx.font = `${7 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(164,228,0,0.55)";
  ctx.fillText("締切まで · バーが右端＝終了", pad, y + 33 * sc);

  ctx.font = `700 ${(urgent || expired ? 14 : 12) * sc}px "Space Mono", monospace`;
  ctx.fillStyle = expired || urgent ? "#ff4444" : G;
  ctx.textAlign = "right";
  ctx.fillText(expired ? "0:00" : formatRemain(remainSec), w - pad, y + 30 * sc);
  ctx.textAlign = "left";

  const barY = y + 46 * sc, barH = 8 * sc, barW = w - pad * 2, radius = barH / 2;
  ctx.fillStyle = "rgba(20,40,0,0.9)";
  ctx.beginPath(); roundRectPath(ctx, pad, barY, barW, barH, radius); ctx.fill();

  if (fillRatio > 0.001) {
    const heat = expired ? 1 : Math.min(1, Math.max(0, (0.18 - (expired ? 0 : Math.min(1, remainMs / totalMs))) / 0.18));
    ctx.fillStyle = `rgb(${Math.round(164 + 91 * heat)},${Math.round(228 - 228 * heat)},0)`;
    ctx.beginPath(); roundRectPath(ctx, pad, barY, barW * fillRatio, barH, radius); ctx.fill();
  }

  ctx.strokeStyle = G50;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad + barW, barY - 1); ctx.lineTo(pad + barW, barY + barH + 1); ctx.stroke();
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

// ── メインコンポーネント ────────────────────────────────────────────────────

export default function CameraPageClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const isMountedRef = useRef(true);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [recording, setRecording] = useState(false);
  const [recordSetupError, setRecordSetupError] = useState<string | null>(null);
  const [finderStartMs, setFinderStartMs] = useState<number | null>(null);

  // カメラ起動
  useEffect(() => {
    let cancelled = false;
    isMountedRef.current = true;

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
          // torch サポート確認
          const track = stream.getVideoTracks()[0];
          const caps = track?.getCapabilities() as Record<string, unknown> | undefined;
          if (caps?.torch) setTorchSupported(true);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (!fallback && err instanceof DOMException &&
            (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError")) {
            startStream({ video: true, audio: false }, true);
            return;
          }
          setCameraError(cameraErrorMessage(err));
        });
    }

    startStream({ video: { facingMode: { ideal: "environment" } }, audio: false });

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // フラッシュタイマー cleanup
  useEffect(() => () => {
    if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
  }, []);

  // プレビュー URL cleanup
  useEffect(() => () => {
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, []);

  // タイマー監視 (250ms)
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

  // HUD 計算値
  const hasTimer = deadlineMs !== null && sessionStartMs !== null && clockMs !== null;
  const remainSec = hasTimer ? Math.max(0, (deadlineMs! - clockMs!) / 1000) : 0;
  const totalMsDerived = hasTimer ? Math.max(1, deadlineMs! - sessionStartMs!) : 1;
  const elapsedMs = hasTimer ? Math.min(totalMsDerived, Math.max(0, clockMs! - sessionStartMs!)) : 0;
  const fillRatio = elapsedMs / totalMsDerived;
  const expired = hasTimer && remainSec <= 0;
  const urgentCap = Math.min(APPRAISAL_URGENT_REMAIN_MAX_SEC, (totalMsDerived / 1000) * APPRAISAL_URGENT_REMAIN_FRACTION);
  const urgent = hasTimer && !expired && remainSec <= urgentCap;

  // タイムコード（カメラ起動からの経過秒）
  const elapsedSec =
    cameraReady && finderStartMs !== null && clockMs !== null
      ? Math.floor((clockMs - finderStartMs) / 1000)
      : 0;

  // ── コールバック ──────────────────────────────────────────────────────────

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    const w = video.videoWidth, h = video.videoHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("撮影処理に失敗しました（Canvas が使用できません）。ブラウザを再起動してお試しください。");
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    const d = readAppraisalDeadlineMs();
    const s = readAppraisalSessionStartMs();
    drawAppraisalOverlay(ctx, w, h, d !== null && s !== null);
    if (d !== null && s !== null) drawTimerHud(ctx, w, h, d, s, Date.now());

    canvas.toBlob((blob) => {
      if (!blob) { setCameraError("画像の生成に失敗しました。もう一度シャッターを押してください。"); return; }
      let objectUrl: string;
      try { objectUrl = URL.createObjectURL(blob); }
      catch { setCameraError("画像の表示に失敗しました。もう一度シャッターを押してください。"); return; }
      setFlashing(true);
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashing(false), 160);
      setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return objectUrl; });
    }, "image/png");
  }, []);

  const discard = useCallback(() => {
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, []);

  const saveImage = useCallback(async () => {
    if (!previewUrl) return;
    const filename = `singan-${Date.now()}.png`;
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = previewUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [previewUrl]);

  const toggleTorch = useCallback(async () => {
    if (!torchSupported) return;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const newVal = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: newVal } as MediaTrackConstraintSet] });
      setTorchOn(newVal);
    } catch { /* デバイス非対応 */ }
  }, [torchOn, torchSupported]);

  const toggleZoom = useCallback(async () => {
    const newZoom = zoomLevel === 1 ? 2 : 1;
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: newZoom } as MediaTrackConstraintSet] });
        if (videoRef.current) {
          videoRef.current.style.transformOrigin = "center center";
          videoRef.current.style.transform = "";
        }
      } catch {
        // ハードウェアズーム非対応 → CSS ズームでフォールバック
        const v = videoRef.current;
        if (v) {
          v.style.transformOrigin = "center center";
          v.style.transform = newZoom === 2 ? "scale(2)" : "";
        }
      }
    }
    setZoomLevel(newZoom);
  }, [zoomLevel]);

  const toggleRecording = useCallback(() => {
    if (!streamRef.current) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const mimeType =
      MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" :
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" :
      "video/webm";
    setRecordSetupError(null);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType });
    } catch {
      setRecordSetupError("この環境では録画を開始できません。");
      return;
    }
    recordingChunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
    recorder.onstop = () => {
      if (!isMountedRef.current) {
        recordingChunksRef.current = [];
        return;
      }
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      recordingChunksRef.current = [];
      const url = URL.createObjectURL(blob);
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      const a = document.createElement("a");
      a.href = url; a.download = `singan-rec-${Date.now()}.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }, [recording]);

  // ── エラー画面 ────────────────────────────────────────────────────────────

  if (cameraError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="material-symbols-outlined text-[32px] text-[#ff4444]" aria-hidden>no_photography</span>
        <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#ff4444]">CAMERA_ERROR</p>
        <p className="font-mono text-[0.6rem] text-[#a4e400]/60">{cameraError}</p>
      </div>
    );
  }

  // ── メイン UI ─────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes singan-scan {
          0%   { top: 2%; }
          50%  { top: 92%; }
          100% { top: 2%; }
        }
        .singan-scan-line {
          position: absolute; left: 0; right: 0; height: 1px;
          animation: singan-scan 4s ease-in-out infinite;
        }
        @keyframes singan-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .singan-spin { animation: singan-spin 10s linear infinite; }
        .singan-scanlines {
          background: linear-gradient(to bottom, transparent 50%, rgba(164,228,0,0.04) 50%);
          background-size: 100% 4px;
        }
        .singan-dot-grid {
          background-image: radial-gradient(rgba(164,228,0,0.09) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>

      <div className="relative flex h-full flex-col overflow-hidden bg-black">

        {/* ── ファインダー ────────────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay playsInline muted
            onCanPlay={() => {
              if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
              setFinderStartMs(Date.now());
              setCameraReady(true);
            }}
            onError={() => setCameraError("カメラの映像を取得できませんでした。ブラウザを再起動してお試しください。")}
            className="h-full w-full object-cover"
          />

          {/* スキャンライン + ドットグリッド */}
          <div className="singan-scanlines pointer-events-none absolute inset-0" />
          <div className="singan-dot-grid pointer-events-none absolute inset-0" />

          {/* 接続中 */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#a4e400]/60">
                INITIALIZING...
              </p>
            </div>
          )}

          {/* ── メインオーバーレイ（カメラ映像の上） ─────────────────────── */}
          {cameraReady && (
            <>
              {/* 装飾レイヤー（pointer-events-none） */}
              <div className="pointer-events-none absolute inset-0">

                {/* ビネット */}
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(0,0,0,0.55) 100%)" }} />

                {/* 上部グラデーション + ヘッダー */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/65 to-transparent" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between px-3.5 pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#a4e400]/80">terminal</span>
                    <span className="font-mono text-[0.5rem] font-bold uppercase tracking-[0.2em] text-[#a4e400]/80">
                      DIAGNOSTIC_TERMINAL_V1.0
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-0.5 font-mono text-[0.44rem] uppercase tracking-[0.14em] text-[#a4e400]/60">
                      <span className="material-symbols-outlined text-[11px]">wifi</span>5G
                    </span>
                    <span className="flex items-center gap-0.5 font-mono text-[0.44rem] uppercase tracking-[0.14em] text-[#a4e400]/60">
                      <span className="material-symbols-outlined text-[11px]">battery_charging_full</span>87%
                    </span>
                  </div>
                </div>

                {/* センタースキャンフレーム */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[68%] aspect-[3/4] max-h-[55%]">
                    {/* 外枠 */}
                    <div className="absolute inset-0 border border-[#a4e400]/25" />
                    {/* 四隅コーナー */}
                    <div className={`absolute top-0 left-0 h-5 w-5 border-t-2 border-l-2 ${hasTimer ? "border-[#a4e400]/80" : "border-[#a4e400]/30"}`} />
                    <div className={`absolute top-0 right-0 h-5 w-5 border-t-2 border-r-2 ${hasTimer ? "border-[#a4e400]/80" : "border-[#a4e400]/30"}`} />
                    <div className={`absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 ${hasTimer ? "border-[#a4e400]/80" : "border-[#a4e400]/30"}`} />
                    <div className={`absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 ${hasTimer ? "border-[#a4e400]/80" : "border-[#a4e400]/30"}`} />
                    {/* フレームデータ */}
                    <div className="absolute -top-6 left-0 font-mono text-[0.4rem] uppercase tracking-[0.18em] text-[#a4e400]/55">
                      {hasTimer ? "[SYSTEM_ACTIVE]" : "[SYSTEM_READY]"}
                    </div>
                    <div className="absolute -bottom-6 right-0 text-right font-mono text-[0.4rem] uppercase tracking-[0.14em] text-[#a4e400]/55">
                      TARGET_ID: {hasTimer ? "SESSION_MATCH" : "NO_MATCH"}<br />
                      SCAN_INTENSITY: 87%
                    </div>
                    {/* スキャンライン */}
                    <div className="absolute inset-x-0 overflow-hidden" style={{ top: "5%", bottom: "5%" }}>
                      <div
                        className="singan-scan-line"
                        style={{
                          background: `linear-gradient(to right, transparent, ${hasTimer ? "rgba(164,228,0,0.80)" : "rgba(164,228,0,0.30)"} 30%, ${hasTimer ? "rgba(164,228,0,0.80)" : "rgba(164,228,0,0.30)"} 70%, transparent)`,
                          boxShadow: hasTimer ? `0 0 12px 2px rgba(164,228,0,0.35)` : "none",
                        }}
                      />
                    </div>
                    {/* クロスヘア */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-6 w-6 opacity-40">
                        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#a4e400]" />
                        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#a4e400]" />
                      </div>
                    </div>
                    {/* 枠内下部ラベル */}
                    <div className="absolute inset-x-0 bottom-2 flex justify-center">
                      <span className={`font-mono text-[0.4rem] uppercase tracking-[0.18em] ${hasTimer ? "text-[#a4e400]/60" : "text-[#a4e400]/22"}`}>
                        {hasTimer ? "鑑定中 · ANALYZING" : "SESSION_NOT_STARTED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 下部ステータスバー */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent h-10" />
                <div className="absolute inset-x-0 bottom-1.5 flex justify-between px-3.5">
                  <div className="flex items-center gap-3 font-mono text-[0.42rem] uppercase tracking-[0.14em] text-[#a4e400]/60">
                    <span className={recording ? "text-[#ff4444] animate-pulse" : ""}>
                      {recording ? "● REC" : "REC_STDBY"}
                    </span>
                    <span>{formatTimecode(elapsedSec)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono text-[0.42rem] uppercase tracking-[0.14em] text-[#a4e400]/60">
                    <span>ISO_AUTO</span>
                    <span>f/1.8</span>
                    <span className="text-[#c7ff5c]/80">1/60</span>
                  </div>
                </div>

                {/* タイマーHUD（セッション中） */}
                {hasTimer && (
                  <div className="absolute inset-x-0 bottom-8 border-t border-[#a4e400]/20 bg-black/80 backdrop-blur-sm">
                    <div className="flex items-end justify-between gap-3 px-3 pt-2 pb-1.5">
                      <div>
                        <p className="font-mono text-[0.52rem] font-bold uppercase tracking-[0.18em] text-[#a4e400]">制限時間</p>
                        <p className="mt-0.5 font-mono text-[0.44rem] text-[#a4e400]/55">締切まで · バーが右端＝終了</p>
                      </div>
                      <div className={`flex flex-col items-end gap-0.5 ${urgent ? "appraisal-deadline-urgent-pulse" : ""}`}>
                        <span className="font-mono text-[0.4rem] font-bold uppercase tracking-[0.14em] text-[#a4e400]/60">残り</span>
                        <span className={`font-mono font-bold tabular-nums tracking-tight ${expired || urgent ? "text-[0.9rem] text-[#ff4444]" : "text-[0.78rem] text-[#a4e400]"}`}>
                          {expired ? "0:00" : formatRemain(remainSec)}
                        </span>
                      </div>
                    </div>
                    <div className="px-3 pb-2.5">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#a4e400]/10">
                        <div
                          className="absolute inset-y-0 left-0 origin-left rounded-full transition-[transform] duration-200 ease-linear"
                          style={{
                            transform: `scaleX(${fillRatio})`,
                            backgroundColor: expired || urgent ? "#ff4444" : G,
                          }}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[#a4e400]/60" />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* 左パネル: TELEMETRY + フラッシュライト */}
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
                {/* TELEMETRY */}
                <div className="border-l-2 border-[#a4e400]/40 bg-black/55 px-2.5 py-2 backdrop-blur-sm">
                  <p className="mb-1.5 font-mono text-[0.38rem] uppercase tracking-[0.18em] text-[#a4e400]/50">TELEMETRY_DATA</p>
                  {[["ALT", "104.2m"], ["VEL", "0.00 m/s"], ["TMP", "24.5°C"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 font-mono text-[0.52rem] text-[#a4e400]">
                      <span>{k}:</span><span>{v}</span>
                    </div>
                  ))}
                </div>
                {/* フラッシュライト */}
                <button
                  type="button"
                  disabled={!torchSupported}
                  onClick={toggleTorch}
                  className={`flex h-10 w-10 items-center justify-center transition-all active:scale-90 disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed ${torchOn ? "bg-[#a4e400] text-black" : "bg-black/55 text-[#a4e400] border border-[#a4e400]/30"}`}
                  aria-label={torchSupported ? (torchOn ? "フラッシュオフ" : "フラッシュオン") : "この端末ではライトに未対応"}
                >
                  <span className="material-symbols-outlined text-[18px]">flashlight_on</span>
                </button>
                <p className="text-center font-mono text-[0.36rem] uppercase tracking-[0.14em] text-[#a4e400]/45">
                  FLASH
                </p>
              </div>

              {/* 右パネル: ズーム + REC */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
                {/* ズーム */}
                <button
                  type="button"
                  onClick={toggleZoom}
                  className={`flex h-10 w-10 items-center justify-center transition-all active:scale-90 ${zoomLevel === 2 ? "bg-[#a4e400] text-black" : "bg-black/55 text-[#a4e400] border border-[#a4e400]/30"}`}
                  aria-label={zoomLevel === 1 ? "2倍ズーム" : "1倍に戻す"}
                >
                  <span className="material-symbols-outlined text-[18px]">{zoomLevel === 1 ? "zoom_in" : "zoom_out"}</span>
                </button>
                <p className="text-center font-mono text-[0.36rem] uppercase tracking-[0.14em] text-[#a4e400]/45">
                  {zoomLevel}x ZOOM
                </p>

                {/* RECORD */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex h-10 w-10 items-center justify-center border transition-all active:scale-90 ${recording ? "border-[#ff4444]/40 bg-[#93000a]" : "border-[#ff4444]/25 bg-black/55"}`}
                  aria-label={recording ? "録画停止" : "録画開始"}
                >
                  <span
                    className="material-symbols-outlined text-[18px] text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {recording ? "stop_circle" : "fiber_manual_record"}
                  </span>
                </button>
                <p className="text-center font-mono text-[0.36rem] uppercase tracking-[0.14em] text-[#a4e400]/45">
                  {recording ? "STOP" : "RECORD"}
                </p>
                {recordSetupError && (
                  <p className="max-w-[5.5rem] text-center font-mono text-[0.32rem] leading-snug text-[#ff4444]/90">
                    {recordSetupError}
                  </p>
                )}
              </div>
            </>
          )}

          {/* シャッターフラッシュ */}
          {flashing && <div className="pointer-events-none absolute inset-0 bg-white/65" />}
        </div>

        {/* ── シャッターボタン ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-center bg-black py-4">
          <div className="relative">
            {/* 外側のゆっくり回転するリング */}
            <div
              className="singan-spin pointer-events-none absolute inset-[-12px] rounded-full border border-[#a4e400]/15"
              aria-hidden
            />
            <button
              type="button"
              onClick={capture}
              disabled={!cameraReady}
              aria-label="撮影"
              className="group relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#a4e400]/35 transition-transform active:scale-90 disabled:opacity-30"
            >
              {/* グローイングインナー */}
              <div
                className="absolute inset-1.5 rounded-full transition-opacity group-active:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #a4e400, #c7ff5c)",
                  boxShadow: "0 0 28px rgba(164,228,0,0.45)",
                }}
              />
              {/* カメラアイコン */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-black/20">
                <span className="material-symbols-outlined text-[28px] text-black/80">photo_camera</span>
              </div>
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* ── プレビューシート ─────────────────────────────────────────────── */}
        {previewUrl && (
          <div className="absolute inset-0 z-50 flex flex-col bg-black">
            <div className="relative flex-1 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="撮影プレビュー" className="h-full w-full object-contain" />
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2">
                <span className="border border-[#a4e400]/30 bg-black/75 px-2 py-0.5 font-mono text-[0.44rem] uppercase tracking-[0.18em] text-[#a4e400]/70">
                  PREVIEW
                </span>
              </div>
            </div>
            <div className="flex gap-2 border-t border-[#a4e400]/20 bg-black p-3">
              <button
                type="button"
                onClick={discard}
                className="flex-1 border border-[#a4e400]/25 bg-black py-3 font-mono text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#a4e400]/60 transition-colors hover:border-[#a4e400]/50"
              >
                撮り直す
              </button>
              <button
                type="button"
                onClick={saveImage}
                className="flex-1 py-3 text-center font-mono text-[0.58rem] font-bold uppercase tracking-[0.14em] text-black transition-opacity hover:opacity-85"
                style={{ background: "linear-gradient(135deg, #a4e400, #c7ff5c)" }}
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

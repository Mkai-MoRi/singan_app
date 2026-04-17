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

// ── canvas オーバーレイ描画（保存画像＝画面上のファインダーHUDに揃える） ───────

function drawScanlinePattern(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = 4;
  ctx.fillStyle = "rgba(164,228,0,0.035)";
  for (let y = 0; y < h; y += step * 2) {
    ctx.fillRect(0, y + step, w, step);
  }
}

function drawDotGridPattern(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = Math.max(22, Math.floor(Math.sqrt((w * h) / 1400)));
  ctx.fillStyle = "rgba(164,228,0,0.09)";
  for (let x = 0; x < w; x += g) {
    for (let y = 0; y < h; y += g) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 画面 UI（w-[68%] aspect-[3/4] max-h-[55%]）と同じ幾何で中央枠を求める */
function centerFrameRect(w: number, h: number): { tx: number; ty: number; tw: number; th: number } {
  const maxTw = w * 0.68;
  const maxTh = h * 0.55;
  let tw = maxTw;
  let th = tw * (4 / 3);
  if (th > maxTh) {
    th = maxTh;
    tw = th * (3 / 4);
  }
  return { tx: (w - tw) / 2, ty: (h - th) / 2, tw, th };
}

function drawFrameCorners(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number, tw: number, th: number,
  sc: number,
  strong: boolean
) {
  const L = 20 * sc;
  const lw = 2 * sc;
  ctx.strokeStyle = strong ? "rgba(164,228,0,0.80)" : "rgba(164,228,0,0.30)";
  ctx.lineWidth = lw;
  const corners: [number, number, number, number, number, number][] = [
    [tx, ty + L, tx, ty, tx + L, ty],
    [tx + tw - L, ty, tx + tw, ty, tx + tw, ty + L],
    [tx, ty + th - L, tx, ty + th, tx + L, ty + th],
    [tx + tw - L, ty + th, tx + tw, ty + th, tx + tw, ty + th - L],
  ];
  for (const [x1, y1, x2, y2, x3, y3] of corners) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  }
}

type SavedOverlayParams = {
  active: boolean;
  hasTimer: boolean;
  recording: boolean;
  elapsedSec: number;
  deadlineMs: number | null;
  sessionStartMs: number | null;
  now: number;
};

function drawSavedViewOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, p: SavedOverlayParams) {
  const sc = Math.max(1, w / 390);
  const pad = 14 * sc;

  drawScanlinePattern(ctx, w, h);
  drawDotGridPattern(ctx, w, h);

  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const topG = ctx.createLinearGradient(0, 0, 0, 56 * sc);
  topG.addColorStop(0, "rgba(0,0,0,0.65)");
  topG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topG;
  ctx.fillRect(0, 0, w, 56 * sc);

  ctx.font = `700 ${7.5 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = G80;
  ctx.textAlign = "left";
  ctx.fillText("DIAGNOSTIC_TERMINAL_V1.0", pad, 17 * sc);
  ctx.textAlign = "right";
  ctx.fillStyle = p.active ? G80 : "rgba(164,228,0,0.30)";
  ctx.fillText(p.active ? "鑑定中 · ANALYZING" : "STANDBY", w - pad, 17 * sc);
  ctx.textAlign = "left";

  const { tx, ty, tw, th } = centerFrameRect(w, h);
  ctx.strokeStyle = p.active ? G25 : "rgba(164,228,0,0.10)";
  ctx.lineWidth = 1 * sc;
  ctx.strokeRect(tx, ty, tw, th);
  drawFrameCorners(ctx, tx, ty, tw, th, sc, p.hasTimer);

  ctx.font = `${6.5 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(164,228,0,0.55)";
  ctx.textAlign = "left";
  ctx.fillText(p.hasTimer ? "[SYSTEM_ACTIVE]" : "[SYSTEM_READY]", tx, ty - 8 * sc);

  ctx.font = `${5.5 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(164,228,0,0.55)";
  ctx.textAlign = "right";
  const tid = p.hasTimer ? "SESSION_MATCH" : "NO_MATCH";
  ctx.fillText(`TARGET_ID: ${tid}`, tx + tw, ty + th + 10 * sc);
  ctx.fillText("SCAN_INTENSITY: 87%", tx + tw, ty + th + 18 * sc);

  const midY = ty + th * 0.5;
  const scanGrad = ctx.createLinearGradient(tx, midY, tx + tw, midY);
  const hi = p.hasTimer ? "rgba(164,228,0,0.80)" : "rgba(164,228,0,0.30)";
  scanGrad.addColorStop(0, "rgba(164,228,0,0)");
  scanGrad.addColorStop(0.3, hi);
  scanGrad.addColorStop(0.7, hi);
  scanGrad.addColorStop(1, "rgba(164,228,0,0)");
  ctx.fillStyle = scanGrad;
  ctx.fillRect(tx + tw * 0.05, midY - 1 * sc, tw * 0.9, 2 * sc);

  const cx = tx + tw / 2;
  const cy = ty + th / 2;
  const ch = 12 * sc;
  ctx.strokeStyle = "rgba(164,228,0,0.40)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ch);
  ctx.lineTo(cx, cy + ch);
  ctx.moveTo(cx - ch, cy);
  ctx.lineTo(cx + ch, cy);
  ctx.stroke();

  ctx.font = `${6 * sc}px "Space Mono", monospace`;
  ctx.textAlign = "center";
  ctx.fillStyle = p.hasTimer ? "rgba(164,228,0,0.60)" : "rgba(164,228,0,0.22)";
  ctx.fillText(
    p.hasTimer ? "鑑定中 · ANALYZING" : "SESSION_NOT_STARTED",
    cx,
    ty + th - 8 * sc
  );
  ctx.textAlign = "left";

  const telX = 10 * sc;
  const telY = h / 2 - 52 * sc;
  const telW = 118 * sc;
  const telH = 72 * sc;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(telX, telY, telW, telH);
  ctx.strokeStyle = "rgba(164,228,0,0.40)";
  ctx.lineWidth = 2 * sc;
  ctx.beginPath();
  ctx.moveTo(telX, telY);
  ctx.lineTo(telX, telY + telH);
  ctx.stroke();

  ctx.font = `${5 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(164,228,0,0.50)";
  ctx.fillText("TELEMETRY_DATA", telX + 8 * sc, telY + 12 * sc);
  ctx.fillStyle = G;
  ctx.font = `${6.5 * sc}px "Space Mono", monospace`;
  const rows: [string, string][] = [["ALT", "104.2m"], ["VEL", "0.00 m/s"], ["TMP", "24.5°C"]];
  let ry = telY + 22 * sc;
  for (const [k, v] of rows) {
    ctx.textAlign = "left";
    ctx.fillText(`${k}:`, telX + 8 * sc, ry);
    ctx.textAlign = "right";
    ctx.fillText(v, telX + telW - 8 * sc, ry);
    ry += 14 * sc;
  }

  if (p.hasTimer && p.deadlineMs !== null && p.sessionStartMs !== null) {
    drawTimerHud(ctx, w, h, p.deadlineMs, p.sessionStartMs, p.now);
  }

  const stripH = 22 * sc;
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, h - stripH, w, stripH);
  const topFade = ctx.createLinearGradient(0, h - stripH - 28 * sc, 0, h - stripH);
  topFade.addColorStop(0, "rgba(0,0,0,0)");
  topFade.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, h - stripH - 28 * sc, w, 28 * sc);

  ctx.font = `${5.5 * sc}px "Space Mono", monospace`;
  ctx.fillStyle = p.recording ? "#ff4444" : "rgba(164,228,0,0.60)";
  ctx.textAlign = "left";
  ctx.fillText(p.recording ? "● REC" : "REC_STDBY", pad, h - 8 * sc);
  ctx.fillStyle = "rgba(164,228,0,0.60)";
  ctx.fillText(formatTimecode(p.elapsedSec), pad + 68 * sc, h - 8 * sc);
  ctx.textAlign = "right";
  const isoLabel = "ISO_AUTO  f/1.8  ";
  const isoW = ctx.measureText(isoLabel).width;
  ctx.fillStyle = "rgba(164,228,0,0.60)";
  ctx.fillText(isoLabel, w - pad, h - 8 * sc);
  ctx.fillStyle = "rgba(199,255,92,0.88)";
  ctx.fillText("1/60", w - pad - isoW - 4 * sc, h - 8 * sc);
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
  /** true = インカメ（user）、false = アウトカメ（environment） */
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const prevFacingRef = useRef<boolean | null>(null);
  /** getUserMedia 成功のたびに増やし、video へ srcObject + play を確実に同期する */
  const [streamGeneration, setStreamGeneration] = useState(0);

  // カメラ起動（向き変更時はストリームを作り直す）
  useEffect(() => {
    let cancelled = false;
    isMountedRef.current = true;

    const prevFacing = prevFacingRef.current;
    const facingSwitched = prevFacing !== null && prevFacing !== useFrontCamera;
    prevFacingRef.current = useFrontCamera;

    function startStream(constraints: MediaStreamConstraints, fallback = false) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = stream;
          // video への接続は useEffect(streamGeneration) 側で行う（ref 未確定・iOS の play 対策）
          setStreamGeneration((g) => g + 1);
          // torch サポート確認（インカメでは通常 false）
          const track = stream.getVideoTracks()[0];
          const caps = track?.getCapabilities() as Record<string, unknown> | undefined;
          setTorchSupported(!!caps?.torch);
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

    const facing = useFrontCamera ? "user" : "environment";
    const constraints: MediaStreamConstraints = {
      video: { facingMode: { ideal: facing } },
      audio: false,
    };

    if (facingSwitched) {
      queueMicrotask(() => {
        if (cancelled) return;
        setCameraReady(false);
        setTorchOn(false);
        setTorchSupported(false);
        startStream(constraints, false);
      });
    } else {
      startStream(constraints, false);
    }

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [useFrontCamera]);

  // MediaStream → <video>（コミット後の ref に必ず接続。iOS は明示的 play が必要なことが多い）
  useEffect(() => {
    if (streamGeneration === 0) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.setAttribute("playsinline", "");
    void video.play().catch(() => {});

    if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
    cameraTimeoutRef.current = setTimeout(() => {
      setCameraError("カメラの映像が取得できませんでした。ブラウザを再起動してお試しください。");
    }, 15000);

    return () => {
      if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
      video.srcObject = null;
    };
  }, [streamGeneration]);

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

    if (useFrontCamera) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    if (useFrontCamera) ctx.setTransform(1, 0, 0, 1, 0, 0);
    const d = readAppraisalDeadlineMs();
    const s = readAppraisalSessionStartMs();
    const now = Date.now();
    const active = d !== null && s !== null;
    const hasT = active;
    const elapsed =
      finderStartMs !== null ? Math.max(0, Math.floor((now - finderStartMs) / 1000)) : 0;
    drawSavedViewOverlay(ctx, w, h, {
      active,
      hasTimer: hasT,
      recording,
      elapsedSec: elapsed,
      deadlineMs: d,
      sessionStartMs: s,
      now,
    });

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
  }, [recording, finderStartMs, useFrontCamera]);

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

  const toggleFacing = useCallback(() => {
    setUseFrontCamera((v) => !v);
    setZoomLevel(1);
    const v = videoRef.current;
    if (v) {
      v.style.transformOrigin = "center center";
      v.style.transform = "";
    }
  }, []);

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

      <div className="relative flex min-h-0 min-h-full flex-1 basis-0 flex-col overflow-hidden bg-black">

        {/* ── ファインダー（ナビ上のスロットいっぱいまで縦に伸ばす） ───────── */}
        <div className="relative min-h-0 min-h-full flex-1 basis-0 overflow-hidden">
          <div
            className={`absolute inset-0 z-0 overflow-hidden ${useFrontCamera ? "-scale-x-100" : ""}`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedData={() => {
                void videoRef.current?.play().catch(() => {});
              }}
              onCanPlay={() => {
                if (cameraTimeoutRef.current !== null) clearTimeout(cameraTimeoutRef.current);
                setFinderStartMs(Date.now());
                setCameraReady(true);
                void videoRef.current?.play().catch(() => {});
              }}
              onError={() => setCameraError("カメラの映像を取得できませんでした。ブラウザを再起動してお試しください。")}
              className="relative z-0 h-full w-full object-cover [transform:translateZ(0)]"
            />
          </div>

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

              {/* 右パネル: イン/アウト + ズーム + REC */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
                {/* カメラ向き（インカメ / アウトカメ） */}
                <button
                  type="button"
                  onClick={toggleFacing}
                  className={`flex h-10 w-10 items-center justify-center transition-all active:scale-90 ${useFrontCamera ? "bg-[#a4e400] text-black" : "bg-black/55 text-[#a4e400] border border-[#a4e400]/30"}`}
                  aria-label={useFrontCamera ? "アウトカメラに切り替え" : "インカメラに切り替え"}
                >
                  <span className="material-symbols-outlined text-[18px]">cameraswitch</span>
                </button>
                <p className="text-center font-mono text-[0.36rem] uppercase tracking-[0.14em] text-[#a4e400]/45">
                  {useFrontCamera ? "FRONT" : "REAR"}
                </p>

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
          {flashing && <div className="pointer-events-none absolute inset-0 z-40 bg-white/65" />}

          {/* シャッター（ファインダー上に浮遊・映像領域を占有しない） */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto relative">
              <div
                className="singan-spin pointer-events-none absolute inset-[-12px] rounded-full border border-[#a4e400]/15"
                aria-hidden
              />
              <button
                type="button"
                onClick={capture}
                disabled={!cameraReady}
                aria-label="撮影"
                className="group relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#a4e400]/35 shadow-[0_8px_32px_rgba(0,0,0,0.55)] transition-transform active:scale-90 disabled:opacity-30"
              >
                <div
                  className="absolute inset-1.5 rounded-full transition-opacity group-active:opacity-70"
                  style={{
                    background: "linear-gradient(135deg, #a4e400, #c7ff5c)",
                    boxShadow: "0 0 28px rgba(164,228,0,0.45)",
                  }}
                />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-black/20">
                  <span className="material-symbols-outlined text-[28px] text-black/80">photo_camera</span>
                </div>
              </button>
            </div>
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

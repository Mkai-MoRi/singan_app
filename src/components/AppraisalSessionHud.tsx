"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  APPRAISAL_GATHER_MESSAGE,
  APPRAISAL_SESSION_LIMIT_MS,
  APPRAISAL_URGENT_REMAIN_FRACTION,
  APPRAISAL_URGENT_REMAIN_MAX_SEC,
  readAppraisalDeadlineMs,
  readAppraisalSessionStartMs,
  writeAppraisalDeadlineMs,
  writeAppraisalSessionStartMs,
} from "@/lib/appraisalSessionConfig";

type AppraisalSessionHudProps = {
  /** チュートリアル済みかつ一覧の解禁演出が終わったあとだけ true */
  active: boolean;
};

/** AppChrome の下部タブ（h-16 + safe-area）と揃える */
const NAV_STACK_BOTTOM = "calc(4rem + env(safe-area-inset-bottom, 0px))";

/** 1 時間未満は M:SS、以上は H:MM:SS */
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

export default function AppraisalSessionHud({ active }: AppraisalSessionHudProps) {
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);
  const [gatherOpen, setGatherOpen] = useState(false);
  const gatherDismissedRef = useRef(false);

  const closeGather = useCallback(() => {
    gatherDismissedRef.current = true;
    setGatherOpen(false);
  }, []);

  useEffect(() => {
    if (!active) {
      gatherDismissedRef.current = false;
      queueMicrotask(() => {
        setDeadlineMs(null);
        setSessionStartMs(null);
        setClockMs(null);
        setGatherOpen(false);
      });
      return;
    }

    gatherDismissedRef.current = false;

    let d = readAppraisalDeadlineMs();
    let start = readAppraisalSessionStartMs();

    if (d === null) {
      const now = Date.now();
      start = now;
      d = now + APPRAISAL_SESSION_LIMIT_MS;
      writeAppraisalSessionStartMs(start);
      writeAppraisalDeadlineMs(d);
    } else if (start === null) {
      start = d - APPRAISAL_SESSION_LIMIT_MS;
      writeAppraisalSessionStartMs(start);
    }

    const deadline = d;
    const sessionStart = start;

    queueMicrotask(() => {
      setDeadlineMs(deadline);
      setSessionStartMs(sessionStart);
      setClockMs(Date.now());
    });

    const id = window.setInterval(() => {
      const now = Date.now();
      setClockMs(now);
      if (!gatherDismissedRef.current && deadline - now <= 0) {
        setGatherOpen(true);
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [active]);

  const remainSec =
    deadlineMs !== null && clockMs !== null ? (deadlineMs - clockMs) / 1000 : 0;
  const expired = deadlineMs !== null && clockMs !== null && remainSec <= 0;

  const totalMs =
    deadlineMs !== null && sessionStartMs !== null
      ? Math.max(1, deadlineMs - sessionStartMs)
      : 1;
  const totalSec = totalMs / 1000;
  const remainMs =
    deadlineMs !== null && clockMs !== null ? Math.max(0, deadlineMs - clockMs) : 0;
  const remainFraction = expired ? 0 : Math.min(1, remainMs / totalMs);

  /** 左→右へ伸びる比率（1 で右端＝終了） */
  const elapsedMs =
    deadlineMs !== null && sessionStartMs !== null && clockMs !== null
      ? Math.min(totalMs, Math.max(0, clockMs - sessionStartMs))
      : 0;
  const fillRatio = expired ? 1 : Math.min(1, elapsedMs / totalMs);

  /** 終盤ウィンドウ: 30 秒と総時間の 10% の短い方（短いセッションで常時緊急にならない） */
  const urgentRemainCapSec = Math.min(
    APPRAISAL_URGENT_REMAIN_MAX_SEC,
    totalSec * APPRAISAL_URGENT_REMAIN_FRACTION
  );
  const urgent = !expired && remainSec <= urgentRemainCapSec;

  /** 終盤に向けてバー色を error 寄りに（残り割合が小さいほど強い） */
  const barHeat = expired ? 1 : Math.min(1, Math.max(0, (0.18 - remainFraction) / 0.18));

  if (typeof document === "undefined") return null;

  const fillBg =
    expired || barHeat > 0.02
      ? `color-mix(in srgb, var(--primary) ${Math.round(72 - barHeat * 38)}%, var(--error) ${Math.round(18 + barHeat * 62)}%)`
      : undefined;

  const timerNode =
    active && deadlineMs !== null && sessionStartMs !== null && clockMs !== null ? (
      <div
        className="pointer-events-none fixed inset-x-0 isolate z-[10020] border-t border-[color:color-mix(in_srgb,var(--hairline)_45%,transparent)] bg-[color:var(--bg)] shadow-[0_-14px_36px_-10px_rgba(0,0,0,0.6)]"
        style={{ bottom: NAV_STACK_BOTTOM }}
        role="timer"
        aria-live="polite"
        aria-label={`制限時間。残り ${formatRemain(remainSec)}。バーが右端に達するとタイムアップ。`}
      >
        <div
          className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-2.5 pb-2"
          style={{
            paddingLeft: `max(0.75rem, env(safe-area-inset-left, 0px))`,
            paddingRight: `max(0.75rem, env(safe-area-inset-right, 0px))`,
          }}
        >
          <div className="min-w-0">
            <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
              制限時間
            </p>
            <p className="mt-0.5 max-w-[14rem] font-mono text-[0.52rem] font-medium leading-snug normal-case tracking-normal text-[color:var(--fg-muted)]/90">
              締切まで · バーが右端＝終了
            </p>
          </div>
          <div
            className={`flex shrink-0 flex-col items-end gap-0.5 ${urgent ? "appraisal-deadline-urgent-pulse" : ""}`}
          >
            <span className="font-mono text-[0.48rem] font-bold uppercase tracking-[0.16em] text-[color:var(--fg-muted)]">
              残り
            </span>
            <span
              className={`font-mono font-bold tabular-nums tracking-tight ${
                expired
                  ? "text-[0.85rem] text-[color:var(--error)]"
                  : urgent
                    ? "text-[0.9rem] text-[color:var(--error)]"
                    : "text-[0.78rem] text-[color:var(--primary)]"
              }`}
            >
              {expired ? "0:00" : formatRemain(remainSec)}
            </span>
          </div>
        </div>
        <div
          style={{
            paddingLeft: `max(0.75rem, env(safe-area-inset-left, 0px))`,
            paddingRight: `max(0.75rem, env(safe-area-inset-right, 0px))`,
          }}
          className="pb-3"
        >
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--surface-high)_58%,var(--bg))]">
            <div
              className={`absolute inset-y-0 left-0 z-0 w-full origin-left rounded-full will-change-transform transition-[transform] duration-200 ease-linear ${
                fillBg ? "" : "bg-[color:color-mix(in_srgb,var(--primary)_82%,var(--tertiary))]"
              }`}
              style={{
                transform: `scaleX(${fillRatio})`,
                ...(fillBg ? { background: fillBg } : {}),
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-px bg-[color:color-mix(in_srgb,var(--primary)_70%,var(--error))]"
              aria-hidden
            />
          </div>
        </div>
      </div>
    ) : null;

  const gatherNode =
    gatherOpen && active ? (
      <div
        className="appraisal-gather-root normal-case fixed inset-0 z-[10070] flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appraisal-gather-title"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default bg-[color:color-mix(in_srgb,var(--bg)_78%,transparent)] backdrop-blur-[2px]"
          aria-label="閉じる"
          onClick={closeGather}
        />
        <div className="appraisal-gather-card relative max-w-sm border border-[color:var(--primary)]/45 bg-[color:var(--surface-low)] px-5 py-6 text-center shadow-[0_0_48px_color-mix(in_srgb,var(--primary)_22%,transparent)]">
          <p className="mb-2 font-mono text-[0.5rem] font-bold uppercase tracking-[0.28em] text-[color:var(--tertiary)]">Session</p>
          <h2 id="appraisal-gather-title" className="font-display text-lg font-bold leading-snug tracking-tight text-[color:var(--primary)]">
            タイムアップ
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-[color:var(--secondary)]">{APPRAISAL_GATHER_MESSAGE}</p>
          <button
            type="button"
            onClick={closeGather}
            className="mt-6 w-full border border-[color:var(--surface-high)]/55 bg-[color:var(--bg)] py-2.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[color:var(--secondary)] transition-colors hover:border-[color:var(--primary)]/40"
          >
            了解
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      {timerNode ? createPortal(timerNode, document.body) : null}
      {gatherNode ? createPortal(gatherNode, document.body) : null}
    </>
  );
}

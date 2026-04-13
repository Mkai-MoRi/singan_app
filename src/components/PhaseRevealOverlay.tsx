"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef } from "react";
import { WebHaptics } from "web-haptics";
import type { JudgmentRecord } from "@/lib/judgmentsStorage";
import { scoreTruthRange } from "@/lib/dummyAppraisalTruth";

export type PhaseRevealKind = "afterPhase1" | "afterPhase2" | "afterPhase3";

const META: Record<PhaseRevealKind, { tag: string; resultLine: string }> = {
  afterPhase1: {
    tag: "PHASE_02 // AUTHENTICITY_DEPTH",
    resultLine: "BLOCK_ALPHA :: SINGAN_STREAM_ACCEPT",
  },
  afterPhase2: {
    tag: "PHASE_03 // FINAL_WAVEGUIDE",
    resultLine: "BLOCK_BETA :: VERDICT_CHANNEL_OPEN",
  },
  afterPhase3: {
    tag: "ARCHIVE_SEAL // TWENTY_NODES",
    resultLine: "FULL_CATALOG :: VERDICT_MATRIX_COMMITTED",
  },
};

function scoreBoundsForReveal(kind: PhaseRevealKind): { min: number; max: number } {
  switch (kind) {
    case "afterPhase1":
      return { min: 1, max: 5 };
    case "afterPhase2":
      return { min: 6, max: 15 };
    default:
      return { min: 16, max: 20 };
  }
}

/**
 * CSS の段階アニメに合わせたハプティクス。
 * Android 等は `navigator.vibrate`、iOS Safari は `web-haptics` の switch フォールバック
 *（https://azukiazusa.dev/blog/ios-safari-web-haptics/ 参照）。
 */
function startPhaseRevealHapticsSequence(): () => void {
  if (typeof window === "undefined") return () => {};

  const haptics = new WebHaptics({ showSwitch: false });
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const intensity = reduced ? 0.42 : 0.62;
  const ids: number[] = [];

  const q = (ms: number, pattern: number | number[]) => {
    ids.push(
      window.setTimeout(() => {
        void haptics.trigger(pattern, { intensity });
      }, ms)
    );
  };

  if (reduced) {
    q(0, [28, 52, 28]);
    q(420, 36);
    q(780, 20);
  } else {
    q(0, [40, 72, 24, 58, 32]);
    q(360, 14);
    q(780, 52);
    q(920, [18, 34, 18]);
    q(1120, [12, 28, 12]);
    q(2000, [14, 40, 14]);
    q(2720, [10, 22, 10]);
  }

  return () => {
    for (const id of ids) window.clearTimeout(id);
    haptics.cancel();
    haptics.destroy();
  };
}

type PhaseRevealOverlayProps = {
  kind: PhaseRevealKind;
  judgments: JudgmentRecord;
  onComplete: () => void;
};

export default function PhaseRevealOverlay({ kind, judgments, onComplete }: PhaseRevealOverlayProps) {
  const doneRef = useRef(false);
  const meta = META[kind];
  const { min, max } = scoreBoundsForReveal(kind);
  const { correct, graded, total } = scoreTruthRange(judgments, min, max);
  const caseSpan = `CASE ${String(min).padStart(2, "0")}–${String(max).padStart(2, "0")}`;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ms = mq.matches ? 960 : 3400;
    const t = window.setTimeout(finish, ms);
    return () => window.clearTimeout(t);
  }, [finish]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const stopHaptics = startPhaseRevealHapticsSequence();
    return stopHaptics;
  }, []);

  if (typeof document === "undefined") return null;

  const node = (
    <div
      className="phase-reveal-root normal-case"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase-reveal-heading"
      aria-describedby="phase-reveal-desc"
    >
      <div className="phase-reveal-vignette" aria-hidden />
      <div className="phase-reveal-scanbeam" aria-hidden />
      <div className="phase-reveal-grid" aria-hidden />
      <div className="phase-reveal-noise" aria-hidden />
      <div className="phase-reveal-rim" aria-hidden />

      <div className="phase-reveal-content">
        <p id="phase-reveal-desc" className="phase-reveal-pretag font-mono text-[color:var(--tertiary)]">
          {meta.tag}
        </p>

        <h1 id="phase-reveal-heading" className="phase-reveal-heading-wrap">
          <span className="phase-reveal-kanji phase-reveal-title-a">真贋</span>
          <span className="phase-reveal-kanji phase-reveal-title-b">鑑定</span>
        </h1>
        <div className="phase-reveal-title-rule" aria-hidden />

        <div className="phase-reveal-hit-panel" aria-live="polite">
          <div className="phase-reveal-hit-glow" aria-hidden />
          <p className="phase-reveal-hit-eyebrow font-mono">HIT · {caseSpan}</p>
          <p className="phase-reveal-hit-line tabular-nums">
            <span className="phase-reveal-hit-num-a">{String(correct).padStart(2, "0")}</span>
            <span className="phase-reveal-hit-slash">/</span>
            <span className="phase-reveal-hit-num-b">{String(graded).padStart(2, "0")}</span>
          </p>
          <p className="phase-reveal-hit-caption font-mono">
            採点済み {graded} / {total} · 正解 {correct}（仮キー: 奇数＝本物 / 偶数＝偽物）
          </p>
        </div>

        <div className="phase-reveal-divider" aria-hidden />

        <div className="phase-reveal-result-block">
          <p className="phase-reveal-flicker phase-reveal-result-line font-mono text-[color:var(--primary-bright)]">
            {meta.resultLine}
          </p>
          <p className="phase-reveal-sync-line font-mono text-[color:var(--fg-muted)]">
            真贋レポートを同期しています…
          </p>
          <div className="phase-reveal-progress" aria-hidden>
            <div className="phase-reveal-progress-bar" />
          </div>
        </div>

        <button
          type="button"
          className="phase-reveal-skip font-mono text-[color:var(--fg-muted)]"
          onClick={finish}
        >
          SKIP
        </button>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

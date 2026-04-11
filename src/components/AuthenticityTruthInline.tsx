"use client";

import type { JudgmentRecord } from "@/lib/judgmentsStorage";
import { scoreTruthRange } from "@/lib/dummyAppraisalTruth";

type AuthenticityTruthInlineProps = {
  judgments: JudgmentRecord;
  rangeMin: number;
  rangeMax: number;
  colSpanClass: string;
};

/** グリッド空きマス用。点数は大きく、ラベルは控えめ。 */
export default function AuthenticityTruthInline({
  judgments,
  rangeMin,
  rangeMax,
  colSpanClass,
}: AuthenticityTruthInlineProps) {
  const { correct, graded } = scoreTruthRange(judgments, rangeMin, rangeMax);

  return (
    <div
      className={`${colSpanClass} flex h-full min-h-0 flex-col justify-between self-stretch border border-[color:color-mix(in_srgb,var(--outline-variant)_16%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-low)_75%,transparent)] px-1 py-0.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_6%,transparent)] normal-case sm:px-1.5 sm:py-1`}
    >
      <span className="shrink-0 font-mono text-[0.42rem] font-bold tracking-[0.22em] text-[color:var(--fg-muted)] sm:text-[0.45rem]">
        HIT
      </span>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-0.5">
        <p
          className="font-display flex flex-nowrap items-baseline justify-center gap-0.5 font-black tabular-nums leading-none tracking-tighter"
          style={{
            fontSize: "clamp(1.85rem, min(18vw, 14rem), 4rem)",
            textShadow: "0 0 28px color-mix(in srgb, var(--primary) 35%, transparent), 0 1px 0 color-mix(in srgb, var(--bg) 45%, transparent)",
          }}
        >
          <span className="text-[color:var(--primary-bright)]">{String(correct).padStart(2, "0")}</span>
          <span
            className="translate-y-[-0.06em] font-bold opacity-50"
            style={{ color: "var(--secondary)", fontSize: "0.42em" }}
            aria-hidden
          >
            /
          </span>
          <span className="text-[color:color-mix(in_srgb,var(--secondary)_90%,var(--primary))]">
            {String(graded).padStart(2, "0")}
          </span>
        </p>
      </div>
    </div>
  );
}

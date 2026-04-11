"use client";

import { Fragment, useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useJudgments } from "@/hooks/useJudgments";
import { usePracticeCaseUnlock } from "@/hooks/usePracticeCaseUnlock";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import type { Work } from "@/lib/dummyWorks";
import { countJudgedInCatalog, listCatalogWorks } from "@/lib/worksCatalog";
import { Judgment, type JudgmentRecord } from "@/lib/judgmentsStorage";
import { judgmentGridCellStyle, judgmentMonoIdColor } from "@/lib/judgmentDisplayTokens";
import { buildSummaryShareAbsoluteUrl } from "@/lib/judgmentsUrlCodec";
import { clearWorksReturnSwipe, peekWorksReturnSwipe } from "@/lib/worksReturnSwipe";
import AuthenticityTruthInline from "@/components/AuthenticityTruthInline";
import PhaseRevealOverlay, { type PhaseRevealKind } from "@/components/PhaseRevealOverlay";
import { isCoreCatalogComplete, isCorePhase1Complete, isCorePhase2Complete } from "@/lib/workPhases";

const STATUS_LABEL: Record<Judgment, string> = {
  undecided: "NULL",
  authentic: "AUTH",
  fake: "FAKE",
  pending: "HOLD",
};

const GRID_LEGEND = [
  { key: "auth", label: "AUTH", bar: "var(--primary)" as const },
  { key: "fake", label: "FAKE", bar: "var(--tertiary)" as const },
  { key: "hold", label: "HOLD", bar: "var(--secondary)" as const },
  {
    key: "null",
    label: "NULL",
    bar: "color-mix(in srgb, var(--outline-variant) 50%, transparent)" as const,
  },
] as const;

function WorkCatalogCell({
  work,
  mounted,
  judgments,
}: {
  work: Work;
  mounted: boolean;
  judgments: JudgmentRecord;
}) {
  const judgment: Judgment = mounted ? judgments[work.id] ?? "undecided" : "undecided";
  const judgedStyle = judgment !== "undecided" ? judgmentGridCellStyle[judgment] : null;

  const cellClass = `relative flex aspect-square flex-col justify-between border border-solid p-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)] transition-[background-color,border-color,filter,box-shadow] hover:brightness-[1.07] focus-visible:brightness-[1.05] sm:p-2.5 ${
    judgedStyle
      ? ""
      : "border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] bg-[color:var(--surface-low)] hover:border-[color:color-mix(in_srgb,var(--primary)_42%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--surface-high)_38%,var(--surface-low))] hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
  }`;

  return (
    <Link
      href={`/works/${work.id}`}
      className={cellClass}
      style={judgedStyle ? { backgroundColor: judgedStyle.bg, borderColor: judgedStyle.border } : undefined}
      aria-label={`${work.caseName}: ${STATUS_LABEL[judgment]}`}
    >
      <span className="relative z-[1] min-w-0">
        <span
          className="mb-0.5 block font-mono text-[0.52rem] font-medium uppercase leading-none tracking-[0.14em] sm:text-[0.55rem]"
          style={{ color: "color-mix(in srgb, var(--fg-muted) 72%, var(--secondary))" }}
          aria-hidden
        >
          IDX
        </span>
        <span
          className="font-mono text-[0.9rem] font-bold tabular-nums leading-none tracking-tight sm:text-[1.05rem]"
          style={{
            color: judgmentMonoIdColor(judgment),
            textShadow: "0 1px 0 color-mix(in srgb, var(--bg) 55%, transparent)",
          }}
        >
          {String(work.id).padStart(2, "0")}
        </span>
      </span>
      <span
        className="relative z-[1] self-end font-mono text-[0.52rem] font-bold uppercase leading-none tracking-tight sm:text-[0.58rem]"
        style={{
          color:
            judgment === "authentic"
              ? "var(--primary)"
              : judgment === "fake"
                ? "var(--tertiary)"
                : judgment === "pending"
                  ? "var(--secondary)"
                  : "color-mix(in srgb, var(--fg-muted) 58%, var(--bg))",
        }}
      >
        {mounted ? STATUS_LABEL[judgment] : "···"}
      </span>
    </Link>
  );
}

export default function WorksPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { judgments, mounted } = useJudgments();
  const { secretUnlocked, secretMounted } = useSecretCaseUnlock();
  const { practiceUnlocked, practiceMounted } = usePracticeCaseUnlock();
  const [shareHint, setShareHint] = useState<"idle" | "ok" | "err">("idle");
  const [phaseReveal, setPhaseReveal] = useState<PhaseRevealKind | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const raw = searchParams.get("reveal");
    if (raw === "afterPhase1" || raw === "afterPhase2" || raw === "afterPhase3") {
      queueMicrotask(() => {
        setPhaseReveal(raw);
        router.replace("/works", { scroll: false });
      });
    }
  }, [searchParams, router]);

  useLayoutEffect(() => {
    const d = peekWorksReturnSwipe();
    if (!d) return undefined;
    const el = mainRef.current;
    const cls =
      d === "right" ? "works-reveal-from-left" : d === "left" ? "works-reveal-from-right" : "works-reveal-soft";
    el?.classList.add(cls);
    const t = window.setTimeout(() => {
      clearWorksReturnSwipe();
      el?.classList.remove(cls);
    }, 520);
    return () => {
      window.clearTimeout(t);
      el?.classList.remove(cls);
    };
  }, []);

  const catalog = listCatalogWorks({
    secretUnlocked: !!(secretMounted && secretUnlocked),
    practiceUnlocked: !!(practiceMounted && practiceUnlocked),
  });
  const slotTotal = catalog.length;

  const practiceWorks = catalog.filter((w) => w.id === 0);
  const secretWorks = catalog.filter((w) => w.id === 21);
  const coreWorks = catalog.filter((w) => w.id >= 1 && w.id <= 20);
  const phase1Works = coreWorks.filter((w) => w.id <= 5);
  const phase2Works = coreWorks.filter((w) => w.id >= 6 && w.id <= 15);
  const phase3Works = coreWorks.filter((w) => w.id >= 16);

  const phase1Done = mounted && isCorePhase1Complete(judgments);
  const phase2Done = mounted && isCorePhase2Complete(judgments);
  const catalog20Done = mounted && isCoreCatalogComplete(judgments);

  const copyShareUrl = useCallback(async () => {
    const url = buildSummaryShareAbsoluteUrl(judgments, secretMounted && secretUnlocked);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareHint("ok");
      window.setTimeout(() => setShareHint("idle"), 2400);
    } catch {
      setShareHint("err");
      window.setTimeout(() => setShareHint("idle"), 3200);
    }
  }, [judgments, secretMounted, secretUnlocked]);

  const judged = mounted ? countJudgedInCatalog(catalog, judgments) : 0;
  const authentic = mounted
    ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "authentic").length
    : 0;
  const pending = mounted
    ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "pending").length
    : 0;

  return (
    <main
      ref={mainRef}
      className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-clip pb-4 pt-3"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 grid-backdrop opacity-70" aria-hidden />

      <section className="mb-5 ml-[max(0.75rem,env(safe-area-inset-left))] mr-[max(0.75rem,env(safe-area-inset-right))] border border-[color:var(--surface-high)]/30 bg-[color:var(--bg)] p-2.5 sm:p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p className="min-w-0 font-display text-[0.6rem] font-bold leading-tight tracking-[0.12em] text-[color:var(--primary)]">
            Station: Active
            <span className="font-bold text-[color:var(--fg-muted)]"> · Ledger</span>
          </p>
          <span className="shrink-0 font-mono text-[0.52rem] leading-none" style={{ color: "var(--fg-muted)" }}>
            [IDX·DEV]
          </span>
        </div>
        <div className="mb-2 grid min-w-0 grid-cols-3 gap-1.5">
          <div className="min-w-0 border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] px-2 py-1.5">
            <p className="mb-0.5 text-[0.5rem] font-bold uppercase leading-none tracking-wide text-[color:var(--fg-muted)]">Progress</p>
            <p className="font-display text-lg font-bold leading-none text-[color:var(--primary)]">
              {mounted ? Math.round((judged / slotTotal) * 100) : "—"}
              <span className="text-[0.65rem] font-bold opacity-60" style={{ color: "var(--secondary)" }}>
                %
              </span>
            </p>
            <p className="mt-0.5 font-mono text-[0.48rem] leading-none text-[color:var(--fg-muted)]">
              {mounted ? `${judged}/${slotTotal}` : "—"}
            </p>
          </div>
          <div className="min-w-0 border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] px-2 py-1.5">
            <p className="mb-0.5 text-[0.5rem] font-bold uppercase leading-none tracking-wide text-[color:var(--fg-muted)]">Auth</p>
            <p className="font-display text-lg font-bold leading-none text-[color:var(--primary)]">
              {mounted ? String(authentic).padStart(2, "0") : "—"}
              <span className="text-[0.55rem] font-bold opacity-60" style={{ color: "var(--secondary)" }}>
                pt
              </span>
            </p>
          </div>
          <div className="min-w-0 border-l-2 border-[color:var(--secondary)] bg-[color:var(--surface-low)] px-2 py-1.5">
            <p className="mb-0.5 text-[0.5rem] font-bold uppercase leading-none tracking-wide text-[color:var(--fg-muted)]">Hold</p>
            <p className="font-display text-lg font-bold leading-none text-[color:var(--secondary)]">{mounted ? pending : "—"}</p>
          </div>
        </div>
        <div className="mb-2 h-px w-full bg-[color:var(--hairline)]/40" />
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
          <Link
            href="/summary"
            className="flex min-h-[2.25rem] flex-1 items-center justify-center bg-[color:var(--primary)] px-2 py-1.5 text-center text-[0.62rem] font-bold uppercase tracking-[0.14em] transition-all hover:brightness-110 active:scale-[0.99] sm:min-h-0"
            style={{ color: "var(--on-primary)" }}
          >
            記録を確認
          </Link>
          <button
            type="button"
            onClick={() => void copyShareUrl()}
            disabled={!mounted}
            aria-label="共有リンクをコピー（鑑定ログ）"
            className="flex min-h-[2.25rem] flex-1 items-center justify-center border border-[color:var(--surface-high)]/50 px-2 py-1.5 text-center text-[0.58rem] font-bold uppercase leading-tight tracking-wide transition-colors hover:border-[color:var(--primary)]/40 disabled:opacity-40 sm:min-h-0"
            style={{ color: "var(--fg-muted)" }}
          >
            共有リンクをコピー
          </button>
        </div>
        {shareHint === "ok" && (
          <p className="mt-1 text-center font-mono text-[0.5rem] text-[color:var(--tertiary)]" role="status">
            COPIED
          </p>
        )}
        {shareHint === "err" && (
          <p className="mt-1 text-center font-mono text-[0.5rem] text-[color:var(--error)]" role="status">
            COPY_FAILED
          </p>
        )}
      </section>

      <section className="mb-6 flex-1">
        <div className="mb-4 flex flex-col gap-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:flex-row sm:items-end sm:justify-between sm:gap-2">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-tighter uppercase">
            <span className="h-3 w-1 bg-[color:var(--primary)]" />
            Appraisal Grid
          </h2>
          <p
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[0.56rem] font-medium uppercase tracking-[0.14em] sm:text-[0.58rem]"
            style={{ color: "var(--fg-muted)" }}
          >
            {GRID_LEGEND.map((item, i) => (
              <Fragment key={item.key}>
                {i > 0 ? (
                  <span className="px-0.5 opacity-30" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-0.5 shrink-0 rounded-[1px]" style={{ background: item.bar }} aria-hidden />
                  {item.label}
                </span>
              </Fragment>
            ))}
          </p>
        </div>

        <div className="w-full space-y-6 border-y border-[color:var(--surface-high)]/40 bg-[color:var(--bg)] px-1 py-3 sm:px-1.5 sm:py-3">
          {practiceWorks.length > 0 ? (
            <div className="space-y-2 pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))]">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--secondary)]">
                  練習枠
                </h3>
                <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">CASE_00</span>
              </div>
              <div className="grid w-full max-w-[6.5rem] grid-cols-1 gap-1.5 sm:gap-2">
                {practiceWorks.map((work) => (
                  <WorkCatalogCell key={work.id} work={work} mounted={mounted} judgments={judgments} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2 pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--primary)]">
                第1段階
              </h3>
              <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">5件 · CASE 01–05</span>
            </div>
            <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
              {phase1Works.map((work) => (
                <WorkCatalogCell key={work.id} work={work} mounted={mounted} judgments={judgments} />
              ))}
              {phase1Done ? (
                <AuthenticityTruthInline
                  judgments={judgments}
                  rangeMin={1}
                  rangeMax={5}
                  colSpanClass="col-span-3"
                />
              ) : null}
            </div>
          </div>

          {phase1Done ? (
            <div className="space-y-2 pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--primary)]">
                  第2段階
                </h3>
                <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">10件 · CASE 06–15</span>
              </div>
              <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
                {phase2Works.map((work) => (
                  <WorkCatalogCell key={work.id} work={work} mounted={mounted} judgments={judgments} />
                ))}
                {phase2Done ? (
                  <AuthenticityTruthInline
                    judgments={judgments}
                    rangeMin={6}
                    rangeMax={15}
                    colSpanClass="col-span-2"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {phase2Done ? (
            <div className="space-y-2 pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--primary)]">
                  第3段階
                </h3>
                <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">5件 · CASE 16–20</span>
              </div>
              <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
                {phase3Works.map((work) => (
                  <WorkCatalogCell key={work.id} work={work} mounted={mounted} judgments={judgments} />
                ))}
                {catalog20Done ? (
                  <AuthenticityTruthInline
                    judgments={judgments}
                    rangeMin={16}
                    rangeMax={20}
                    colSpanClass="col-span-3"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {secretWorks.length > 0 ? (
            <div className="space-y-2 border-t border-[color:var(--surface-high)]/25 pt-4 pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))]">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--tertiary)]">
                  拡張鑑定枠
                </h3>
                <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">CASE_21</span>
              </div>
              <div className="grid w-full max-w-[6.5rem] grid-cols-1 gap-1.5 sm:gap-2">
                {secretWorks.map((work) => (
                  <WorkCatalogCell key={work.id} work={work} mounted={mounted} judgments={judgments} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {phaseReveal ? (
        <PhaseRevealOverlay
          kind={phaseReveal}
          judgments={judgments}
          onComplete={() => setPhaseReveal(null)}
        />
      ) : null}
    </main>
  );
}

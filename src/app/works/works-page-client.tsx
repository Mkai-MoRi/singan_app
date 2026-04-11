"use client";

import { Fragment, useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useJudgments } from "@/hooks/useJudgments";
import { usePracticeCaseUnlock } from "@/hooks/usePracticeCaseUnlock";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import { countJudgedInCatalog, listCatalogWorks } from "@/lib/worksCatalog";
import { Judgment } from "@/lib/judgmentsStorage";
import { judgmentGridCellStyle, judgmentMonoIdColor } from "@/lib/judgmentDisplayTokens";
import { buildSummaryShareAbsoluteUrl } from "@/lib/judgmentsUrlCodec";
import { clearWorksReturnSwipe, peekWorksReturnSwipe } from "@/lib/worksReturnSwipe";

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

export default function WorksPageClient() {
  const { judgments, mounted } = useJudgments();
  const { secretUnlocked, secretMounted } = useSecretCaseUnlock();
  const { practiceUnlocked, practiceMounted } = usePracticeCaseUnlock();
  const [shareHint, setShareHint] = useState<"idle" | "ok" | "err">("idle");
  const mainRef = useRef<HTMLElement>(null);

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

  return (
    <main
      ref={mainRef}
      className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-clip pb-4 pt-3"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 grid-backdrop opacity-70" aria-hidden />

      <section className="mb-8 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="mb-1 flex items-end justify-between">
          <span className="font-display text-[0.6875rem] font-bold tracking-[0.2em] text-[color:var(--primary)]">
            Appraisal Station: Active
          </span>
          <span className="font-mono text-[0.6rem]" style={{ color: "var(--fg-muted)" }}>
            [CASE_INDEX]
          </span>
        </div>
        <div className="mb-6 h-px w-full bg-[color:var(--hairline)]/40" />
        <div className="grid grid-cols-2 gap-4">
          <div className="border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] p-3">
            <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Case Progress</p>
            <p className="font-display text-2xl font-bold text-[color:var(--primary)]">
              {mounted ? Math.round((judged / slotTotal) * 100) : "—"}
              <span className="text-sm opacity-50" style={{ color: "var(--secondary)" }}>
                %
              </span>
            </p>
          </div>
          <div className="border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] p-3">
            <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Authentic</p>
            <p className="font-display text-2xl font-bold text-[color:var(--primary)]">
              {mounted ? String(authentic).padStart(2, "0") : "—"}
              <span className="text-sm opacity-50" style={{ color: "var(--secondary)" }}>
                pts
              </span>
            </p>
          </div>
        </div>
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

        <div className="w-full border-y border-[color:var(--surface-high)]/40 bg-[color:var(--bg)] px-1 py-1.5 sm:px-1.5 sm:py-2">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
          {catalog.map((work) => {
            const judgment: Judgment = mounted ? judgments[work.id] ?? "undecided" : "undecided";
            const judgedStyle = judgment !== "undecided" ? judgmentGridCellStyle[judgment] : null;

            return (
              <Link
                key={work.id}
                href={`/works/${work.id}`}
                className={`relative flex aspect-square flex-col justify-between border border-solid p-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)] transition-[background-color,border-color,filter,box-shadow] hover:brightness-[1.07] focus-visible:brightness-[1.05] sm:p-2.5 ${
                  judgedStyle
                    ? ""
                    : "border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] bg-[color:var(--surface-low)] hover:border-[color:color-mix(in_srgb,var(--primary)_42%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--surface-high)_38%,var(--surface-low))] hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
                }`}
                style={
                  judgedStyle
                    ? { backgroundColor: judgedStyle.bg, borderColor: judgedStyle.border }
                    : undefined
                }
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
          })}
          </div>
        </div>
      </section>

      <section className="ml-[max(0.75rem,env(safe-area-inset-left))] mr-[max(0.75rem,env(safe-area-inset-right))] border border-[color:var(--surface-high)]/30 bg-[color:var(--bg)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[0.6875rem] font-bold uppercase tracking-tight text-[color:var(--primary)]">
            Appraisal Ledger
          </span>
          <span className="font-mono text-[0.6rem]" style={{ color: "var(--fg-muted)" }}>
            [ON_DEVICE]
          </span>
        </div>
        <div className="space-y-2 text-[0.65rem]">
          <div className="flex justify-between border-b border-[color:var(--surface-high)]/15 pb-1">
            <span style={{ color: "var(--fg-muted)" }}>JUDGED_CASES</span>
            <span className="font-mono">{mounted ? judged : "—"} / {slotTotal}</span>
          </div>
          <div className="flex justify-between border-b border-[color:var(--surface-high)]/15 pb-1">
            <span style={{ color: "var(--fg-muted)" }}>AUTHENTIC_COUNT</span>
            <span className="font-mono text-[color:var(--primary)]">{mounted ? authentic : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--fg-muted)" }}>PENDING_HOLD</span>
            <span className="font-mono">
              {mounted ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "pending").length : "—"}
            </span>
          </div>
        </div>
        <Link
          href="/summary"
          className="mt-6 block w-full bg-[color:var(--primary)] py-3 text-center text-xs font-bold uppercase tracking-[0.2em] transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ color: "var(--on-primary)" }}
        >
          記録を確認
        </Link>
        <button
          type="button"
          onClick={() => void copyShareUrl()}
          disabled={!mounted}
          className="mt-2 w-full border border-[color:var(--surface-high)]/50 py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-widest transition-colors hover:border-[color:var(--primary)]/40 disabled:opacity-40"
          style={{ color: "var(--fg-muted)" }}
        >
          共有リンクをコピー（鑑定ログ）
        </button>
        {shareHint === "ok" && (
          <p className="mt-2 text-center font-mono text-[0.55rem] text-[color:var(--tertiary)]" role="status">
            COPIED
          </p>
        )}
        {shareHint === "err" && (
          <p className="mt-2 text-center font-mono text-[0.55rem] text-[color:var(--error)]" role="status">
            COPY_FAILED
          </p>
        )}
      </section>
    </main>
  );
}

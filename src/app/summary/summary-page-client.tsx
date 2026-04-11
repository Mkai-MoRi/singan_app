"use client";

import Link from "next/link";
import { useJudgments } from "@/hooks/useJudgments";
import { useOperatorName } from "@/hooks/useOperatorName";
import { usePracticeCaseUnlock } from "@/hooks/usePracticeCaseUnlock";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import { Judgment } from "@/lib/judgmentsStorage";
import { listCatalogWorks } from "@/lib/worksCatalog";
import {
  judgmentGridCellStyle,
  judgmentMonoIdColor,
  judgmentStatusStyle,
} from "@/lib/judgmentDisplayTokens";

const STATUS_LABEL: Record<Judgment, string> = {
  undecided: "PENDING",
  authentic: "VERIFIED",
  fake: "REJECTED",
  pending: "HOLD",
};

const STATUS_STYLE = judgmentStatusStyle;

export default function SummaryPageClient() {
  const { judgments, mounted } = useJudgments();
  const { name: operatorName, mounted: operatorMounted } = useOperatorName();
  const { secretUnlocked, secretMounted } = useSecretCaseUnlock();
  const { practiceUnlocked, practiceMounted } = usePracticeCaseUnlock();

  const catalog = listCatalogWorks({
    secretUnlocked: !!(secretMounted && secretUnlocked),
    practiceUnlocked: !!(practiceMounted && practiceUnlocked),
  });
  const slotTotal = catalog.length;

  const counts = { authentic: 0, fake: 0, pending: 0, undecided: 0 };
  if (mounted) {
    for (const work of catalog) {
      const j: Judgment = judgments[work.id] ?? "undecided";
      counts[j]++;
    }
  }

  const judged = mounted ? slotTotal - counts.undecided : 0;
  const successPct = mounted && judged > 0 ? Math.round((counts.authentic / judged) * 100) : mounted ? 0 : 0;

  const judgedCatalog = mounted
    ? catalog.filter((w) => (judgments[w.id] ?? "undecided") !== "undecided")
    : [];

  const padX = "pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]";

  return (
    <main className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto pb-6 pt-3">
      <div className="pointer-events-none fixed inset-0 -z-10 grid-backdrop opacity-60" aria-hidden />

      <header className={`space-y-1 pb-4 ${padX}`}>
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-bold uppercase tracking-tighter text-[color:var(--primary)] crt-glow">
            鑑定ログ
          </h1>
          <span className="shrink-0 font-mono text-[0.6875rem]" style={{ color: "var(--fg-muted)" }}>
            LOG_STAMP: LOCAL
          </span>
        </div>
        {operatorMounted && operatorName.trim() ? (
          <p className="font-mono text-[0.65rem] tracking-wide text-[color:var(--fg-muted)]">
            <span className="text-[color:var(--primary)]/85">EXAMINER</span>
            <span className="mx-1.5 text-[color:var(--hairline)]">::</span>
            <span className="text-[color:var(--secondary)]">{operatorName.trim()}</span>
          </p>
        ) : null}
        <div className="h-px w-full bg-[color:var(--hairline)]/40" />
      </header>

      <section className={`grid w-full grid-cols-2 gap-3 ${padX}`}>
        <div className="space-y-2 border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] p-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)]">
          <p className="font-display text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Cases Judged</p>
          <div className="flex min-h-[2.5rem] items-baseline gap-x-1 font-mono font-bold tabular-nums tracking-tight">
            {mounted ? (
              <>
                <span className="text-[2.125rem] leading-none text-[color:var(--primary-bright)]">{judged}</span>
                <span className="pb-0.5 text-[1.125rem] leading-none text-[color:var(--fg-muted)]" aria-hidden>
                  /
                </span>
                <span className="text-[1.25rem] leading-none text-[color:var(--secondary)]">{slotTotal}</span>
              </>
            ) : (
              <span className="text-[2.125rem] leading-none text-[color:var(--fg-muted)]">—</span>
            )}
          </div>
        </div>
        <div className="space-y-2 border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] p-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)]">
          <p className="font-display text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Authentic Ratio</p>
          <div className="flex min-h-[2.5rem] items-baseline gap-1">
            <span className="font-mono text-[2.125rem] font-bold leading-none tracking-tight text-[color:var(--primary-bright)] tabular-nums">
              {mounted ? successPct : "—"}
            </span>
            {mounted ? (
              <span className="font-mono text-[1.125rem] font-bold leading-none text-[color:var(--primary)]">%</span>
            ) : null}
            <span className="material-symbols-outlined mb-0.5 text-[color:var(--primary)] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8 flex flex-col">
        <div className={`mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between ${padX}`}>
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-tighter uppercase text-[color:var(--primary)]">
            <span className="h-3 w-1 shrink-0 bg-[color:var(--primary)]" aria-hidden />
            判定済みログ
          </h2>
          <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">Judged entries only</p>
        </div>
        <div className={`flex w-full flex-col gap-2 ${padX}`}>
          {mounted && judgedCatalog.length === 0 ? (
            <div className="border border-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)] bg-[color:var(--surface-low)] py-10 text-center shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_8%,transparent)]">
              <p className="font-mono text-[0.65rem] leading-relaxed text-[color:var(--fg-muted)]">
                判定済みの枠はまだありません。
                <br />
                一覧から鑑定を進めてください。
              </p>
            </div>
          ) : null}
          {judgedCatalog.map((work) => {
            const judgment = judgments[work.id] as Exclude<Judgment, "undecided">;
            const st = STATUS_STYLE[judgment];
            const highlight = judgment === "authentic";
            const cell = judgmentGridCellStyle[judgment];

            return (
              <Link
                key={work.id}
                href={`/works/${work.id}`}
                className="group flex w-full min-w-0 overflow-hidden border border-[color:color-mix(in_srgb,var(--outline-variant)_22%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)] transition-[filter,box-shadow] hover:brightness-[1.06] focus-visible:brightness-[1.04]"
                style={{ backgroundColor: cell.bg }}
              >
                <div className="w-1 shrink-0 self-stretch" style={{ background: st.border }} aria-hidden />
                <div className="flex min-w-0 flex-1 items-stretch gap-3 py-3 pl-3 pr-2 sm:gap-4 sm:py-3.5 sm:pl-4 sm:pr-3">
                  <div className="flex w-[3.5rem] shrink-0 flex-col justify-center border-r border-[color:var(--surface-high)]/45 pr-3 sm:w-[4rem]">
                    <span
                      className="mb-1 block font-mono text-[0.55rem] font-medium uppercase leading-none tracking-[0.14em]"
                      style={{ color: "color-mix(in srgb, var(--fg-muted) 72%, var(--secondary))" }}
                    >
                      IDX
                    </span>
                    <span
                      className="font-mono text-[1.35rem] font-bold tabular-nums leading-none tracking-tight sm:text-[1.5rem]"
                      style={{
                        color: judgmentMonoIdColor(judgment),
                        textShadow: "0 1px 0 color-mix(in srgb, var(--bg) 55%, transparent)",
                      }}
                    >
                      {String(work.id).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="min-w-0 truncate font-mono text-sm font-bold uppercase tracking-tight sm:text-[0.9375rem]"
                        style={{
                          color: highlight
                            ? "var(--primary)"
                            : judgment === "fake"
                              ? "var(--tertiary)"
                              : "var(--secondary)",
                        }}
                      >
                        {work.title}
                      </h3>
                      <div
                        className="shrink-0 px-2 py-0.5 font-display text-[0.58rem] font-bold uppercase tracking-wide sm:text-[0.6rem]"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {STATUS_LABEL[judgment]}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-[0.62rem] sm:text-[0.65rem]" style={{ color: "var(--fg-muted)" }}>
                        {work.caseName}
                        <span className="opacity-50"> · </span>
                        ON_DEVICE
                      </span>
                      <span
                        className="material-symbols-outlined shrink-0 text-sm opacity-40 transition-opacity group-hover:opacity-100"
                        style={{ fontVariationSettings: "'FILL' 0", color: "var(--fg-muted)" }}
                        aria-hidden
                      >
                        arrow_forward_ios
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        className={`relative mt-8 w-full overflow-hidden border border-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)] bg-[color:var(--surface-low)] py-4 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_8%,transparent)] ${padX}`}
      >
        <div
          className="absolute left-0 top-0 h-full w-1 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--tertiary)_35%,transparent)_0%,color-mix(in_srgb,var(--primary)_40%,transparent)_55%,color-mix(in_srgb,var(--tertiary)_22%,transparent)_100%)]"
          aria-hidden
        />
        <div className="flex flex-col gap-4 pl-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-[color:var(--primary)]/10">
              <span className="material-symbols-outlined text-[color:var(--primary)]" style={{ fontVariationSettings: "'FILL' 0" }}>
                history_edu
              </span>
            </div>
            <div>
              <p className="font-display text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Appraisal Status</p>
              <p className="font-mono text-xs" style={{ color: "var(--secondary)" }}>
                CATALOG: {mounted ? `${((judged / slotTotal) * 100).toFixed(1)}%` : "—"} REVIEWED
              </p>
            </div>
          </div>
          <div className="h-0.5 w-full overflow-hidden bg-[color:var(--surface-high)]">
            <div className="h-full bg-[color:var(--primary)] transition-[width] duration-300" style={{ width: mounted ? `${(judged / slotTotal) * 100}%` : "0%" }} />
          </div>
        </div>
      </section>

      <div className={`mt-6 ${padX}`}>
        <Link
          href="/works"
          className="block w-full bg-gradient-to-br from-[color:var(--primary-bright)] to-[color:var(--primary)] py-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--on-primary)] shadow-[0_0_22px_color-mix(in_srgb,var(--primary)_26%,transparent),0_0_42px_color-mix(in_srgb,var(--tertiary)_10%,transparent)] transition-all active:scale-[0.98] crt-glow"
        >
          一覧へ戻る
        </Link>
      </div>
    </main>
  );
}

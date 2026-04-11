"use client";

import Link from "next/link";
import { useJudgments } from "@/hooks/useJudgments";
import { useOperatorName } from "@/hooks/useOperatorName";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import { Judgment } from "@/lib/judgmentsStorage";
import { listCatalogWorks } from "@/lib/worksCatalog";
import { judgmentGridCellStyle, judgmentStatusStyle } from "@/lib/judgmentDisplayTokens";

const STATUS_LABEL: Record<Judgment, string> = {
  undecided: "PENDING",
  authentic: "VERIFIED",
  fake: "REJECTED",
  pending: "HOLD",
};

const STATUS_STYLE = judgmentStatusStyle;

export default function SummaryPage() {
  const { judgments, mounted } = useJudgments();
  const { name: operatorName, mounted: operatorMounted } = useOperatorName();
  const { secretUnlocked, secretMounted } = useSecretCaseUnlock();

  const catalog = listCatalogWorks(secretMounted && secretUnlocked);
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
            SYS_DATE: LOCAL
          </span>
        </div>
        {operatorMounted && operatorName.trim() ? (
          <p className="font-mono text-[0.65rem] tracking-wide text-[color:var(--fg-muted)]">
            <span className="text-[color:var(--primary)]/85">OPERATOR</span>
            <span className="mx-1.5 text-[color:var(--hairline)]">::</span>
            <span className="text-[color:var(--secondary)]">{operatorName.trim()}</span>
          </p>
        ) : null}
        <div className="h-px w-full bg-[color:var(--hairline)]/40" />
      </header>

      <section className="grid w-full grid-cols-2 gap-px border-y border-[color:var(--surface-high)]/20 bg-[color:var(--surface-high)]/20">
        <div className="space-y-1 bg-[color:var(--surface-low)] p-4">
          <p className="font-display text-[0.6875rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">[JUDGED]</p>
          <div className="flex items-end gap-1">
            <span className="font-display text-3xl font-bold leading-none tracking-tighter tabular-nums" style={{ color: "var(--secondary)" }}>
              {mounted ? judged : "—"}
              <span className="text-[color:var(--primary)]">/</span>
              {slotTotal}
            </span>
          </div>
        </div>
        <div className="space-y-1 bg-[color:var(--surface-low)] p-4">
          <p className="font-display text-[0.6875rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">[AUTH_RATE]</p>
          <div className="flex items-end gap-1">
            <span className="font-display text-3xl font-bold leading-none tracking-tighter text-[color:var(--primary)] tabular-nums">
              {mounted ? `${successPct}%` : "—"}
            </span>
            <span className="material-symbols-outlined mb-0.5 text-[color:var(--primary)] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-col">
        <div className={`mb-3 flex items-center justify-between ${padX}`}>
          <h2 className="font-display text-[0.6875rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Recent Executions</h2>
          <span className="font-display text-[0.6875rem] font-bold uppercase tracking-widest text-[color:var(--primary)] underline decoration-[color:var(--primary)]/40">
            FILTER: ALL
          </span>
        </div>
        <div className="flex w-full flex-col border-y border-[color:var(--surface-high)]/20">
          {catalog.map((work) => {
            const judgment: Judgment = mounted ? judgments[work.id] ?? "undecided" : "undecided";
            const st = STATUS_STYLE[judgment];
            const highlight = judgment === "authentic";

            return (
              <Link
                key={work.id}
                href={`/works/${work.id}`}
                className={`group flex w-full flex-col gap-2 border-b border-[color:var(--surface-high)]/15 border-l-2 py-3 transition-colors duration-75 last:border-b-0 hover:bg-[color:var(--surface-high)]/40 ${padX} ${
                  judgment === "undecided" ? "bg-[color:var(--surface-low)]" : ""
                }`}
                style={{
                  borderLeftColor: st.border,
                  ...(judgment !== "undecided"
                    ? { backgroundColor: judgmentGridCellStyle[judgment].bg }
                    : {}),
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-mono text-[0.6rem]" style={{ color: "var(--fg-muted)" }}>
                      [REF_{String(work.id).padStart(3, "0")}]
                    </p>
                    <h3
                      className="truncate font-mono text-sm font-bold uppercase tracking-tight"
                      style={{
                        color: highlight
                          ? "var(--primary)"
                          : judgment === "fake"
                            ? "var(--tertiary)"
                            : "var(--secondary)",
                      }}
                    >
                      {judgment !== "undecided" ? work.title : ""}
                    </h3>
                  </div>
                  <div
                    className="shrink-0 px-2 py-0.5 font-display text-[0.6rem] font-bold"
                    style={{ background: st.bg, color: st.fg }}
                  >
                    {mounted ? STATUS_LABEL[judgment] : "···"}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem]" style={{ color: "var(--fg-muted)" }}>
                    {work.caseName}
                    {" // "}
                    TS_LOCAL
                  </span>
                  <span
                    className="material-symbols-outlined text-sm opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ fontVariationSettings: "'FILL' 0", color: "var(--fg-muted)" }}
                    aria-hidden
                  >
                    arrow_forward_ios
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        className={`relative mt-6 w-full overflow-hidden border-y border-[color:var(--surface-high)]/20 bg-[color:var(--bg)] py-4 ${padX}`}
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
              <p className="font-display text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Audit Status</p>
              <p className="font-mono text-xs" style={{ color: "var(--secondary)" }}>
                BUFFER: {mounted ? `${((judged / slotTotal) * 100).toFixed(1)}%` : "—"} FILLED
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

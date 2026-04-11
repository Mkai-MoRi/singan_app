"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { WORKS } from "@/lib/dummyWorks";
import { useJudgments } from "@/hooks/useJudgments";
import { Judgment } from "@/lib/judgmentsStorage";
import { judgmentGridCellStyle } from "@/lib/judgmentDisplayTokens";
import { buildSummaryShareAbsoluteUrl } from "@/lib/judgmentsUrlCodec";

const STATUS_LABEL: Record<Judgment, string> = {
  undecided: "NULL",
  authentic: "AUTH",
  fake: "FAKE",
  pending: "HOLD",
};

function CellMarker({ judgment }: { judgment: Judgment }) {
  if (judgment === "authentic") {
    return (
      <div
        className="h-2 w-2 shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
        style={{ background: "var(--primary)" }}
      />
    );
  }
  if (judgment === "fake") {
    return (
      <div
        className="h-2 w-2 rounded-full shadow-[0_0_8px_color-mix(in_srgb,var(--tertiary)_50%,transparent)]"
        style={{ background: "var(--tertiary)" }}
      />
    );
  }
  if (judgment === "pending") {
    return <div className="h-0.5 w-3" style={{ background: "var(--secondary)" }} />;
  }
  return null;
}

export default function WorksPage() {
  const { judgments, mounted } = useJudgments();
  const [shareHint, setShareHint] = useState<"idle" | "ok" | "err">("idle");

  const copyShareUrl = useCallback(async () => {
    const url = buildSummaryShareAbsoluteUrl(judgments);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareHint("ok");
      window.setTimeout(() => setShareHint("idle"), 2400);
    } catch {
      setShareHint("err");
      window.setTimeout(() => setShareHint("idle"), 3200);
    }
  }, [judgments]);

  const judged = mounted ? Object.values(judgments).filter((v) => v !== "undecided").length : 0;
  const authentic = mounted ? Object.values(judgments).filter((v) => v === "authentic").length : 0;

  return (
    <main className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col pb-4 pt-3">
      <div className="pointer-events-none fixed inset-0 -z-10 grid-backdrop opacity-70" aria-hidden />

      <section className="mb-8 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="mb-1 flex items-end justify-between">
          <span className="font-display text-[0.6875rem] font-bold tracking-[0.2em] text-[color:var(--primary)]">
            System Status: Active
          </span>
          <span className="font-mono text-[0.6rem]" style={{ color: "var(--fg-muted)" }}>
            [SEQ_GRID_01]
          </span>
        </div>
        <div className="mb-6 h-px w-full bg-[color:var(--hairline)]/40" />
        <div className="grid grid-cols-2 gap-4">
          <div className="border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] p-3">
            <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-widest text-[color:var(--fg-muted)]">Batch Progress</p>
            <p className="font-display text-2xl font-bold text-[color:var(--primary)]">
              {mounted ? Math.round((judged / 20) * 100) : "—"}
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
        <div className="mb-4 flex items-center justify-between pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-tighter uppercase">
            <span className="h-3 w-1 bg-[color:var(--primary)]" />
            Diagnostic Grid
          </h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.6rem] uppercase" style={{ color: "var(--fg-muted)" }}>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-[color:var(--primary)] shadow-[0_0_6px_color-mix(in_srgb,var(--primary)_45%,transparent)]" />
              Auth
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-[color:var(--tertiary)] shadow-[0_0_6px_color-mix(in_srgb,var(--tertiary)_40%,transparent)]" />
              Fake
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 border border-[color:var(--secondary)]/45 bg-[color:var(--secondary)]/15" />
              Hold
            </span>
          </div>
        </div>

        <div className="w-full border-y border-[color:var(--surface-high)]/25 bg-[color:var(--surface-high)]/20">
          <div className="grid w-full grid-cols-4 gap-px">
          {WORKS.map((work) => {
            const judgment: Judgment = mounted ? judgments[work.id] ?? "undecided" : "undecided";
            const judgedStyle = judgment !== "undecided" ? judgmentGridCellStyle[judgment] : null;

            return (
              <Link
                key={work.id}
                href={`/works/${work.id}`}
                className={`relative flex aspect-square flex-col justify-between border border-transparent p-2 transition-colors hover:brightness-[1.06] ${
                  judgedStyle
                    ? "border-solid"
                    : "bg-[color:var(--surface-low)] hover:bg-[color:var(--surface-high)]/40"
                }`}
                style={
                  judgedStyle
                    ? { backgroundColor: judgedStyle.bg, borderColor: judgedStyle.border }
                    : undefined
                }
                aria-label={`${work.caseName}: ${STATUS_LABEL[judgment]}`}
              >
                <span className="font-mono text-[0.6rem] opacity-50" style={{ color: "var(--fg-muted)" }}>
                  {String(work.id).padStart(2, "0")}
                </span>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <CellMarker judgment={judgment} />
                </div>
                <span
                  className="self-end text-[0.5rem] font-bold uppercase"
                  style={{
                    color:
                      judgment === "authentic"
                        ? "var(--primary)"
                        : judgment === "fake"
                          ? "var(--tertiary)"
                          : judgment === "pending"
                            ? "var(--secondary)"
                            : "color-mix(in srgb, var(--fg-muted) 42%, transparent)",
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
            Point Trace: Archive
          </span>
          <span className="font-mono text-[0.6rem]" style={{ color: "var(--fg-muted)" }}>
            [LOCAL_STORE]
          </span>
        </div>
        <div className="space-y-2 text-[0.65rem]">
          <div className="flex justify-between border-b border-[color:var(--surface-high)]/15 pb-1">
            <span style={{ color: "var(--fg-muted)" }}>JUDGED_TOTAL</span>
            <span className="font-mono">{mounted ? judged : "—"} / 20</span>
          </div>
          <div className="flex justify-between border-b border-[color:var(--surface-high)]/15 pb-1">
            <span style={{ color: "var(--fg-muted)" }}>AUTH_SIGNAL</span>
            <span className="font-mono text-[color:var(--primary)]">{mounted ? authentic : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--fg-muted)" }}>PENDING_BUFFER</span>
            <span className="font-mono">{mounted ? Object.values(judgments).filter((v) => v === "pending").length : "—"}</span>
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

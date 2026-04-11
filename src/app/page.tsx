"use client";

import Link from "next/link";
import { useJudgments } from "@/hooks/useJudgments";

export default function HomePage() {
  const { judgments, mounted } = useJudgments();
  const judged = mounted ? Object.values(judgments).filter((v) => v !== "undecided").length : 0;
  const authentic = mounted ? Object.values(judgments).filter((v) => v === "authentic").length : 0;
  const pct = Math.round((judged / 20) * 100);
  const scanPct = mounted ? ((judged / 20) * 100).toFixed(1) : null;

  return (
    <main className="relative mx-auto flex min-h-0 max-w-lg flex-1 flex-col gap-4 px-5 py-4 md:max-w-4xl md:grid md:grid-cols-12 md:gap-8 md:py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 grid-backdrop opacity-80" aria-hidden />

      <section className="flex flex-col gap-3 md:col-span-7 md:gap-8">
        <div className="space-y-1 md:space-y-2">
          <p className="font-display text-[0.6875rem] font-bold tracking-[0.3em] text-[color:var(--primary)]">[SYSTEM_READY]</p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tighter glitch-text md:text-5xl">
            贋作鑑定端末
          </h1>
          <p className="hidden font-display text-xs font-bold tracking-[0.2em] text-[color:var(--fg-muted)] md:block">
            THE_DIGITAL_ARCHIVE_OF_TRUTH
          </p>
        </div>

        <div className="relative overflow-hidden border border-[color:var(--surface-high)]/30">
          <div
            className="h-24 w-full md:h-64"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, transparent) 0%, transparent 46%), linear-gradient(315deg, color-mix(in srgb, var(--tertiary) 10%, transparent) 0%, transparent 40%), linear-gradient(0deg, var(--bg) 0%, transparent 55%), repeating-linear-gradient(90deg, color-mix(in srgb, var(--primary) 10%, transparent) 0 1px, transparent 1px 24px), repeating-linear-gradient(0deg, color-mix(in srgb, var(--primary) 10%, transparent) 0 1px, transparent 1px 24px)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[color:var(--bg)] via-transparent to-transparent" />
        </div>

        <p className="max-w-sm text-xs leading-snug normal-case md:text-sm md:leading-relaxed" style={{ color: "var(--secondary)" }}>
          20点を鑑定し、本物・偽物・保留を記録。結果はこの端末内のみに保存されます。
        </p>

        <div className="hidden items-center gap-4 border-l border-[color:var(--primary)]/40 py-2 pl-4 md:flex">
          <div className="flex flex-col">
            <span className="text-[0.6rem] uppercase tracking-widest text-[color:var(--fg-muted)]">Protocol</span>
            <span className="font-display text-lg font-bold text-[color:var(--tertiary)]">STRICT_VALIDATION</span>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-1 flex-col gap-3 md:col-span-5 md:justify-center md:gap-6">
        <div className="border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] p-4 md:p-6">
          <div className="mb-3 flex items-end justify-between md:mb-4">
            <div className="flex flex-col">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">Judgement Status</span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold tabular-nums md:text-4xl">{mounted ? judged : "—"}</span>
                <span className="text-xs md:text-sm" style={{ color: "var(--fg-muted)" }}>
                  / 20
                </span>
              </div>
            </div>
          </div>
          <div className="mb-3 flex h-1 w-full bg-[color:var(--surface-high)]">
            <div className="h-full bg-[color:var(--primary)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-mono text-[0.65rem] tabular-nums md:text-xs" style={{ color: "var(--fg-muted)" }}>
            {scanPct !== null ? (
              <>
                進捗 <span className="text-[color:var(--secondary)]">{scanPct}%</span>
                <span className="mx-2 text-[color:var(--hairline)]">·</span>
                本物 <span className="text-[color:var(--primary)]">{authentic}</span> 点
              </>
            ) : (
              "—"
            )}
          </p>
        </div>

        <Link
          href="/works"
          className="btn-primary group mt-auto flex items-center justify-center gap-2 py-4 text-center text-lg font-bold tracking-tighter shadow-[0_0_22px_-4px_color-mix(in_srgb,var(--primary)_32%,transparent),0_0_48px_-12px_color-mix(in_srgb,var(--tertiary)_14%,transparent)] transition-all md:mt-0 md:gap-3 md:py-6 md:text-xl"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary)",
            fontFamily: "var(--font-space-grotesk), Space Grotesk, sans-serif",
          }}
        >
          鑑定を開始
          <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1 md:text-2xl" style={{ fontVariationSettings: "'FILL' 0" }}>
            arrow_forward
          </span>
        </Link>
      </aside>
    </main>
  );
}

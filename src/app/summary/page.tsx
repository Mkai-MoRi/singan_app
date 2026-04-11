"use client";

import Link from "next/link";
import { WORKS } from "@/lib/dummyWorks";
import { useJudgments } from "@/hooks/useJudgments";
import { Judgment } from "@/lib/judgmentsStorage";

const STATUS_LABEL: Record<Judgment, string> = {
  undecided: "---",
  authentic: "本物",
  fake: "偽物",
  pending: "保留",
};

const STATUS_CLASS: Record<Judgment, string> = {
  undecided: "status-undecided",
  authentic: "status-authentic",
  fake: "status-fake",
  pending: "status-pending",
};

export default function SummaryPage() {
  const { judgments, mounted } = useJudgments();

  const counts = {
    authentic: 0,
    fake: 0,
    pending: 0,
    undecided: 0,
  };

  if (mounted) {
    for (const work of WORKS) {
      const j: Judgment = judgments[work.id] ?? "undecided";
      counts[j]++;
    }
  }

  return (
    <main className="max-w-md mx-auto min-h-dvh flex flex-col px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>
          // REPORT
        </p>
        <h1 className="text-lg font-bold mb-4" style={{ color: "var(--fg)" }}>
          結果確認
        </h1>

        {/* Count summary */}
        {mounted && (
          <div
            className="grid grid-cols-4 text-center text-xs py-3"
            style={{ border: "1px solid var(--line)" }}
          >
            <div className="py-1" style={{ borderRight: "1px solid var(--line)" }}>
              <div className="status-authentic text-base font-bold">{counts.authentic}</div>
              <div style={{ color: "var(--fg-muted)" }}>本物</div>
            </div>
            <div className="py-1" style={{ borderRight: "1px solid var(--line)" }}>
              <div className="status-fake text-base font-bold">{counts.fake}</div>
              <div style={{ color: "var(--fg-muted)" }}>偽物</div>
            </div>
            <div className="py-1" style={{ borderRight: "1px solid var(--line)" }}>
              <div className="status-pending text-base font-bold">{counts.pending}</div>
              <div style={{ color: "var(--fg-muted)" }}>保留</div>
            </div>
            <div className="py-1">
              <div className="status-undecided text-base font-bold">{counts.undecided}</div>
              <div style={{ color: "var(--fg-muted)" }}>未判定</div>
            </div>
          </div>
        )}
      </div>

      {/* Work list */}
      <div className="flex-1" style={{ borderTop: "1px solid var(--line)" }}>
        {WORKS.map((work) => {
          const judgment: Judgment = mounted
            ? (judgments[work.id] ?? "undecided")
            : "undecided";
          const isUndecided = judgment === "undecided";

          return (
            <Link
              key={work.id}
              href={`/works/${work.id}`}
              className="flex items-center justify-between py-3 px-1 transition-colors"
              style={{
                borderBottom: "1px solid var(--line)",
                opacity: isUndecided ? 0.45 : 1,
              }}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className="text-xs font-bold tabular-nums w-6"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {String(work.id).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm" style={{ color: "var(--fg)" }}>
                    {work.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    {work.caseName}
                  </p>
                </div>
              </div>
              <span className={`text-xs tracking-wider ${STATUS_CLASS[judgment]}`}>
                {mounted ? STATUS_LABEL[judgment] : "···"}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="pt-4 pb-[env(safe-area-inset-bottom,0px)] flex justify-between"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <Link
          href="/"
          className="text-xs tracking-wider"
          style={{ color: "var(--fg-muted)" }}
        >
          ← ホーム
        </Link>
        <Link
          href="/works"
          className="text-xs tracking-wider"
          style={{ color: "var(--accent)" }}
        >
          一覧へ →
        </Link>
      </div>
    </main>
  );
}

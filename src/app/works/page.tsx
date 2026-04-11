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

export default function WorksPage() {
  const { judgments, mounted } = useJudgments();

  const judged = Object.values(judgments).filter((v) => v !== "undecided").length;

  return (
    <main className="max-w-md mx-auto min-h-dvh flex flex-col px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-8 px-2">
        <div>
          <p className="text-xs tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>
            // ARCHIVE
          </p>
          <h1 className="text-lg font-bold" style={{ color: "var(--fg)" }}>
            作品一覧
          </h1>
        </div>
        <div className="text-right">
          <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
            {mounted ? judged : "—"} / 20 判定済
          </span>
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-4 flex-1 mb-8"
        style={{ border: "1px solid var(--line)" }}
      >
        {WORKS.map((work) => {
          const judgment: Judgment = mounted
            ? (judgments[work.id] ?? "undecided")
            : "undecided";

          return (
            <Link
              key={work.id}
              href={`/works/${work.id}`}
              className="flex flex-col items-center justify-center py-5 transition-colors"
              style={{
                borderRight: "1px solid var(--line)",
                borderBottom: "1px solid var(--line)",
                background:
                  judgment !== "undecided" ? "rgba(255,255,255,0.015)" : "transparent",
              }}
              aria-label={`${work.caseName}: ${STATUS_LABEL[judgment]}`}
            >
              <span
                className="text-lg font-bold leading-none mb-1"
                style={{ color: judgment !== "undecided" ? "var(--fg)" : "var(--fg-muted)" }}
              >
                {String(work.id).padStart(2, "0")}
              </span>
              <span className={`text-xs ${STATUS_CLASS[judgment]}`}>
                {mounted ? STATUS_LABEL[judgment] : "···"}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer nav */}
      <div
        className="flex justify-between items-center pt-4"
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
          href="/summary"
          className="text-xs tracking-wider"
          style={{ color: "var(--accent)" }}
        >
          結果確認 →
        </Link>
      </div>
    </main>
  );
}

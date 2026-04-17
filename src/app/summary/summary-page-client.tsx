"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useJudgments } from "@/hooks/useJudgments";
import { useOperatorName } from "@/hooks/useOperatorName";
import { usePracticeCaseUnlock } from "@/hooks/usePracticeCaseUnlock";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import { useSummarySearchPins } from "@/hooks/useSummarySearchPins";
import type { Work } from "@/lib/dummyWorks";
import { Judgment } from "@/lib/judgmentsStorage";
import { findCatalogWorkBySearchQuery } from "@/lib/workSearch";
import { listCatalogWorks } from "@/lib/worksCatalog";
import { judgmentGridCellStyle, judgmentStatusStyle } from "@/lib/judgmentDisplayTokens";

const STATUS_LABEL: Record<Judgment, string> = {
  undecided: "PENDING",
  authentic: "VERIFIED",
  fake: "REJECTED",
  pending: "HOLD",
};

const STATUS_STYLE = judgmentStatusStyle;

/** 記録ログ上でキャプションをタップ開閉（ネイティブ disclosure） */
function WorkLogCaptionDisclosure({ caption }: { caption: string }) {
  return (
    <details className="border-t border-[color:var(--surface-high)]/45 bg-[color:color-mix(in_srgb,var(--bg)_32%,var(--surface-low))]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 pl-3 pr-2 marker:content-none sm:py-3 sm:pl-4 sm:pr-3 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[0.62rem] font-medium uppercase tracking-wide text-[color:var(--fg-muted)]">
          キャプションを表示
        </span>
        <span
          className="material-symbols-outlined shrink-0 text-base text-[color:var(--fg-muted)] opacity-80"
          style={{ fontVariationSettings: "'FILL' 0" }}
          aria-hidden
        >
          expand_more
        </span>
      </summary>
      <div className="border-t border-[color:var(--surface-high)]/35 px-3 pb-3 pt-2 sm:px-4">
        <p className="whitespace-pre-line text-left text-[0.7rem] font-normal normal-case leading-relaxed tracking-normal text-[color:var(--secondary)] sm:text-[0.72rem]">
          {caption}
        </p>
      </div>
    </details>
  );
}

export default function SummaryPageClient() {
  const router = useRouter();
  const { judgments, mounted } = useJudgments();
  const { name: operatorName, mounted: operatorMounted } = useOperatorName();
  const { secretUnlocked, secretMounted, tryUnlockWithPhrase } = useSecretCaseUnlock();
  const { practiceUnlocked, practiceMounted, tryUnlockPracticeWithPhrase } = usePracticeCaseUnlock();
  const { pins, addPin, mounted: pinsMounted } = useSummarySearchPins();

  const [searchDraft, setSearchDraft] = useState("");
  const [searchHint, setSearchHint] = useState<"idle" | "ok_secret" | "ok_practice" | "not_found" | "logged">("idle");

  useEffect(() => {
    if (searchHint === "not_found") {
      const t = window.setTimeout(() => setSearchHint("idle"), 2400);
      return () => window.clearTimeout(t);
    }
    if (searchHint === "logged") {
      const t = window.setTimeout(() => setSearchHint("idle"), 2200);
      return () => window.clearTimeout(t);
    }
  }, [searchHint]);

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

  const pinnedWorksInCatalog = pins
    .map((pinId) => catalog.find((w) => w.id === pinId))
    .filter((w): w is Work => w != null);

  const onWorkSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const raw = searchDraft.trim();
    if (!raw) return;
    if (tryUnlockWithPhrase(raw)) {
      setSearchHint("ok_secret");
      setSearchDraft("");
      router.push("/works/21");
      return;
    }
    if (tryUnlockPracticeWithPhrase(raw)) {
      setSearchHint("ok_practice");
      setSearchDraft("");
      router.push("/works/0");
      return;
    }
    const cat = listCatalogWorks({
      secretUnlocked: !!(secretMounted && secretUnlocked),
      practiceUnlocked: !!(practiceMounted && practiceUnlocked),
    });
    const hit = findCatalogWorkBySearchQuery(cat, raw);
    if (hit) {
      addPin(hit.id);
      setSearchDraft("");
      setSearchHint("logged");
      return;
    }
    setSearchHint("not_found");
  };

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
            作品検索
          </h2>
          <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">Catalog lookup</p>
        </div>
        <div className={`flex flex-col gap-2 ${padX}`}>
          <form
            onSubmit={onWorkSearchSubmit}
            className="border border-[color:var(--surface-high)]/40 bg-[color:var(--surface-low)]/70 p-4 md:p-5"
          >
            <label htmlFor="summary-work-search" className="sr-only">
              作品検索クエリ
            </label>
            <div className="flex gap-2">
              <input
                id="summary-work-search"
                name="workSearch"
                type="text"
                autoComplete="off"
                placeholder="例: Specular / スペキュラー"
                value={searchDraft}
                onChange={(e) => {
                  setSearchDraft(e.target.value);
                  if (searchHint !== "idle") setSearchHint("idle");
                }}
                className="min-w-0 flex-1 border border-[color:var(--hairline)]/50 bg-[color:var(--bg)] px-3 py-2.5 font-mono text-sm text-[color:var(--secondary)] outline-none transition-[border-color,box-shadow] placeholder:text-[color:var(--fg-muted)]/70 focus:border-[color:var(--tertiary)]/50 focus:shadow-[0_0_0_1px_color-mix(in_srgb,var(--tertiary)_30%,transparent)]"
              />
              <button
                type="submit"
                className="shrink-0 border border-[color:var(--tertiary)]/45 bg-[color:var(--tertiary)]/10 px-3 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-[color:var(--tertiary)] transition-colors hover:bg-[color:var(--tertiary)]/18"
              >
                送信
              </button>
            </div>
            <p className="mt-2 text-[0.6rem] leading-relaxed text-[color:var(--fg-muted)]">
              カタログに存在する作品名・別名で検索し、下のログにメモとして追記します（未判定のままでも表示されます）。解禁フレーズもこの欄から入力できます。
            </p>
            {secretMounted && secretUnlocked ? (
              <p className="mt-2 font-mono text-[0.6rem] text-[color:var(--tertiary)]">拡張鑑定枠 ACTIVE（21枠）</p>
            ) : null}
            {practiceMounted && practiceUnlocked ? (
              <p className="mt-2 font-mono text-[0.6rem] text-[color:var(--secondary)]">練習枠 ACTIVE（CASE_00）</p>
            ) : null}
            {searchHint === "ok_secret" ? (
              <p className="mt-2 font-mono text-[0.6rem] text-[color:var(--tertiary)]" role="status">
                CLEARANCE_ACCEPTED
              </p>
            ) : null}
            {searchHint === "ok_practice" ? (
              <p className="mt-2 font-mono text-[0.6rem] text-[color:var(--secondary)]" role="status">
                DRILL_MODE_ON
              </p>
            ) : null}
            {searchHint === "not_found" ? (
              <p className="mt-2 font-mono text-[0.6rem] text-[color:var(--error)]" role="status">
                NO_MATCH
              </p>
            ) : null}
            {searchHint === "logged" ? (
              <p className="mt-2 font-mono text-[0.6rem] text-[color:var(--primary)]" role="status">
                LOG_APPEND_OK
              </p>
            ) : null}
          </form>
        </div>
      </section>

      {pinsMounted && pinnedWorksInCatalog.length > 0 ? (
        <section className="mt-8 flex flex-col">
          <div className={`mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between ${padX}`}>
            <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-tighter uppercase text-[color:var(--primary)]">
              <span className="h-3 w-1 shrink-0 bg-[color:var(--primary)]" aria-hidden />
              検索で追記した記録
            </h2>
            <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">Pinned from search</p>
          </div>
          <div className={`flex w-full flex-col gap-2 ${padX}`}>
            {pinnedWorksInCatalog.map((work) => {
              const judgment: Judgment = mounted ? judgments[work.id] ?? "undecided" : "undecided";
              const st = STATUS_STYLE[judgment];
              const cell = judgment !== "undecided" ? judgmentGridCellStyle[judgment] : null;
              const highlight = judgment === "authentic";

              return (
                <div
                  key={work.id}
                  className="flex flex-col overflow-hidden border border-[color:color-mix(in_srgb,var(--outline-variant)_22%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)] transition-[filter,box-shadow] hover:brightness-[1.06] focus-within:brightness-[1.04]"
                >
                  <Link
                    href={`/works/${work.id}`}
                    className="group flex min-w-0 w-full"
                    style={cell ? { backgroundColor: cell.bg } : { backgroundColor: "var(--surface-low)" }}
                  >
                    <div className="w-1 shrink-0 self-stretch" style={{ background: st.border }} aria-hidden />
                    <div className="min-w-0 flex-1 space-y-2 py-3 pl-3 pr-2 sm:py-3.5 sm:pl-4 sm:pr-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-0.5">
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
                          <p className="font-mono text-[0.62rem] text-[color:var(--fg-muted)] sm:text-[0.65rem]">{work.meta}</p>
                        </div>
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
                  </Link>
                  {work.caption ? <WorkLogCaptionDisclosure caption={work.caption} /> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

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
              <div
                key={work.id}
                className="flex flex-col overflow-hidden border border-[color:color-mix(in_srgb,var(--outline-variant)_22%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)] transition-[filter,box-shadow] hover:brightness-[1.06] focus-within:brightness-[1.04]"
              >
                <Link
                  href={`/works/${work.id}`}
                  className="group flex min-w-0 w-full"
                  style={{ backgroundColor: cell.bg }}
                >
                  <div className="w-1 shrink-0 self-stretch" style={{ background: st.border }} aria-hidden />
                  <div className="min-w-0 flex-1 space-y-2 py-3 pl-3 pr-2 sm:py-3.5 sm:pl-4 sm:pr-3">
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
                </Link>
                {work.caption ? <WorkLogCaptionDisclosure caption={work.caption} /> : null}
              </div>
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

"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useJudgments } from "@/hooks/useJudgments";
import { useOperatorName } from "@/hooks/useOperatorName";
import { usePracticeCaseUnlock } from "@/hooks/usePracticeCaseUnlock";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import { OPERATOR_NAME_MAX_LEN } from "@/lib/operatorStorage";
import { countJudgedInCatalog, listCatalogWorks } from "@/lib/worksCatalog";
import { firstUndecidedAccessibleInCatalog } from "@/lib/workPhases";
import { resetTerminal } from "@/lib/terminalReset";

export default function HomePageClient() {
  const { judgments, mounted } = useJudgments();
  const { secretUnlocked, secretMounted } = useSecretCaseUnlock();
  const { practiceUnlocked, practiceMounted } = usePracticeCaseUnlock();
  const { name: operatorName, setName: setOperatorName, commitName: commitOperatorName, mounted: operatorMounted } =
    useOperatorName();

  const catalogFlags = {
    secretUnlocked: !!(secretMounted && secretUnlocked),
    practiceUnlocked: !!(practiceMounted && practiceUnlocked),
  };
  const catalog = listCatalogWorks(catalogFlags);
  const slotTotal = catalog.length;
  const judged = mounted ? countJudgedInCatalog(catalog, judgments) : 0;
  const authentic = mounted
    ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "authentic").length
    : 0;
  const fake = mounted ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "fake").length : 0;
  const pending = mounted ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "pending").length : 0;
  const pct = Math.round((judged / slotTotal) * 100);
  const scanPct = mounted ? ((judged / slotTotal) * 100).toFixed(1) : null;
  const nextWork = mounted ? firstUndecidedAccessibleInCatalog(judgments, catalog) : null;
  const remaining = slotTotal - judged;

  const onResetTerminal = useCallback(() => {
    const ok = window.confirm(
      "端末に保存された鑑定記録・呼称・拡張枠（秘密・練習）の解除状態・記録タブの作品検索ピンをすべて消去します。共有用 URL の取り込み（?j=）も解除されます。続行しますか？"
    );
    if (!ok) return;
    resetTerminal();
  }, []);

  const callsign =
    operatorMounted && operatorName.trim() ? operatorName.trim() : null;

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
          {operatorMounted ? (
            <p className="font-mono text-[0.65rem] leading-relaxed tracking-wide text-[color:var(--fg-muted)] md:text-xs">
              <span className="text-[color:var(--primary)]/90">EXAMINER</span>
              <span className="mx-1.5 text-[color:var(--hairline)]">::</span>
              <span className="text-[color:var(--secondary)]">{callsign ?? "NO_CALLSIGN"}</span>
              <span className="mx-1.5 text-[color:var(--hairline)]">·</span>
              <span className="tabular-nums">QUEUE {mounted ? remaining : "—"}</span>
            </p>
          ) : null}
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
        <div className="border border-[color:var(--surface-high)]/35 bg-[color:var(--surface-low)]/80 p-4 md:p-5">
          <label htmlFor="operator-callsign" className="mb-2 block text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">
            鑑定士呼称
          </label>
          <input
            id="operator-callsign"
            name="operator"
            type="text"
            autoComplete="nickname"
            placeholder="呼び出し名（任意）"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value.slice(0, OPERATOR_NAME_MAX_LEN))}
            onBlur={() => commitOperatorName(operatorName)}
            className="w-full border border-[color:var(--hairline)]/50 bg-[color:var(--bg)] px-3 py-2.5 font-mono text-sm text-[color:var(--secondary)] outline-none transition-[border-color,box-shadow] placeholder:text-[color:var(--fg-muted)]/70 focus:border-[color:var(--primary)]/55 focus:shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
          />
          <p className="mt-2 text-[0.6rem] leading-relaxed text-[color:var(--fg-muted)]">
            端末内のみに保存。記録タブのヘッダにも表示されます。
          </p>
        </div>

        <div className="border border-[color:var(--error)]/25 bg-[color:var(--surface-low)]/60 p-4 md:p-5">
          <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">
            メンテナンス
          </p>
          <p className="mb-3 text-[0.65rem] leading-relaxed text-[color:var(--secondary)]">
            このブラウザに保存した端末データをすべて消去し、出荷時相当の状態に戻します。
          </p>
          <button
            type="button"
            onClick={onResetTerminal}
            className="w-full border border-[color:var(--error)]/45 bg-[color:var(--error)]/8 px-3 py-2.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-[color:var(--error)] transition-colors hover:bg-[color:var(--error)]/14"
          >
            端末をリセット
          </button>
        </div>

        <p className="border border-[color:var(--surface-high)]/30 bg-[color:var(--surface-low)]/50 px-3 py-2 font-mono text-[0.6rem] leading-relaxed text-[color:var(--fg-muted)]">
          秘密枠・練習枠の解禁フレーズは、<Link href="/summary" className="text-[color:var(--tertiary)] underline-offset-2 hover:underline">記録タブ</Link>
          の「作品検索」から入力できます。
        </p>

        {mounted && nextWork ? (
          <Link
            href={`/works/${nextWork.id}`}
            className="group border-l-2 border-[color:var(--tertiary)]/60 bg-[color:var(--surface-low)]/60 px-4 py-3 transition-colors hover:border-[color:var(--tertiary)] md:px-5 md:py-4"
          >
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">Next case</p>
            <p className="mt-1 font-display text-lg font-bold tracking-tight text-[color:var(--tertiary)] md:text-xl">
              {nextWork.caseName}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--secondary)]">{nextWork.title}</p>
            <p className="mt-2 inline-flex items-center gap-1 font-mono text-[0.65rem] text-[color:var(--primary)]">
              この枠から再開
              <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-0.5" style={{ fontVariationSettings: "'FILL' 0" }}>
                chevron_right
              </span>
            </p>
          </Link>
        ) : null}

        {mounted && judged === slotTotal && slotTotal > 0 ? (
          <Link
            href="/summary"
            className="border-l-2 border-[color:var(--primary)]/50 bg-[color:var(--surface-low)]/60 px-4 py-3 md:px-5 md:py-4"
          >
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">Archive</p>
            <p className="mt-1 font-display text-base font-bold text-[color:var(--primary)]">
              全{slotTotal}枠 鑑定完了
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-[color:var(--secondary)]">記録タブで一覧を確認できます。</p>
          </Link>
        ) : null}

        <div className="border-l-2 border-[color:var(--primary)] bg-[color:var(--surface-low)] p-4 md:p-6">
          <div className="mb-3 flex items-end justify-between md:mb-4">
            <div className="flex flex-col">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">Judgement Status</span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold tabular-nums md:text-4xl">{mounted ? judged : "—"}</span>
                <span className="text-xs md:text-sm" style={{ color: "var(--fg-muted)" }}>
                  / {slotTotal}
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
                本物 <span className="text-[color:var(--primary)]">{authentic}</span>
                <span className="mx-2 text-[color:var(--hairline)]">·</span>
                偽物 <span className="text-[color:var(--error)]">{fake}</span>
                <span className="mx-2 text-[color:var(--hairline)]">·</span>
                保留 <span className="text-[color:var(--tertiary)]">{pending}</span>
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

"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppraisalSessionHud from "@/components/AppraisalSessionHud";
import AuthenticityTruthInline from "@/components/AuthenticityTruthInline";
import PhaseRevealOverlay, { type PhaseRevealKind } from "@/components/PhaseRevealOverlay";
import { useJudgments } from "@/hooks/useJudgments";
import { usePracticeCaseUnlock } from "@/hooks/usePracticeCaseUnlock";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import type { Work } from "@/lib/dummyWorks";
import { judgmentGridCellStyle, judgmentMonoIdColor } from "@/lib/judgmentDisplayTokens";
import { Judgment, type JudgmentRecord } from "@/lib/judgmentsStorage";
import { buildSummaryShareAbsoluteUrl } from "@/lib/judgmentsUrlCodec";
import { consumeTutorialRevealIntent } from "@/lib/tutorialRevealIntent";
import { countJudgedInCatalog, listCatalogWorks } from "@/lib/worksCatalog";
import { clearWorksReturnSwipe, peekWorksReturnSwipe } from "@/lib/worksReturnSwipe";
import { runWorksCatalogRevealFeedback } from "@/lib/worksCatalogRevealFeedback";
import { isCoreCatalogComplete, isCorePhase1Complete, isCorePhase2Complete } from "@/lib/workPhases";

function phaseUnlockHeading(kind: PhaseRevealKind): string {
  switch (kind) {
    case "afterPhase1":
      return "第2段階解禁";
    case "afterPhase2":
      return "第3段階解禁";
    default:
      return "全段階 解禁";
  }
}

function phaseUnlockScrollTargetId(kind: PhaseRevealKind): string {
  if (kind === "afterPhase1") return "works-appraisal-phase-2";
  return "works-appraisal-phase-3";
}

/** チュートリアル直後・100問演出など、グリッド同期時にカタログ下端までゆっくりスクロール */
function useWorksCatalogRevealScroll(rootRef: RefObject<HTMLElement | null>, play: boolean) {
  useEffect(() => {
    if (!play || typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let cancelled = false;
    let scrollRaf = 0;

    const setup = () => {
      if (cancelled) return;
      const root = rootRef.current;
      if (!root) return;

      const yStart = Math.max(0, root.getBoundingClientRect().top + window.scrollY - 52);
      window.scrollTo({ top: yStart, behavior: "instant" });

      const bottom = root.getBoundingClientRect().bottom + window.scrollY;
      const doc = document.documentElement;
      const maxScroll = Math.max(0, (doc?.scrollHeight ?? 0) - window.innerHeight);
      const yEnd = Math.min(maxScroll, Math.max(yStart, bottom - window.innerHeight + 80));

      if (yEnd <= yStart + 40) return;

      const durationMs = 1520;
      const t0 = performance.now();
      const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

      const tick = (now: number) => {
        if (cancelled) return;
        const u = Math.min(1, (now - t0) / durationMs);
        window.scrollTo(0, yStart + (yEnd - yStart) * easeInOutCubic(u));
        if (u < 1) scrollRaf = window.requestAnimationFrame(tick);
      };
      scrollRaf = window.requestAnimationFrame(tick);
    };

    let innerBoot = 0;
    const outerBoot = window.requestAnimationFrame(() => {
      if (cancelled) return;
      innerBoot = window.requestAnimationFrame(setup);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outerBoot);
      window.cancelAnimationFrame(innerBoot);
      window.cancelAnimationFrame(scrollRaf);
    };
  }, [play, rootRef]);
}

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
  compact = false,
}: {
  work: Work;
  mounted: boolean;
  judgments: JudgmentRecord;
  /** チュートリアル枠など。本番グリッドより一回り小さく表示 */
  compact?: boolean;
}) {
  const judgment: Judgment = mounted ? judgments[work.id] ?? "undecided" : "undecided";
  const judgedStyle = judgment !== "undecided" ? judgmentGridCellStyle[judgment] : null;

  const pad = compact ? "p-1.5 sm:p-2" : "p-2 sm:p-2.5";
  const cellClass = `relative flex aspect-square flex-col justify-between border border-solid ${pad} shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_10%,transparent)] transition-[background-color,border-color,filter,box-shadow] hover:brightness-[1.07] focus-visible:brightness-[1.05] ${
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
          className={`mb-0.5 block font-mono font-medium uppercase leading-none tracking-[0.14em] ${compact ? "text-[0.42rem] sm:text-[0.45rem]" : "text-[0.52rem] sm:text-[0.55rem]"}`}
          style={{ color: "color-mix(in srgb, var(--fg-muted) 72%, var(--secondary))" }}
          aria-hidden
        >
          IDX
        </span>
        <span
          className={`font-mono font-bold tabular-nums leading-none tracking-tight ${compact ? "text-[0.72rem] sm:text-[0.82rem]" : "text-[0.9rem] sm:text-[1.05rem]"}`}
          style={{
            color: judgmentMonoIdColor(judgment),
            textShadow: "0 1px 0 color-mix(in srgb, var(--bg) 55%, transparent)",
          }}
        >
          {String(work.id).padStart(2, "0")}
        </span>
      </span>
      <span
        className={`relative z-[1] self-end font-mono font-bold uppercase leading-none tracking-tight ${compact ? "text-[0.42rem] sm:text-[0.46rem]" : "text-[0.52rem] sm:text-[0.58rem]"}`}
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

/** 段階未解禁時。本番セルと同じグリッド尺で、ブラインド状に覆った見た目のみ。 */
function WorkCatalogBlindCell() {
  return (
    <div
      className="relative flex aspect-square flex-col justify-between overflow-hidden border border-solid border-[color:color-mix(in_srgb,var(--outline-variant)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-low)_88%,var(--bg))] p-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_8%,transparent)] sm:p-2.5 pointer-events-none select-none"
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -14deg,
            transparent 0px,
            transparent 4px,
            color-mix(in srgb, var(--fg-muted) 14%, transparent) 4px,
            color-mix(in srgb, var(--fg-muted) 14%, transparent) 6px
          )`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 7px,
            color-mix(in srgb, var(--bg) 40%, transparent) 7px,
            color-mix(in srgb, var(--bg) 40%, transparent) 9px
          )`,
        }}
        aria-hidden
      />
      <span className="relative z-[1] min-w-0">
        <span
          className="mb-0.5 block font-mono text-[0.52rem] font-medium uppercase leading-none tracking-[0.14em] sm:text-[0.55rem]"
          style={{ color: "color-mix(in srgb, var(--fg-muted) 55%, transparent)" }}
        >
          IDX
        </span>
        <span
          className="font-mono text-[0.9rem] font-bold tabular-nums leading-none tracking-tight opacity-35 sm:text-[1.05rem]"
          style={{ color: "var(--fg-muted)" }}
        >
          ··
        </span>
      </span>
      <span
        className="relative z-[1] self-end font-mono text-[0.48rem] font-bold uppercase leading-none tracking-[0.2em] opacity-50 sm:text-[0.52rem]"
        style={{ color: "var(--fg-muted)" }}
      >
        LOCK
      </span>
    </div>
  );
}

/** 見出し6タップ用のダミーセル（本番 CASE とは独立した演出枠） */
function WorkHundredBulkCell({ index }: { index: number }) {
  const n = index + 1;
  const style: CSSProperties = { ["--hundred-stagger" as string]: index };
  return (
    <div
      className="works-hundred-bulk-cell relative flex aspect-square flex-col justify-between overflow-hidden border border-solid border-[color:color-mix(in_srgb,var(--outline-variant)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-low)_88%,var(--bg))] p-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--hairline)_8%,transparent)] sm:p-2.5 pointer-events-none select-none"
      style={style}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -14deg,
            transparent 0px,
            transparent 4px,
            color-mix(in srgb, var(--fg-muted) 12%, transparent) 4px,
            color-mix(in srgb, var(--fg-muted) 12%, transparent) 6px
          )`,
        }}
        aria-hidden
      />
      <span className="relative z-[1] min-w-0">
        <span
          className="mb-0.5 block font-mono text-[0.52rem] font-medium uppercase leading-none tracking-[0.14em] sm:text-[0.55rem]"
          style={{ color: "color-mix(in srgb, var(--fg-muted) 55%, transparent)" }}
        >
          AUX
        </span>
        <span
          className="font-mono text-[0.9rem] font-bold tabular-nums leading-none tracking-tight sm:text-[1.05rem]"
          style={{
            color: "color-mix(in srgb, var(--fg-muted) 42%, var(--secondary))",
            textShadow: "0 1px 0 color-mix(in srgb, var(--bg) 55%, transparent)",
          }}
        >
          {String(n).padStart(2, "0")}
        </span>
      </span>
      <span
        className="relative z-[1] self-end font-mono text-[0.48rem] font-bold uppercase leading-none tracking-[0.2em] sm:text-[0.52rem]"
        style={{ color: "color-mix(in srgb, var(--fg-muted) 50%, var(--bg))" }}
      >
        SYN
      </span>
    </div>
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
  const [phaseUnlock, setPhaseUnlock] = useState<PhaseRevealKind | null>(null);
  const [gridRevealComplete, setGridRevealComplete] = useState(false);
  const [playGridReveal, setPlayGridReveal] = useState(false);
  const tutorialRevealConsumedRef = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const worksCoreCatalogRootRef = useRef<HTMLDivElement>(null);
  const legendTapCountRef = useRef(0);
  const legendTapResetTidRef = useRef<number | null>(null);

  const [hundredBulkVisible, setHundredBulkVisible] = useState(false);
  const [playHundredReveal, setPlayHundredReveal] = useState(false);
  const [hundredRevealGen, setHundredRevealGen] = useState(0);

  const tutorialJudgment = mounted ? judgments[0] : undefined;
  const tutorialDone = tutorialJudgment !== undefined && tutorialJudgment !== "undecided";

  useLayoutEffect(() => {
    if (!mounted) return;
    if (!tutorialDone) {
      tutorialRevealConsumedRef.current = false;
      queueMicrotask(() => {
        setGridRevealComplete(false);
        setPlayGridReveal(false);
        setHundredBulkVisible(false);
        setPlayHundredReveal(false);
      });
      return;
    }
    if (!tutorialRevealConsumedRef.current && consumeTutorialRevealIntent()) {
      tutorialRevealConsumedRef.current = true;
      const reduced =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        queueMicrotask(() => {
          setPlayGridReveal(false);
          setGridRevealComplete(true);
        });
        return;
      }
      let fadeClearTid: number | null = null;
      let mainForFadeCleanup: HTMLElement | null = null;
      queueMicrotask(() => {
        setGridRevealComplete(false);
        setPlayGridReveal(true);
        const mainEl = mainRef.current;
        mainForFadeCleanup = mainEl;
        if (mainEl) {
          mainEl.classList.add("works-main-tutorial-fade-in");
          fadeClearTid = window.setTimeout(() => {
            mainEl.classList.remove("works-main-tutorial-fade-in");
            fadeClearTid = null;
          }, 520);
        }
      });
      const tid = window.setTimeout(() => {
        setPlayGridReveal(false);
        setGridRevealComplete(true);
      }, 1680);
      return () => {
        window.clearTimeout(tid);
        if (fadeClearTid !== null) window.clearTimeout(fadeClearTid);
        const el = mainForFadeCleanup;
        queueMicrotask(() => {
          el?.classList.remove("works-main-tutorial-fade-in");
          setPlayGridReveal(false);
          setGridRevealComplete(true);
        });
      };
    }
    queueMicrotask(() => {
      setPlayGridReveal(false);
      setGridRevealComplete(true);
    });
  }, [mounted, tutorialDone]);

  const catalogRevealScrollActive = playGridReveal || playHundredReveal;
  useWorksCatalogRevealScroll(worksCoreCatalogRootRef, catalogRevealScrollActive);

  useEffect(() => {
    if (!playHundredReveal) return undefined;
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      queueMicrotask(() => setPlayHundredReveal(false));
      return undefined;
    }
    const tid = window.setTimeout(() => setPlayHundredReveal(false), 2320);
    return () => window.clearTimeout(tid);
  }, [playHundredReveal]);

  useEffect(() => {
    return () => {
      if (legendTapResetTidRef.current !== null) window.clearTimeout(legendTapResetTidRef.current);
    };
  }, []);

  /** セル出現ウェーブ — Android は振動、iPhone Web はチュートリアル確定時に prime した Audio のクリック列 */
  useEffect(() => {
    if (!playGridReveal || typeof window === "undefined") return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return runWorksCatalogRevealFeedback({ reducedMotion: reduced });
  }, [playGridReveal]);

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

  const handlePhaseRevealComplete = useCallback(() => {
    setPhaseReveal((prev) => {
      if (prev) queueMicrotask(() => setPhaseUnlock(prev));
      return null;
    });
  }, []);

  useEffect(() => {
    if (!phaseUnlock || typeof document === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollDelayMs = reduced ? 280 : 640;
    const clearDelayMs = reduced ? 1100 : 1850;
    const targetId = phaseUnlockScrollTargetId(phaseUnlock);
    const scrollTimer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    }, scrollDelayMs);
    const clearTimer = window.setTimeout(() => setPhaseUnlock(null), clearDelayMs);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [phaseUnlock]);

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

  const onAppraisalHeaderPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!tutorialDone) return;
      if (playGridReveal || playHundredReveal) return;
      if (typeof window === "undefined") return;

      if (legendTapResetTidRef.current !== null) {
        window.clearTimeout(legendTapResetTidRef.current);
        legendTapResetTidRef.current = null;
      }

      legendTapCountRef.current += 1;
      if (legendTapCountRef.current >= 6) {
        legendTapCountRef.current = 0;
        setHundredBulkVisible(true);
        setHundredRevealGen((g) => g + 1);
        setPlayHundredReveal(true);
        return;
      }

      legendTapResetTidRef.current = window.setTimeout(() => {
        legendTapCountRef.current = 0;
        legendTapResetTidRef.current = null;
      }, 1400);
    },
    [tutorialDone, playGridReveal, playHundredReveal],
  );

  const judged = mounted ? countJudgedInCatalog(catalog, judgments) : 0;
  const authentic = mounted
    ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "authentic").length
    : 0;
  const pending = mounted
    ? catalog.filter((w) => (judgments[w.id] ?? "undecided") === "pending").length
    : 0;

  const sessionHudActive = tutorialDone && gridRevealComplete;

  return (
    <main
      ref={mainRef}
      className={`relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-clip pt-3 ${
        sessionHudActive ? "pb-[calc(1rem+4rem)]" : "pb-4"
      }`}
    >
      <AppraisalSessionHud active={sessionHudActive} />

      <div className="pointer-events-none fixed inset-0 -z-10 grid-backdrop opacity-70" aria-hidden />

      <section className="mb-6 flex-1">
        <div
          className="mb-4 flex flex-col gap-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:flex-row sm:items-end sm:justify-between sm:gap-2 select-none touch-manipulation"
          onPointerDown={onAppraisalHeaderPointerDown}
        >
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
          {!tutorialDone ? (
            <div
              className="flex min-h-[14rem] flex-col items-center justify-center gap-4 px-4 py-10 pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))] sm:min-h-[16rem]"
              aria-live="polite"
            >
              <p className="max-w-xs text-center font-mono text-[0.52rem] font-bold uppercase leading-relaxed tracking-[0.14em] text-[color:var(--fg-muted)]">
                Grid offline
              </p>
              <p className="max-w-sm text-center text-[0.72rem] font-medium leading-relaxed normal-case text-[color:var(--secondary)]">
                CASE 01 より前のチュートリアルを完了すると、鑑定グリッドが同期されます。
              </p>
              <Link
                href="/works/0"
                className="border border-[color:var(--primary)]/50 bg-[color:color-mix(in_srgb,var(--primary)_12%,var(--surface-low))] px-5 py-2.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--primary)] transition-all hover:brightness-110 active:scale-[0.99]"
              >
                チュートリアルへ
              </Link>
            </div>
          ) : (
            <>
              {practiceWorks.length > 0 ? (
                <div className="mb-3 flex items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--surface-high)_45%,transparent)] pb-3 pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))]">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[0.55rem] font-bold uppercase leading-tight tracking-[0.16em] text-[color:var(--secondary)] sm:text-[0.58rem]">
                      チュートリアル枠
                    </h3>
                    <p className="mt-0.5 font-mono text-[0.45rem] uppercase tracking-[0.12em] text-[color:var(--fg-muted)] sm:text-[0.48rem]">
                      CASE_00
                    </p>
                  </div>
                  <div className="w-[3.35rem] shrink-0 sm:w-[3.65rem]">
                    {practiceWorks.map((work) => (
                      <WorkCatalogCell
                        key={work.id}
                        work={work}
                        mounted={mounted}
                        judgments={judgments}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                ref={worksCoreCatalogRootRef}
                className={`works-core-catalog-root normal-case ${playGridReveal ? "works-catalog-reveal-play works-tutorial-lineup" : ""} ${gridRevealComplete ? "works-core-catalog-synced" : ""}`}
              >
          <div
            id="works-appraisal-phase-1"
            className="works-core-phase scroll-mt-3 space-y-2 scroll-mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
          >
            <div className="works-core-phase-title-row flex flex-wrap items-baseline justify-between gap-2">
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

          <div
            id="works-appraisal-phase-2"
            role="region"
            aria-label={phase1Done ? "第2段階 CASE 06–15" : "第2段階 未解禁（ブラインド10枠）"}
            className="works-core-phase scroll-mt-3 space-y-2 scroll-mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
          >
            <div className="works-core-phase-title-row flex flex-wrap items-baseline justify-between gap-2">
              <h3
                className={`font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] ${phase1Done ? "text-[color:var(--primary)]" : "text-[color:var(--fg-muted)]"}`}
              >
                第2段階
              </h3>
              <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">
                {phase1Done ? "10件 · CASE 06–15" : "10枠 · 第1段階完了で解禁"}
              </span>
            </div>
            <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
              {phase1Done ? (
                <>
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
                </>
              ) : (
                Array.from({ length: 10 }, (_, i) => <WorkCatalogBlindCell key={`p2-blind-${i}`} />)
              )}
            </div>
          </div>

          <div
            id="works-appraisal-phase-3"
            role="region"
            aria-label={phase2Done ? "第3段階 CASE 16–20" : "第3段階 未解禁（ブラインド5枠）"}
            className="works-core-phase scroll-mt-3 space-y-2 scroll-mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
          >
            <div className="works-core-phase-title-row flex flex-wrap items-baseline justify-between gap-2">
              <h3
                className={`font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] ${phase2Done ? "text-[color:var(--primary)]" : "text-[color:var(--fg-muted)]"}`}
              >
                第3段階
              </h3>
              <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">
                {phase2Done ? "5件 · CASE 16–20" : "5枠 · 第2段階完了で解禁"}
              </span>
            </div>
            <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
              {phase2Done ? (
                <>
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
                </>
              ) : (
                Array.from({ length: 5 }, (_, i) => <WorkCatalogBlindCell key={`p3-blind-${i}`} />)
              )}
            </div>
          </div>

          {secretWorks.length > 0 ? (
            <div className="works-core-phase works-core-phase--extra space-y-2 border-t border-[color:color-mix(in_srgb,var(--surface-high)_35%,transparent)] pt-4">
              <div className="works-core-phase-title-row flex items-baseline justify-between gap-2">
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

          {hundredBulkVisible ? (
            <div
              key={`works-hundred-bulk-${hundredRevealGen}`}
              role="presentation"
              className={`works-core-phase works-hundred-bulk scroll-mt-3 space-y-2 border-t border-[color:color-mix(in_srgb,var(--surface-high)_35%,transparent)] pt-4 ${playHundredReveal ? "works-catalog-reveal-play works-tutorial-lineup" : ""}`}
              aria-hidden
            >
              <div className="works-hundred-bulk-title-row flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[color:var(--secondary)]">
                  拡張同期（演出）
                </h3>
                <span className="font-mono text-[0.52rem] text-[color:var(--fg-muted)]">100件 · AUX 01–100</span>
              </div>
              <div className="works-hundred-bulk-grid grid w-full grid-cols-4 gap-1.5 sm:gap-2">
                {Array.from({ length: 100 }, (_, i) => (
                  <WorkHundredBulkCell key={i} index={i} />
                ))}
              </div>
            </div>
          ) : null}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mb-5 mt-5 ml-[max(0.75rem,env(safe-area-inset-left))] mr-[max(0.75rem,env(safe-area-inset-right))] border border-[color:var(--surface-high)]/30 bg-[color:var(--bg)] p-2.5 sm:p-3">
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

      {phaseReveal ? (
        <PhaseRevealOverlay kind={phaseReveal} judgments={judgments} onComplete={handlePhaseRevealComplete} />
      ) : null}

      {phaseUnlock && typeof document !== "undefined"
        ? createPortal(
            <div className="phase-unlock-root normal-case" role="status" aria-live="assertive">
              <div className="phase-unlock-card">
                <p className="phase-unlock-eyebrow font-mono uppercase">Ledger · Phase unlock</p>
                <p className="phase-unlock-title">{phaseUnlockHeading(phaseUnlock)}</p>
                <p className="phase-unlock-sub font-mono uppercase">一覧へ移動しています…</p>
              </div>
            </div>,
            document.body
          )
        : null}
    </main>
  );
}

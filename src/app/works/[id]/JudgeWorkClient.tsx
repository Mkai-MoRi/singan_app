"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useJudgments } from "@/hooks/useJudgments";
import { useSecretCaseUnlock } from "@/hooks/useSecretCaseUnlock";
import { findCatalogWork, listCatalogWorks } from "@/lib/worksCatalog";
import {
  adjacentAccessibleCatalogIds,
  canAccessCatalogWork,
  isCoreCatalogComplete,
  isCorePhase1Complete,
  isCorePhase2Complete,
} from "@/lib/workPhases";
import { Judgment } from "@/lib/judgmentsStorage";
import { primeWorksCatalogRevealFeedbackAudio } from "@/lib/worksCatalogRevealFeedback";
import { setTutorialRevealIntent } from "@/lib/tutorialRevealIntent";
import { clearWorksReturnSwipe, setWorksReturnSwipe } from "@/lib/worksReturnSwipe";

const SWIPE_THRESHOLD = 88;

export default function JudgeWorkClient({ id }: { id: number }) {
  const router = useRouter();
  const { judgments, saveJudgment, mounted } = useJudgments();
  const { secretUnlocked, secretMounted } = useSecretCaseUnlock();
  const catalogFlags = {
    secretUnlocked: secretMounted && secretUnlocked,
    practiceUnlocked: false,
  };
  const catalog = listCatalogWorks(catalogFlags);
  const slotTotal = catalog.length;
  const work = findCatalogWork(id, catalogFlags);
  const { prev: prevId, next: nextId } = adjacentAccessibleCatalogIds(catalog, id, judgments);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyDir, setFlyDir] = useState<"left" | "right" | "pending" | null>(null);

  const startXRef = useRef(0);
  const dragXRef = useRef(0);
  const draggingRef = useRef(false);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id === 21 && !secretMounted) return;
    if (!work) router.replace("/works");
  }, [id, secretMounted, work, router]);

  useEffect(() => {
    if (!mounted || !work) return;
    if (id >= 1 && id <= 20 && !canAccessCatalogWork(id, judgments)) {
      router.replace("/works");
    }
  }, [mounted, work, id, judgments, router]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
    dragXRef.current = 0;
    draggingRef.current = false;
    queueMicrotask(() => {
      setFlyDir(null);
      setDragX(0);
      setIsDragging(false);
    });
  }, [id]);

  const currentJudgment: Judgment = mounted ? judgments[id] ?? "undecided" : "undecided";

  const commit = useCallback(
    (value: Judgment, dir: "left" | "right" | "pending") => {
      saveJudgment(id, value);
      const nextRecord = { ...judgments, [id]: value };
      let worksHref = "/works";
      if (id === 0) {
        primeWorksCatalogRevealFeedbackAudio();
        setTutorialRevealIntent();
        clearWorksReturnSwipe();
      }
      if (id >= 1 && id <= 20) {
        if (!isCorePhase1Complete(judgments) && isCorePhase1Complete(nextRecord)) {
          worksHref = "/works?reveal=afterPhase1";
        } else if (
          isCorePhase1Complete(nextRecord) &&
          !isCorePhase2Complete(judgments) &&
          isCorePhase2Complete(nextRecord)
        ) {
          worksHref = "/works?reveal=afterPhase2";
        } else if (!isCoreCatalogComplete(judgments) && isCoreCatalogComplete(nextRecord)) {
          worksHref = "/works?reveal=afterPhase3";
        }
      }
      dragXRef.current = 0;
      setDragX(0);
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      /* CASE_00: 一覧へのスワイプ入場は使わず、カードだけフェードアウトして遷移 */
      const exitDir = id === 0 ? "pending" : dir;
      setFlyDir(exitDir);
      if (id !== 0) {
        setWorksReturnSwipe(dir);
      }
      const resetMs =
        id === 0 ? 460 : dir === "pending" ? 240 : 380;
      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        setFlyDir(null);
        router.push(worksHref);
      }, resetMs);
    },
    [id, judgments, saveJudgment, router]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      startXRef.current = e.clientX;
      dragXRef.current = 0;
      draggingRef.current = true;
      setIsDragging(true);
      setDragX(0);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      dragXRef.current = delta;
      setDragX(delta);
    },
    []
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const dx = dragXRef.current;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* noop */
      }
      draggingRef.current = false;
      setIsDragging(false);
      dragXRef.current = 0;
      if (dx > SWIPE_THRESHOLD) commit("authentic", "right");
      else if (dx < -SWIPE_THRESHOLD) commit("fake", "left");
      else setDragX(0);
    },
    [commit]
  );

  const onPointerCancel = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    dragXRef.current = 0;
    setDragX(0);
  }, []);

  const onLostPointerCapture = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    dragXRef.current = 0;
    setDragX(0);
  }, []);

  if (id === 21 && !secretMounted) {
    return (
      <main className="relative z-0 mx-auto flex min-h-0 max-w-lg flex-1 flex-col items-center justify-center px-3 py-12">
        <p className="font-mono text-[0.65rem] tracking-wide text-[color:var(--fg-muted)]">[SYNC_SESSION]</p>
      </main>
    );
  }

  if (!work) return null;

  const activeDragX = flyDir === "right" ? 680 : flyDir === "left" ? -680 : dragX;
  const rotate = flyDir === "right" ? 18 : flyDir === "left" ? -18 : dragX * 0.05;
  const cardOpacity = flyDir === "pending" ? 0 : 1;

  const cardTransition = flyDir
    ? flyDir === "pending"
      ? "opacity 0.18s ease"
      : "transform 0.33s cubic-bezier(0.55, 0, 0.8, 0.45)"
    : isDragging
      ? "none"
      : "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)";

  const visualBias = Math.max(-1, Math.min(1, dragX / SWIPE_THRESHOLD));
  const rightStrength = Math.max(0, visualBias);
  const leftStrength = Math.max(0, -visualBias);
  const pull = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1.35);

  const lockedAuthentic = mounted && currentJudgment === "authentic";
  const lockedFake = mounted && currentJudgment === "fake";
  const lockedPending = mounted && currentJudgment === "pending";

  /** ドラッグ中は指の位置。離したあとは保存済み判定で色を固定 */
  const showR = isDragging ? rightStrength : lockedAuthentic ? 1 : lockedFake || lockedPending ? 0 : rightStrength;
  const showL = isDragging ? leftStrength : lockedFake ? 1 : lockedAuthentic || lockedPending ? 0 : leftStrength;

  const pullVis = isDragging ? pull : lockedAuthentic || lockedFake ? 1 : lockedPending ? 0.28 : 0;

  const cardLift = isDragging ? 1 + pull * 0.02 : 1;
  /* 右=本物（ピンク系） / 左=偽物（緑） */
  const cardShadow = [
    "0 1px 0 rgba(255,255,255,0.06) inset",
    "0 22px 48px rgba(0,0,0,0.55)",
    ...(showR > 0.001
      ? [`0 0 ${28 + pullVis * 36}px rgba(255,100,130,${showR * 0.5})`]
      : []),
    ...(showL > 0.001
      ? [`0 0 ${28 + pullVis * 36}px rgba(91,225,71,${showL * 0.5})`]
      : []),
  ].join(", ");

  const cardBorder = lockedPending && !isDragging
    ? "1px solid rgba(221,191,200,0.5)"
    : showR > showL
      ? `1px solid rgba(255,176,201,${0.4 + showR * 0.45})`
      : showL > showR
        ? `1px solid rgba(91,225,71,${0.35 + showL * 0.45})`
        : "1px solid rgba(255,176,201,0.22)";

  const faceTint = lockedPending && !isDragging
    ? "linear-gradient(165deg, #262525 0%, #1c1b1b 50%, #201f1f 100%)"
    : showR > showL
      ? `linear-gradient(165deg, rgba(42,22,30,1) 0%, rgba(36,20,28,1) 45%, rgba(48,18,32,${0.82 + showR * 0.14}) 100%)`
      : showL > showR
        ? `linear-gradient(165deg, rgba(28,42,30,1) 0%, rgba(22,32,24,1) 45%, rgba(18,38,22,${0.85 + showL * 0.12}) 100%)`
        : "linear-gradient(165deg, #1e1d1d 0%, #1c1b1b 50%, #181717 100%)";

  const idHue =
    lockedPending && !isDragging
      ? "var(--secondary)"
      : showR > showL && showR > 0.12
        ? "var(--primary)"
        : showL > showR && showL > 0.12
          ? "var(--tertiary)"
          : "var(--primary)";

  const choiceBtn =
    "flex h-12 items-center justify-center rounded-lg border border-[color:var(--surface-high)]/55 bg-[color:var(--surface-high)]/70 text-[0.7rem] font-bold transition-all duration-75 active:scale-[0.98]";

  const tutorialFadeOut = id === 0 && flyDir === "pending";

  return (
    <main
      className={`relative z-0 mx-auto flex min-h-0 max-w-lg flex-1 select-none flex-col px-3 pb-2 pt-2 transition-opacity duration-500 ease-out ${
        tutorialFadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ overscrollBehaviorX: "none" } as CSSProperties}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.1]" aria-hidden>
        <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path
            d="M0 20 L100 20 M0 50 L100 50 M0 80 L100 80 M20 0 L20 100 M50 0 L50 100 M80 0 L80 100"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="0.12"
          />
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--primary)" strokeWidth="0.06" />
        </svg>
      </div>

      <div className="mb-2 flex justify-between px-1">
        <button type="button" onClick={() => router.push("/works")} className="py-2 text-[0.65rem] font-bold tracking-widest text-[color:var(--fg-muted)]">
          ← 一覧
        </button>
        <span className="font-mono text-[0.6rem]" style={{ color: "var(--fg-muted)" }}>
          {String(id).padStart(2, "0")} / {slotTotal}
        </span>
      </div>

      <div className="mb-3 flex w-full justify-between gap-2 px-1">
        <span className="text-[0.65rem] font-bold tracking-[0.15em] text-[color:var(--primary)]">[SCAN_{String(id).padStart(3, "0")}]</span>
        <span className="truncate text-right text-[0.65rem] font-bold tracking-[0.15em] text-[color:var(--fg-muted)]">REF: {work.caseName}</span>
      </div>

      <p className="mb-2 px-1 text-center text-[0.6rem] font-bold tracking-widest text-[color:var(--fg-muted)]">
        カードを左右にスワイプ → 端まで送ると確定（右: 本物 / 左: 偽物）
      </p>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center py-3">
        {/* 左右レーン（カードの下に見えるデッキ台） */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[12%] top-[8%] z-0 flex justify-between px-1">
          <div
            className="w-[30%] max-w-[7.5rem] rounded-r-2xl border border-[rgba(91,225,71,0.28)] bg-gradient-to-r from-[rgba(25,55,30,0.55)] to-transparent transition-opacity duration-75"
            style={{ opacity: 0.06 + showL * 0.82 }}
          />
          <div
            className="w-[30%] max-w-[7.5rem] rounded-l-2xl border border-[rgba(255,120,140,0.3)] bg-gradient-to-l from-[rgba(55,28,32,0.55)] to-transparent transition-opacity duration-75"
            style={{ opacity: 0.06 + showR * 0.82 }}
          />
        </div>
        <div
          className="pointer-events-none absolute bottom-[10%] left-[4%] z-0 font-display text-[0.55rem] font-bold uppercase tracking-[0.2em] text-[color:var(--tertiary)] transition-opacity duration-75"
          style={{ opacity: 0.2 + showL * 0.75 }}
        >
          偽物
        </div>
        <div
          className="pointer-events-none absolute bottom-[10%] right-[4%] z-0 font-display text-[0.55rem] font-bold uppercase tracking-[0.2em] text-[color:var(--primary)] transition-opacity duration-75"
          style={{ opacity: 0.2 + showR * 0.75 }}
        >
          本物
        </div>

        <div
          className="relative z-10 w-full max-w-[min(21rem,calc(100vw-1.25rem))] cursor-grab touch-none select-none active:cursor-grabbing"
          style={{
            transform: `translateX(${activeDragX}px) rotate(${rotate}deg) scale(${cardLift})`,
            transition: cardTransition,
            opacity: cardOpacity,
            touchAction: "none",
            filter: isDragging ? `drop-shadow(0 ${8 + pull * 6}px ${20 + pull * 12}px rgba(0,0,0,0.45))` : "drop-shadow(0 12px 24px rgba(0,0,0,0.4))",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onLostPointerCapture}
          role="region"
          aria-label="スワイプで判定（右: 本物 / 左: 偽物）"
        >
          <div
            data-swipe-card
            className="relative aspect-[3/4] w-full touch-none overflow-hidden rounded-2xl"
            style={{
              border: cardBorder,
              boxShadow: cardShadow,
              background: faceTint,
            }}
          >
            {/* カード上面のハイライト（物理カードの縁） */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
              aria-hidden
            />

            {/* ドラッグ方向の色フラッシュ */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-75"
              style={{
                background: "radial-gradient(ellipse 90% 70% at 85% 45%, rgba(255,140,160,0.32), transparent 55%)",
                opacity: showR * 0.95,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-75"
              style={{
                background: "radial-gradient(ellipse 90% 70% at 15% 45%, rgba(91,225,71,0.28), transparent 55%)",
                opacity: showL * 0.95,
              }}
            />

            <div
              className="pointer-events-none absolute inset-5 opacity-[0.14]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,176,201,0.12) 0 1px, transparent 1px 20px), repeating-linear-gradient(0deg, rgba(255,176,201,0.1) 0 1px, transparent 1px 20px)",
              }}
            />

            {/* 確定ゲージ（中央から左右に伸びる） */}
            <div className="pointer-events-none absolute bottom-9 left-5 right-5 z-20 h-1.5 overflow-hidden rounded-full bg-black/45">
              <div
                className="absolute right-1/2 top-0 h-full rounded-l-full bg-[color:var(--tertiary)] transition-[width] duration-75"
                style={{ width: `${showL * 50}%` }}
              />
              <div
                className="absolute left-1/2 top-0 h-full rounded-r-full bg-[color:var(--primary)] transition-[width] duration-75"
                style={{ width: `${showR * 50}%` }}
              />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 text-center font-mono text-[0.55rem] text-[color:var(--fg-muted)]">
              {isDragging
                ? pull >= 1
                  ? "指を離すと確定"
                  : "端までスワイプ"
                : lockedAuthentic
                  ? "本物で記録中"
                  : lockedFake
                    ? "偽物で記録中"
                    : lockedPending
                      ? "保留で記録中"
                      : "左右にスワイプで判定"}
            </div>

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 pb-8 pt-6 text-center">
              <p className="mb-2 font-mono text-[0.65rem]" style={{ color: "var(--fg-muted)" }}>
                {work.caseName}
                {" // "}
                TARGET
              </p>
              <h1
                className="font-display text-[clamp(4rem,20vw,6.5rem)] font-bold leading-none tracking-tighter glitch-text transition-colors duration-75"
                style={{ color: idHue }}
              >
                {String(id).padStart(2, "0")}
              </h1>
              <div
                className="my-4 h-px w-24 transition-colors duration-75"
                style={{
                  background:
                    showR > showL
                      ? `rgba(255,176,201,${0.3 + showR * 0.45})`
                      : showL > showR
                        ? `rgba(91,225,71,${0.25 + showL * 0.45})`
                        : lockedPending
                          ? "rgba(221,191,200,0.35)"
                          : "rgba(255,176,201,0.35)",
                }}
              />
              <p
                className="font-display text-xs font-bold uppercase tracking-[0.25em] transition-colors duration-75"
                style={{
                  color:
                    showR > showL ? "var(--primary)" : showL > showR ? "var(--tertiary)" : lockedPending ? "var(--secondary)" : "var(--primary)",
                }}
              >
                {work.title}
              </p>
              <p className="mt-3 max-w-[15rem] text-[0.65rem] leading-snug normal-case opacity-85" style={{ color: "var(--secondary)" }}>
                {work.meta}
              </p>
              {mounted && currentJudgment !== "undecided" && (
                <p className="mt-4 font-mono text-[0.58rem] opacity-80" style={{ color: "var(--fg-muted)" }}>
                  記録:{" "}
                  {currentJudgment === "authentic" ? "本物" : currentJudgment === "fake" ? "偽物" : "保留"}
                  （いつでもスワイプで変更可）
                </p>
              )}
            </div>

            <div className="pointer-events-none absolute left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center opacity-[0.2]">
              <span className="material-symbols-outlined text-[color:var(--tertiary)]" style={{ fontVariationSettings: "'FILL' 0" }}>
                chevron_left
              </span>
            </div>
            <div className="pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center opacity-[0.2]">
              <span className="material-symbols-outlined text-[color:var(--primary)]" style={{ fontVariationSettings: "'FILL' 0" }}>
                chevron_right
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 mt-auto flex flex-col gap-2 pb-6 pt-3">
        <div className="grid grid-cols-3 gap-2 px-1">
          <button
            type="button"
            onClick={() => commit("fake", "left")}
            className={`group ${choiceBtn} hover:border-[rgba(91,225,71,0.55)] hover:bg-[rgba(91,225,71,0.1)] ${
              lockedFake
                ? "border-[rgba(91,225,71,0.7)] bg-[rgba(91,225,71,0.16)] ring-1 ring-[rgba(91,225,71,0.35)]"
                : ""
            }`}
            aria-label="偽物と判定"
          >
            <span
              className={`font-display tracking-widest group-hover:text-[color:var(--tertiary)] ${
                lockedFake ? "text-[color:var(--tertiary)]" : "text-[color:var(--fg-muted)]"
              }`}
            >
              偽物
            </span>
          </button>
          <button
            type="button"
            onClick={() => commit("pending", "pending")}
            className={`group ${choiceBtn} hover:border-[color:var(--secondary)]/50 hover:bg-[rgba(221,191,200,0.08)] ${
              lockedPending
                ? "border-[color:var(--secondary)]/60 bg-[rgba(221,191,200,0.12)] ring-1 ring-[rgba(221,191,200,0.25)]"
                : ""
            }`}
            aria-label="保留と判定"
          >
            <span
              className={`font-display tracking-widest group-hover:text-[color:var(--secondary)] ${
                lockedPending ? "text-[color:var(--secondary)]" : "text-[color:var(--fg-muted)]"
              }`}
            >
              保留
            </span>
          </button>
          <button
            type="button"
            onClick={() => commit("authentic", "right")}
            className={`group ${choiceBtn} hover:border-[rgba(255,176,201,0.55)] hover:bg-[rgba(255,176,201,0.1)] ${
              lockedAuthentic
                ? "border-[rgba(255,176,201,0.75)] bg-[rgba(255,176,201,0.14)] ring-1 ring-[rgba(255,176,201,0.3)]"
                : ""
            }`}
            aria-label="本物と判定"
          >
            <span
              className={`font-display tracking-widest group-hover:text-[color:var(--primary)] ${
                lockedAuthentic ? "text-[color:var(--primary)]" : "text-[color:var(--fg-muted)]"
              }`}
            >
              本物
            </span>
          </button>
        </div>

        <div className="flex justify-between px-1 text-[0.65rem]" style={{ color: "var(--fg-muted)" }}>
          {prevId != null ? (
            <button type="button" onClick={() => router.push(`/works/${prevId}`)} className="py-2">
              ← PREV
            </button>
          ) : (
            <span />
          )}
          {nextId != null ? (
            <button type="button" onClick={() => router.push(`/works/${nextId}`)} className="py-2">
              NEXT →
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </main>
  );
}

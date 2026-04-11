"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { WORKS } from "@/lib/dummyWorks";
import { useJudgments } from "@/hooks/useJudgments";
import { Judgment } from "@/lib/judgmentsStorage";

const SWIPE_THRESHOLD = 80;

export default function JudgePage() {
  const params = useParams();
  const router = useRouter();
  const { judgments, saveJudgment, mounted } = useJudgments();

  const id = Number(params.id);
  const work = WORKS.find((w) => w.id === id);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState<Judgment | null>(null);

  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Redirect if invalid id
  useEffect(() => {
    if (!work) router.replace("/works");
  }, [work, router]);

  const currentJudgment: Judgment = mounted ? (judgments[id] ?? "undecided") : "undecided";

  const commit = useCallback(
    (value: Judgment) => {
      saveJudgment(id, value);
      setConfirmed(value);
      setTimeout(() => router.push("/works"), 600);
    },
    [id, saveJudgment, router]
  );

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setDragging(true);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      const delta = e.touches[0].clientX - startXRef.current;
      setDragX(delta);
    },
    [dragging]
  );

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      commit("authentic");
    } else if (dragX < -SWIPE_THRESHOLD) {
      commit("fake");
    }
    setDragX(0);
  }, [dragX, commit]);

  // Mouse handlers (dev)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    setDragging(true);
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setDragX(e.clientX - startXRef.current);
    },
    [dragging]
  );

  const onMouseUp = useCallback(() => {
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      commit("authentic");
    } else if (dragX < -SWIPE_THRESHOLD) {
      commit("fake");
    }
    setDragX(0);
  }, [dragX, commit]);

  if (!work) return null;

  // Visual feedback from drag
  const normalizedDrag = Math.min(Math.max(dragX / SWIPE_THRESHOLD, -1), 1);
  const isRightHint = normalizedDrag > 0.3;
  const isLeftHint = normalizedDrag < -0.3;

  const cardStyle: React.CSSProperties = {
    transform: `translateX(${dragX * 0.4}px)`,
    transition: dragging ? "none" : "transform 0.2s ease",
    userSelect: "none",
  };

  return (
    <main
      className="max-w-md mx-auto min-h-dvh flex flex-col px-6 py-8 select-none"
      style={{ overscrollBehaviorX: "none" } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex justify-between items-baseline mb-2">
        <button
          onClick={() => router.push("/works")}
          className="text-xs tracking-wider"
          style={{ color: "var(--fg-muted)" }}
          aria-label="一覧に戻る"
        >
          ← 一覧
        </button>
        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
          {id} / 20
        </span>
      </div>

      {/* Divider */}
      <div className="h-px mb-8" style={{ background: "var(--line)" }} />

      {/* Swipe card */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col justify-center cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        role="region"
        aria-label="スワイプで判定（右: 本物 / 左: 偽物）"
      >
        <div style={cardStyle}>
          {/* Case label */}
          <p
            className="text-xs tracking-widest mb-4"
            style={{ color: "var(--fg-muted)" }}
          >
            {work.caseName}
          </p>

          {/* Title */}
          <h1
            className="text-3xl font-bold leading-tight mb-3"
            style={{
              color: confirmed
                ? confirmed === "authentic"
                  ? "#6aaf7a"
                  : confirmed === "fake"
                  ? "var(--accent)"
                  : "#8888aa"
                : isRightHint
                ? "#6aaf7a"
                : isLeftHint
                ? "var(--accent)"
                : "var(--fg)",
              transition: "color 0.15s ease",
            }}
          >
            {work.title}
          </h1>

          {/* Meta */}
          <p className="text-xs mb-8" style={{ color: "var(--fg-muted)" }}>
            {work.meta}
          </p>

          {/* Swipe hint labels */}
          <div className="flex justify-between text-xs tracking-widest">
            <span
              style={{
                color: isLeftHint ? "var(--accent)" : "var(--line)",
                transition: "color 0.15s ease",
              }}
            >
              ← 偽物
            </span>
            <span
              style={{
                color: isRightHint ? "#6aaf7a" : "var(--line)",
                transition: "color 0.15s ease",
              }}
            >
              本物 →
            </span>
          </div>

          {/* Current status */}
          {mounted && currentJudgment !== "undecided" && !confirmed && (
            <p
              className="text-xs text-center mt-6 tracking-wider"
              style={{ color: "var(--fg-muted)" }}
            >
              現在:{" "}
              <span
                className={
                  currentJudgment === "authentic"
                    ? "status-authentic"
                    : currentJudgment === "fake"
                    ? "status-fake"
                    : "status-pending"
                }
              >
                {currentJudgment === "authentic"
                  ? "本物"
                  : currentJudgment === "fake"
                  ? "偽物"
                  : "保留"}
              </span>
            </p>
          )}

          {/* Confirmed feedback */}
          {confirmed && (
            <p
              className="text-xs text-center mt-6 tracking-widest"
              style={{ color: "var(--fg-muted)" }}
            >
              記録完了 — 一覧へ戻ります
            </p>
          )}
        </div>
      </div>

      {/* Button row */}
      <div
        className="pt-6 pb-[env(safe-area-inset-bottom,0px)]"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        {/* Nav: prev / next */}
        <div className="flex justify-between mb-4 text-xs">
          {id > 1 ? (
            <button
              onClick={() => router.push(`/works/${id - 1}`)}
              style={{ color: "var(--fg-muted)" }}
              aria-label="前の作品"
            >
              ← 前
            </button>
          ) : (
            <span />
          )}
          {id < 20 ? (
            <button
              onClick={() => router.push(`/works/${id + 1}`)}
              style={{ color: "var(--fg-muted)" }}
              aria-label="次の作品"
            >
              次 →
            </button>
          ) : (
            <span />
          )}
        </div>

        {/* Three judgment buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => commit("fake")}
            disabled={!!confirmed}
            className="py-3 text-xs tracking-widest transition-colors"
            style={{
              border: "1px solid var(--accent-dim)",
              color: "var(--accent)",
              background:
                currentJudgment === "fake" && mounted
                  ? "rgba(209,107,141,0.1)"
                  : "transparent",
            }}
            aria-label="偽物と判定"
          >
            偽物
          </button>
          <button
            onClick={() => commit("pending")}
            disabled={!!confirmed}
            className="py-3 text-xs tracking-widest transition-colors"
            style={{
              border: "1px solid var(--line)",
              color: "#8888aa",
              background:
                currentJudgment === "pending" && mounted
                  ? "rgba(136,136,170,0.08)"
                  : "transparent",
            }}
            aria-label="保留と判定"
          >
            保留
          </button>
          <button
            onClick={() => commit("authentic")}
            disabled={!!confirmed}
            className="py-3 text-xs tracking-widest transition-colors"
            style={{
              border: "1px solid #3a6a45",
              color: "#6aaf7a",
              background:
                currentJudgment === "authentic" && mounted
                  ? "rgba(106,175,122,0.08)"
                  : "transparent",
            }}
            aria-label="本物と判定"
          >
            本物
          </button>
        </div>
      </div>
    </main>
  );
}

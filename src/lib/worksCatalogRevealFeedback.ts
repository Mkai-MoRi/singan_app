/**
 * チュートリアル（CASE_00）完了後の鑑定グリッド同期用フィードバック。
 * - Android 等: `navigator.vibrate` のパターン
 * - iPhone のブラウザ: Web の Vibration API は未実装。`web-haptics` のスイッチも
 *   非表示＋遅延遷移では発火しにくいため、**CASE_00 確定の同一ジェスチャー内**で
 *   `primeWorksCatalogRevealFeedbackAudio()` し、一覧では Web Audio の極短クリック列にフォールバックする。
 *
 * セル出現の `animation-delay` と揃える — 変更時は `globals.css`
 * `.works-catalog-reveal-play .works-core-phase:nth-child(n) .grid > *` も同期。
 */

export const WORKS_CATALOG_REVEAL_CELL_PULSE_AT_MS = [
  80, 110, 140, 170, 200, 230,
  270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600,
  640, 670, 700, 730, 760, 790,
  830, 860,
] as const;

let primedAudioContext: AudioContext | null = null;

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    return new Ctx();
  } catch {
    return null;
  }
}

/** CASE_00 鑑定確定の `commit` 内で、ユーザージェスチャーと同じスタックから呼ぶこと。 */
export function primeWorksCatalogRevealFeedbackAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!primedAudioContext) primedAudioContext = createAudioContext();
    if (!primedAudioContext) return;
    void primedAudioContext.resume();
    const buf = primedAudioContext.createBuffer(1, 1, primedAudioContext.sampleRate);
    const src = primedAudioContext.createBufferSource();
    src.buffer = buf;
    src.connect(primedAudioContext.destination);
    src.start(0);
  } catch {
    /* 非対応・拒否 */
  }
}

function buildVibrationPattern(): number[] {
  const pulseMs = 16;
  const times = WORKS_CATALOG_REVEAL_CELL_PULSE_AT_MS;
  const pattern: number[] = [0, times[0]!, pulseMs];
  for (let i = 1; i < times.length; i++) {
    const gap = Math.max(6, times[i]! - times[i - 1]! - pulseMs);
    pattern.push(gap, pulseMs);
  }
  return pattern;
}

function playOneSoftTick(ctx: AudioContext): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(268, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.055, t0 + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.016);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.022);
}

/**
 * 一覧のグリッド同期演出開始時に呼ぶ。クリーンアップでタイマー停止・モーター振動解除。
 */
export function runWorksCatalogRevealFeedback(options: { reducedMotion: boolean }): () => void {
  if (options.reducedMotion || typeof window === "undefined") return () => {};

  const timeouts: number[] = [];

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(buildVibrationPattern());
    } catch {
      /* noop */
    }
    return () => {
      for (const id of timeouts) window.clearTimeout(id);
      try {
        navigator.vibrate(0);
      } catch {
        /* noop */
      }
    };
  }

  const ctx = primedAudioContext;
  if (!ctx) return () => {};

  const fire = () => {
    if (ctx.state === "suspended") void ctx.resume();
    if (ctx.state === "running") playOneSoftTick(ctx);
  };

  for (const ms of WORKS_CATALOG_REVEAL_CELL_PULSE_AT_MS) {
    timeouts.push(window.setTimeout(fire, ms));
  }

  return () => {
    for (const id of timeouts) window.clearTimeout(id);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(0);
      } catch {
        /* noop */
      }
    }
  };
}

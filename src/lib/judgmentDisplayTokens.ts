import type { Judgment } from "@/lib/judgmentsStorage";

/** セル／ログ行の番号用。背景のトーン上でも読み切れる mono 色（一覧グリッドと同一）。 */
export function judgmentMonoIdColor(judgment: Judgment): string {
  switch (judgment) {
    case "authentic":
      return "var(--primary-bright)";
    case "fake":
      return "var(--tertiary)";
    case "pending":
      return "var(--secondary)";
    default:
      return "color-mix(in srgb, var(--secondary) 92%, var(--bg))";
  }
}

/**
 * 判定結果の色（このプロダクトの約束）
 * - 本物 authentic … ピンク系（--primary / --error のトーン）
 * - 偽物 fake … 緑（--tertiary）
 * - 保留 pending … --secondary（従来どおり）
 */

export const judgmentGridCellStyle: Record<
  Exclude<Judgment, "undecided">,
  { bg: string; border: string }
> = {
  authentic: {
    bg: "color-mix(in srgb, var(--error) 30%, var(--surface-low))",
    border: "color-mix(in srgb, var(--error) 58%, transparent)",
  },
  fake: {
    bg: "color-mix(in srgb, var(--tertiary) 26%, var(--surface-low))",
    border: "color-mix(in srgb, var(--tertiary) 60%, transparent)",
  },
  pending: {
    bg: "color-mix(in srgb, var(--secondary) 20%, var(--surface-low))",
    border: "color-mix(in srgb, var(--secondary) 38%, transparent)",
  },
};

export const judgmentStatusStyle: Record<
  Judgment,
  { bg: string; fg: string; border: string }
> = {
  undecided: {
    bg: "var(--surface-high)",
    fg: "var(--fg-muted)",
    border: "color-mix(in srgb, var(--hairline) 18%, transparent)",
  },
  authentic: {
    bg: "color-mix(in srgb, var(--error) 24%, var(--surface-high))",
    fg: "var(--primary)",
    border: "color-mix(in srgb, var(--error) 40%, transparent)",
  },
  fake: {
    bg: "color-mix(in srgb, var(--tertiary) 16%, var(--surface-high))",
    fg: "var(--tertiary)",
    border: "color-mix(in srgb, var(--tertiary) 48%, transparent)",
  },
  pending: {
    bg: "color-mix(in srgb, var(--secondary) 12%, var(--surface-high))",
    fg: "var(--secondary)",
    border: "color-mix(in srgb, var(--secondary) 30%, transparent)",
  },
};

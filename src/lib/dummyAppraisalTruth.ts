import type { Judgment, JudgmentRecord } from "@/lib/judgmentsStorage";

/** 第一フェーズで照合する CASE 範囲（01–05） */
export const PHASE1_TRUTH_MIN_ID = 1;
export const PHASE1_TRUTH_MAX_ID = 5;

/** 真贋鑑定フェーズ（第2・第3段階）で照合する CASE 範囲（06–20） */
export const AUTH_TRUTH_PHASE_MIN_ID = 6;
export const AUTH_TRUTH_PHASE_MAX_ID = 20;

/**
 * 仮仕様の正解: 奇数番号 = 本物、偶数番号 = 偽物（本番 CASE 01–20 に適用可）
 */
export function expectedTruthJudgment(workId: number): "authentic" | "fake" {
  return workId % 2 === 1 ? "authentic" : "fake";
}

export function isTruthMatchForDummyRule(workId: number, j: Judgment): boolean {
  if (j !== "authentic" && j !== "fake") return false;
  return j === expectedTruthJudgment(workId);
}

/**
 * 指定 CASE 範囲で、本物/偽物記録済みの枠に対する正解数（仮ルール: 奇数＝本物・偶数＝偽物）。
 * 保留は採点対象外。
 */
export function scoreTruthRange(
  record: JudgmentRecord,
  minId: number,
  maxId: number
): { correct: number; graded: number; total: number } {
  let correct = 0;
  let graded = 0;
  const total = maxId - minId + 1;
  for (let id = minId; id <= maxId; id++) {
    const j: Judgment = record[id] ?? "undecided";
    if (j === "authentic" || j === "fake") {
      graded++;
      if (isTruthMatchForDummyRule(id, j)) correct++;
    }
  }
  return { correct, graded, total };
}

/** 第一フェーズ CASE 01–05 */
export function scorePhase1TruthSlots(record: JudgmentRecord): {
  correct: number;
  graded: number;
  total: number;
} {
  return scoreTruthRange(record, PHASE1_TRUTH_MIN_ID, PHASE1_TRUTH_MAX_ID);
}

/** 真贋鑑定フェーズ CASE 06–20 */
export function scoreAuthenticityPhaseSlots(record: JudgmentRecord): {
  correct: number;
  graded: number;
  total: number;
} {
  return scoreTruthRange(record, AUTH_TRUTH_PHASE_MIN_ID, AUTH_TRUTH_PHASE_MAX_ID);
}

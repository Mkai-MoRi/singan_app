import { WORKS } from "@/lib/dummyWorks";
import type { Judgment, JudgmentRecord } from "@/lib/judgmentsStorage";

const BY_JUDGMENT: Record<Judgment, string> = {
  undecided: "u",
  authentic: "a",
  fake: "f",
  pending: "p",
};

const BY_CHAR: Record<string, Judgment> = {
  u: "undecided",
  a: "authentic",
  f: "fake",
  p: "pending",
};

/** 20 作品分を `u|a|f|p` の 20 文字で表現（URL クエリ用・追加エンコード不要） */
export function encodeJudgmentsParam(record: JudgmentRecord): string {
  return WORKS.map((w) => {
    const j: Judgment = record[w.id] ?? "undecided";
    return BY_JUDGMENT[j];
  }).join("");
}

/** 不正なら null（呼び出し側で localStorage へフォールバック） */
export function decodeJudgmentsParam(param: string | null): JudgmentRecord | null {
  if (param == null || param.length !== WORKS.length) return null;
  const slim: JudgmentRecord = {};
  for (let i = 0; i < param.length; i++) {
    const ch = param[i]!;
    const j = BY_CHAR[ch];
    if (!j) return null;
    const id = i + 1;
    if (j !== "undecided") slim[id] = j;
  }
  return slim;
}

export function buildSummaryShareHref(record: JudgmentRecord): string {
  const q = encodeJudgmentsParam(record);
  return `/summary?j=${q}`;
}

export function buildSummaryShareAbsoluteUrl(record: JudgmentRecord): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${buildSummaryShareHref(record)}`;
}

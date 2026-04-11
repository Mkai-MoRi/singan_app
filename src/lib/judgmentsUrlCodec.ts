import { listCatalogWorks } from "@/lib/worksCatalog";
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

/** カタログ分を `u|a|f|p` の連結で表現（20 または 21 文字・URL クエリ用） */
export function encodeJudgmentsParam(record: JudgmentRecord, secretUnlocked: boolean): string {
  return listCatalogWorks(secretUnlocked)
    .map((w) => {
      const j: Judgment = record[w.id] ?? "undecided";
      return BY_JUDGMENT[j];
    })
    .join("");
}

/** 不正なら null（呼び出し側で localStorage へフォールバック）。20 または 21 文字。 */
export function decodeJudgmentsParam(param: string | null): JudgmentRecord | null {
  if (param == null || (param.length !== 20 && param.length !== 21)) return null;
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

export function buildSummaryShareHref(record: JudgmentRecord, secretUnlocked: boolean): string {
  const q = encodeJudgmentsParam(record, secretUnlocked);
  return `/summary?j=${q}`;
}

export function buildSummaryShareAbsoluteUrl(record: JudgmentRecord, secretUnlocked: boolean): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${buildSummaryShareHref(record, secretUnlocked)}`;
}

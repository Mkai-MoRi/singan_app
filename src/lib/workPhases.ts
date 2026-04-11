import type { JudgmentRecord } from "@/lib/judgmentsStorage";
import type { Work } from "@/lib/dummyWorks";

/** 本番カタログ CASE 01–20 のフェーズ境界（5 + 10 + 5） */
export const CORE_PHASE_1_IDS = [1, 2, 3, 4, 5] as const;
export const CORE_PHASE_2_IDS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const CORE_PHASE_3_IDS = [16, 17, 18, 19, 20] as const;

function isJudged(record: JudgmentRecord, id: number): boolean {
  const j = record[id];
  return j !== undefined && j !== "undecided";
}

export function isCorePhase1Complete(record: JudgmentRecord): boolean {
  return CORE_PHASE_1_IDS.every((id) => isJudged(record, id));
}

export function isCorePhase2Complete(record: JudgmentRecord): boolean {
  return CORE_PHASE_2_IDS.every((id) => isJudged(record, id));
}

/** CASE 01–20 すべて判定済み */
export function isCoreCatalogComplete(record: JudgmentRecord): boolean {
  return [...CORE_PHASE_1_IDS, ...CORE_PHASE_2_IDS, ...CORE_PHASE_3_IDS].every((id) =>
    isJudged(record, id)
  );
}

/**
 * 練習枠・拡張枠は従来どおり。本番 1–20 は段階解放。
 */
export function canAccessCatalogWork(id: number, record: JudgmentRecord): boolean {
  if (id >= 1 && id <= 5) return true;
  if (id >= 6 && id <= 15) return isCorePhase1Complete(record);
  if (id >= 16 && id <= 20) return isCorePhase1Complete(record) && isCorePhase2Complete(record);
  return true;
}

export function firstUndecidedAccessibleInCatalog(
  record: JudgmentRecord,
  catalog: readonly Work[]
): Work | null {
  for (const w of catalog) {
    if (!canAccessCatalogWork(w.id, record)) continue;
    const j = record[w.id];
    if (j === undefined || j === "undecided") return w;
  }
  return null;
}

export function adjacentAccessibleCatalogIds(
  catalog: readonly Work[],
  id: number,
  record: JudgmentRecord
): { prev: number | null; next: number | null } {
  const accessible = catalog.filter((w) => canAccessCatalogWork(w.id, record));
  const idx = accessible.findIndex((w) => w.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? accessible[idx - 1]!.id : null,
    next: idx < accessible.length - 1 ? accessible[idx + 1]!.id : null,
  };
}

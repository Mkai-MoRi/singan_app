import { PRACTICE_WORK, SECRET_WORK, WORKS, type Work } from "@/lib/dummyWorks";
import type { JudgmentRecord } from "@/lib/judgmentsStorage";

export const BASE_CATALOG_SIZE = 20;

export type CatalogUnlockFlags = {
  secretUnlocked: boolean;
  practiceUnlocked: boolean;
};

export function listCatalogWorks(flags: CatalogUnlockFlags): readonly Work[] {
  const practice = [PRACTICE_WORK];
  const core = [...WORKS];
  const secret = flags.secretUnlocked ? [SECRET_WORK] : [];
  return [...practice, ...core, ...secret];
}

/** 共有 `?j=` 用: 1–20 + オプション 21。練習 id 0 は含めない。 */
export function listCodecCatalogWorks(secretUnlocked: boolean): readonly Work[] {
  return listCatalogWorks({ secretUnlocked, practiceUnlocked: false });
}

export function catalogSlotTotal(flags: CatalogUnlockFlags): number {
  return listCatalogWorks(flags).length;
}

export function findCatalogWork(id: number, flags: CatalogUnlockFlags): Work | undefined {
  return listCatalogWorks(flags).find((w) => w.id === id);
}

export function adjacentCatalogIds(
  catalog: readonly Work[],
  id: number
): { prev: number | null; next: number | null } {
  const idx = catalog.findIndex((w) => w.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? catalog[idx - 1]!.id : null,
    next: idx < catalog.length - 1 ? catalog[idx + 1]!.id : null,
  };
}

export function countJudgedInCatalog(catalog: readonly Work[], record: JudgmentRecord): number {
  return catalog.filter((w) => (record[w.id] ?? "undecided") !== "undecided").length;
}

export function firstUndecidedInCatalog(record: JudgmentRecord, catalog: readonly Work[]): Work | null {
  for (const w of catalog) {
    const j = record[w.id];
    if (j === undefined || j === "undecided") return w;
  }
  return null;
}

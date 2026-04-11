import { SECRET_WORK, WORKS, type Work } from "@/lib/dummyWorks";
import type { JudgmentRecord } from "@/lib/judgmentsStorage";

export const BASE_CATALOG_SIZE = 20;

export function listCatalogWorks(secretUnlocked: boolean): readonly Work[] {
  return secretUnlocked ? [...WORKS, SECRET_WORK] : WORKS;
}

export function catalogSlotTotal(secretUnlocked: boolean): number {
  return secretUnlocked ? 21 : BASE_CATALOG_SIZE;
}

export function findCatalogWork(id: number, secretUnlocked: boolean): Work | undefined {
  return listCatalogWorks(secretUnlocked).find((w) => w.id === id);
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

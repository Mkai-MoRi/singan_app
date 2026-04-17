import type { Work } from "@/lib/dummyWorks";

function normalizeSearchKey(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[『』「」\[\]()（）]/g, "")
    .replace(/[/／|｜]/g, "");
}

function haystackMatchesQuery(nq: string, haystacks: readonly string[]): boolean {
  for (const hay of haystacks) {
    const nh = normalizeSearchKey(hay);
    if (!nh) continue;
    if (nh.includes(nq) || nq.includes(nh)) return true;
  }
  return false;
}

/**
 * カタログ内の作品を検索語で 1 件返す（先頭一致優先ではなく配列順の先勝ち）。
 * 正規化後 2 文字未満のクエリは無視する。
 */
export function findCatalogWorkBySearchQuery(catalog: readonly Work[], rawQuery: string): Work | undefined {
  const q = rawQuery.trim();
  if (!q) return undefined;
  const nq = normalizeSearchKey(q);
  if (nq.length < 2) return undefined;

  for (const work of catalog) {
    const haystacks = [work.title, work.caseName, work.meta, ...(work.searchAliases ?? [])];
    if (haystackMatchesQuery(nq, haystacks)) return work;
  }
  return undefined;
}

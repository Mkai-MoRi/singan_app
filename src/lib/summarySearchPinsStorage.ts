const STORAGE_KEY = "singan-kanteishi:summary-search-pins:v1";

export function loadSummarySearchPins(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  } catch {
    return [];
  }
}

export function saveSummarySearchPins(ids: readonly number[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/** 先頭に追加し、重複は除去する */
export function prependSummarySearchPin(id: number): number[] {
  const cur = loadSummarySearchPins();
  const next = [id, ...cur.filter((x) => x !== id)];
  saveSummarySearchPins(next);
  return next;
}

export function clearSummarySearchPins(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

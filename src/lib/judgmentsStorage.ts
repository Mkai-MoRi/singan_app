export type Judgment = "undecided" | "authentic" | "fake" | "pending";

export type JudgmentRecord = Record<number, Judgment>;

const STORAGE_KEY = "singan-kanteishi:v1";

export function loadJudgments(): JudgmentRecord {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveJudgment(id: number, value: Judgment): void {
  if (typeof window === "undefined") return;
  const current = loadJudgments();
  current[id] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function clearJudgments(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

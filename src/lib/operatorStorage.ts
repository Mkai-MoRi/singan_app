const STORAGE_KEY = "singan-kanteishi:operator:v1";
export const OPERATOR_NAME_MAX_LEN = 32;

export function loadOperatorName(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    const s = String(raw).trim().slice(0, OPERATOR_NAME_MAX_LEN);
    return s;
  } catch {
    return "";
  }
}

export function saveOperatorName(name: string): void {
  if (typeof window === "undefined") return;
  const next = name.trim().slice(0, OPERATOR_NAME_MAX_LEN);
  try {
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

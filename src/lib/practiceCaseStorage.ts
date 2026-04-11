const STORAGE_KEY = "singan-kanteishi:practice-case-unlocked:v1";

export const PRACTICE_UNLOCK_CHANGED_EVENT = "singan:practice-unlock-changed";

export function loadPracticeCaseUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function savePracticeCaseUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (unlocked) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
  window.dispatchEvent(new Event(PRACTICE_UNLOCK_CHANGED_EVENT));
}

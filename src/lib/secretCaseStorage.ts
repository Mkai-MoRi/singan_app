const STORAGE_KEY = "singan-kanteishi:secret-case-unlocked:v1";

export const SECRET_UNLOCK_CHANGED_EVENT = "singan:secret-unlock-changed";

export function loadSecretCaseUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveSecretCaseUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (unlocked) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
  window.dispatchEvent(new Event(SECRET_UNLOCK_CHANGED_EVENT));
}

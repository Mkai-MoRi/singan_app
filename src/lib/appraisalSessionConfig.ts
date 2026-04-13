/**
 * 鑑定セッションの制限時間（ミリ秒）。
 * 本番想定は 60 * 60 * 1000（60 分）。検証中は短くして挙動を確認してください。
 */
export const APPRAISAL_SESSION_LIMIT_MS = 20_000;

/** タイムアップ時の集合案内（会場名は運用に合わせて差し替え） */
export const APPRAISAL_GATHER_MESSAGE = "丸々へお集まりください。";

/** 終盤ウィンドウ算出用: 総時間に対する割合（HUD は `min(MAX_SEC, total*FRACTION)` 秒以下で強調） */
export const APPRAISAL_URGENT_REMAIN_FRACTION = 0.1;
/** 終盤ウィンドウ算出用: 秒上限（長セッションでは最後のこの秒数までを強調） */
export const APPRAISAL_URGENT_REMAIN_MAX_SEC = 30;

const DEADLINE_KEY = "singan-kanteishi:appraisal-deadline-ms:v1";
const SESSION_START_KEY = "singan-kanteishi:appraisal-session-start-ms:v1";

export function readAppraisalDeadlineMs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DEADLINE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeAppraisalDeadlineMs(deadlineMs: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DEADLINE_KEY, String(deadlineMs));
  } catch {
    /* noop */
  }
}

export function clearAppraisalDeadlineMs(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DEADLINE_KEY);
  } catch {
    /* noop */
  }
}

export function readAppraisalSessionStartMs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_START_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeAppraisalSessionStartMs(startMs: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_START_KEY, String(startMs));
  } catch {
    /* noop */
  }
}

export function clearAppraisalSessionStartMs(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_START_KEY);
  } catch {
    /* noop */
  }
}

/** 端末リセット用: 締切とセッション開始の両方を消す */
export function clearAppraisalSessionStorage(): void {
  clearAppraisalDeadlineMs();
  clearAppraisalSessionStartMs();
}

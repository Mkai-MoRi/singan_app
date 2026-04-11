/** 判定画面から一覧へ戻るときのスワイプ方向（一覧側の入場演出用） */
export const WORKS_RETURN_SWIPE_KEY = "singan-kanteishi:works-return";

export type WorksReturnSwipe = "left" | "right" | "pending";

export function setWorksReturnSwipe(dir: WorksReturnSwipe) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WORKS_RETURN_SWIPE_KEY, dir);
  } catch {
    /* noop */
  }
}

/** 値は残す（Strict Mode の二重マウントでも演出が消えないようにする） */
export function peekWorksReturnSwipe(): WorksReturnSwipe | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(WORKS_RETURN_SWIPE_KEY);
    if (v === "left" || v === "right" || v === "pending") return v;
    return null;
  } catch {
    return null;
  }
}

export function clearWorksReturnSwipe() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(WORKS_RETURN_SWIPE_KEY);
  } catch {
    /* noop */
  }
}

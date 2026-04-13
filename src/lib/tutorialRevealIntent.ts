const KEY = "singan-kanteishi:play-works-grid-reveal:v1";

export function setTutorialRevealIntent(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* noop */
  }
}

/** 一覧で一度だけグリッド解禁アニメを再生する意図を取り出して消す */
export function consumeTutorialRevealIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(KEY) !== "1") return false;
    sessionStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

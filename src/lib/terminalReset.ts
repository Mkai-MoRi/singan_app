import { clearJudgments } from "@/lib/judgmentsStorage";
import { saveOperatorName } from "@/lib/operatorStorage";
import { savePracticeCaseUnlocked } from "@/lib/practiceCaseStorage";
import { saveSecretCaseUnlocked } from "@/lib/secretCaseStorage";
import { clearWorksReturnSwipe } from "@/lib/worksReturnSwipe";

/** クライアントの各フックがストレージと同期するための通知 */
export const TERMINAL_RESET_EVENT = "singan:terminal-reset";

function stripJudgmentsShareParam(): void {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("j")) return;
    u.searchParams.delete("j");
    const q = u.searchParams.toString();
    window.history.replaceState({}, "", `${u.pathname}${q ? `?${q}` : ""}${u.hash}`);
  } catch {
    /* noop */
  }
}

/** 端末に保存した鑑定データ・呼称・拡張枠フラグ・一時演出をすべて消去する */
export function resetTerminal(): void {
  if (typeof window === "undefined") return;
  clearJudgments();
  saveOperatorName("");
  saveSecretCaseUnlocked(false);
  savePracticeCaseUnlocked(false);
  clearWorksReturnSwipe();
  stripJudgmentsShareParam();
  window.dispatchEvent(new Event(TERMINAL_RESET_EVENT));
}

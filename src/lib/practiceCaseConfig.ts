/** 端末キーワード「練習」で CASE_00（練習問題）をカタログに追加 */
export function matchesPracticeUnlockPhrase(input: string): boolean {
  return input.trim() === "練習";
}

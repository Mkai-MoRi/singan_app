/**
 * 隠し鑑定枠（21件目）の解禁フレーズ。
 * - `next dev`（NODE_ENV=development）では「夕陽ちゃん」が有効。
 * - 本番では `NEXT_PUBLIC_SECRET_CASE_KEYWORD` をカンマ区切りで設定したときのみ有効（未設定ならキーワード欄は出さない）。
 */
export function getSecretUnlockPhrases(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_SECRET_CASE_KEYWORD;
  if (raw && raw.trim()) {
    return raw
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV === "development") {
    return ["夕陽ちゃん"];
  }
  return [];
}

export function hasSecretKeywordFeature(): boolean {
  return getSecretUnlockPhrases().length > 0;
}

export function matchesSecretUnlockPhrase(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  return getSecretUnlockPhrases().some((p) => p === t);
}

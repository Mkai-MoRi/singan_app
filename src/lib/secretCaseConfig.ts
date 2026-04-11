/**
 * 隠し鑑定枠（21件目）の解禁フレーズ。
 * - 未設定時のデフォルトは「夕陽ちゃん」（本番・開発共通）。
 * - `NEXT_PUBLIC_SECRET_CASE_KEYWORD` をカンマ区切りで指定すると、それに置き換え（複数可）。
 */
export function getSecretUnlockPhrases(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_SECRET_CASE_KEYWORD;
  if (raw && raw.trim()) {
    return raw
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["夕陽ちゃん"];
}

export function matchesSecretUnlockPhrase(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  return getSecretUnlockPhrases().some((p) => p === t);
}

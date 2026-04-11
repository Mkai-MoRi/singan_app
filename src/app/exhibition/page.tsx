const TOKYO_NODE_WORKS_URL =
  "https://www.tokyonode.jp/events/tony-oursler/index.html#works";

export default function ExhibitionPage() {
  return (
    <main className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--hairline)]/40 px-4 py-3">
        <p className="text-[0.65rem] font-bold tracking-[0.2em] text-[color:var(--fg-muted)]">
          TOKYO NODE · SELECTED WORKS
        </p>
        <a
          href={TOKYO_NODE_WORKS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-display text-[0.65rem] font-bold tracking-tight text-[color:var(--primary)] underline-offset-2 hover:underline"
        >
          新しいタブで開く
        </a>
      </div>
      <iframe
        title="トニー・アウスラー展 — 公式サイト（作品紹介）"
        src={TOKYO_NODE_WORKS_URL}
        className="min-h-0 w-full flex-1 border-0 bg-[color:var(--tertiary)]/20"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </main>
  );
}

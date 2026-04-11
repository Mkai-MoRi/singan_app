import Link from "next/link";

export default function TrustPage() {
  return (
    <main className="mx-auto flex min-h-0 max-w-lg flex-1 flex-col px-5 py-6">
      <p className="mb-2 text-[0.6875rem] font-bold tracking-[0.25em] text-[color:var(--primary)]">[PROTOCOL_MANIFEST]</p>
      <h1 className="font-display mb-4 text-2xl font-bold leading-tight tracking-tighter text-[color:var(--primary)] glitch-text">
        STRICT_VALIDATION
      </h1>
      <div className="mb-6 h-px w-full bg-[color:var(--hairline)]/40" />
      <div className="space-y-4 text-xs leading-relaxed" style={{ color: "var(--secondary)" }}>
        <p>
          本端末は高忠実度デジタル資産の異常検知のために稼働する。判定セッションはローカルにのみ記録され、外部へは送信されない。
        </p>
        <div className="border-l-2 border-[color:var(--primary)]/50 pl-4 py-2">
          <p className="mb-1 text-[0.6rem] uppercase tracking-widest text-[color:var(--fg-muted)]">接続</p>
          <p className="font-display font-bold text-[color:var(--tertiary)]">LOCAL_ENCRYPTED</p>
        </div>
      </div>
      <div className="mt-auto pt-8">
        <Link href="/" className="text-xs text-[color:var(--fg-muted)] hover:text-[color:var(--primary)]">
          ← 端末へ戻る
        </Link>
      </div>
    </main>
  );
}

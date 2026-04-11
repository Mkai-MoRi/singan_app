import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-md mx-auto min-h-dvh flex flex-col justify-between px-6 py-12">
      {/* Header label */}
      <div>
        <p
          className="text-xs tracking-widest mb-16"
          style={{ color: "var(--fg-muted)" }}
        >
          // OBS &nbsp;&nbsp; SINGAN-TERMINAL v1.0
        </p>

        {/* Title block */}
        <div className="mb-12">
          <h1
            className="text-4xl font-bold tracking-tight leading-tight mb-3"
            style={{ color: "var(--fg)" }}
          >
            贋作鑑定端末
          </h1>
          <div
            className="w-12 h-px mb-6"
            style={{ background: "var(--accent)" }}
          />
          <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
            20点の作品を調査し、本物・偽物・保留のいずれかを記録せよ。
          </p>
        </div>

        {/* Primary CTA */}
        <Link
          href="/works"
          className="block w-full text-center py-4 text-sm tracking-widest"
          style={{
            border: "1px solid var(--accent)",
            color: "var(--accent)",
          }}
        >
          判定を始める
        </Link>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end">
        <span className="text-xs" style={{ color: "var(--line)" }}>
          CLASSIFIED ARCHIVE
        </span>
        <Link
          href="/summary"
          className="text-xs tracking-wider"
          style={{ color: "var(--fg-muted)" }}
        >
          結果確認 →
        </Link>
      </div>
    </main>
  );
}

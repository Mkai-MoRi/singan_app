import { Suspense } from "react";
import WorksPageClient from "./works-page-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh flex-1 items-center justify-center bg-[color:var(--bg)] font-mono text-[0.65rem] tracking-widest text-[color:var(--fg-muted)]">
          SYNC_GRID…
        </main>
      }
    >
      <WorksPageClient />
    </Suspense>
  );
}

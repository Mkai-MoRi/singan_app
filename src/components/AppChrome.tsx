"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

function MaterialIcon({
  name,
  filled,
  className = "",
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined text-[22px] leading-none ${className}`}
      style={
        filled
          ? ({ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } as CSSProperties)
          : ({ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" } as CSSProperties)
      }
      aria-hidden
    >
      {name}
    </span>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-opacity duration-75 ${
        active ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] opacity-100" : "text-[color:var(--primary)] opacity-60 hover:opacity-100"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <MaterialIcon name={icon} filled={active} />
      <span className="font-display text-[0.6rem] font-bold tracking-tight">{label}</span>
    </Link>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onWorksIndex = pathname === "/works";
  const onJudge = pathname.startsWith("/works/") && pathname !== "/works";
  const onSummary = pathname === "/summary";
  const onTrust = pathname === "/trust";

  const worksTabActive = onWorksIndex || onJudge;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col pt-[env(safe-area-inset-top,0px)] pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>

      <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-stretch border-t border-[color:color-mix(in_srgb,var(--hairline)_42%,var(--tertiary)_8%)]/45 bg-[color:var(--bg)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-10px_40px_-12px_color-mix(in_srgb,var(--tertiary)_10%,transparent)]">
        <NavItem href="/" icon="qr_code_scanner" label="端末" active={onHome} />
        <NavItem href="/works" icon="analytics" label="一覧" active={worksTabActive} />
        <NavItem href="/summary" icon="history_edu" label="記録" active={onSummary} />
        <NavItem href="/trust" icon="shield_with_heart" label="信頼" active={onTrust} />
      </nav>
    </div>
  );
}

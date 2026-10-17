import Link from "next/link";

export function Brand({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center bg-clay text-xs font-medium text-paper">A</span>
      <span className={`text-sm font-medium tracking-tight ${tone === "paper" ? "text-paper" : "text-ink"}`}>
        AutoAudit
      </span>
    </Link>
  );
}

export function SiteHeader({ tone = "ink", right }: { tone?: "ink" | "paper"; right?: React.ReactNode }) {
  const link = tone === "paper" ? "text-paper/60 hover:text-paper" : "text-ink/60 hover:text-ink";
  return (
    <header className="no-print flex items-center justify-between gap-6">
      <Brand tone={tone} />
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/audit" className={`transition-colors ${link}`}>
          New audit
        </Link>
        <Link href="/compare" className={`transition-colors ${link}`}>
          Compare stores
        </Link>
        {right}
      </nav>
    </header>
  );
}

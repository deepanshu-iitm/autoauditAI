import Link from "next/link";
import { CompareRunner } from "@/components/CompareRunner";
import { EXAMPLES } from "@/lib/examples";
import { SiteHeader } from "@/components/SiteHeader";
import { latestPerStore, loadAudits, rank } from "@/lib/audits";
import { inr } from "@/lib/detectors";
import { PATTERN_BY_ID } from "@/lib/patterns";

export const dynamic = "force-dynamic";

const WALL: Record<string, string> = {
  otp: "Phone OTP before order summary",
  login: "Login before order summary",
  captcha: "Captcha",
  out_of_stock: "Out of stock",
  site_error: "Site error",
  other: "Stopped early",
};

export default async function ComparePage() {
  const audits = rank(latestPerStore(await loadAudits()));
  const totalAdded = audits.reduce((sum, audit) => sum + audit.gap.undisclosed, 0);
  const totalSteps = audits.reduce((sum, audit) => sum + (audit.run.num_of_steps ?? audit.run.progress.length), 0);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10">
      <SiteHeader />

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone">Compare stores</p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight">
            Same shopper. Same pincode. <em className="text-clay">Different checkouts.</em>
          </h1>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            ["Stores audited", String(audits.length)],
            ["Undisclosed ₹", totalAdded ? inr(totalAdded) : "₹0"],
            ["Agent steps", String(totalSteps)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="font-serif text-4xl tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-stone">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-14 border border-ink/10 p-6 sm:p-8">
        <CompareRunner examples={EXAMPLES.slice(0, 2).map((example) => example.url)} />
      </section>

      <section className="mt-14 pb-16">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone">
          Ranked by rupees added without being shown upfront
        </p>
        <ol className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
          {audits.map((audit, index) => {
            const { observation: o, gap, findings } = audit;
            const patterns = [...new Set(findings.map((finding) => PATTERN_BY_ID[finding.pattern].name))];
            return (
              <li key={audit.run.run_id}>
                <Link
                  href={`/audit/${audit.run.run_id}`}
                  className="group grid items-center gap-4 py-6 transition-colors hover:bg-white/50 sm:grid-cols-[3rem_1.4fr_1fr_1fr_auto] sm:px-4"
                >
                  <span className="font-serif text-3xl text-clay">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{o.store_name}</p>
                    <p className="truncate text-sm text-ink/60">{o.product_name}</p>
                    {o.blocked_by !== "none" && (
                      <p className="mt-1 text-xs text-stone">{WALL[o.blocked_by]}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-serif text-2xl tracking-tight">
                      {gap.listed != null ? inr(gap.listed) : "—"}
                      <span className="text-ink/30"> → </span>
                      <span className={gap.added ? "text-clay" : ""}>{gap.final != null ? inr(gap.final) : "—"}</span>
                    </p>
                    <p className="text-xs text-stone">
                      {gap.undisclosed > 0 ? `${inr(gap.undisclosed)} not shown upfront` : "Product page → last total"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {patterns.length === 0 && <span className="text-xs text-stone">Nothing flagged</span>}
                    {patterns.map((name) => (
                      <span key={name} className="border border-ink/15 px-2 py-0.5 text-[11px] text-ink/70">
                        {name}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-ink/40 transition-colors group-hover:text-clay">Report →</span>
                </Link>
              </li>
            );
          })}
          {audits.length === 0 && <li className="py-10 text-sm text-stone">No audits yet.</li>}
        </ol>
      </section>
    </main>
  );
}

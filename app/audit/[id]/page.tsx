import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { RecheckButton } from "@/components/RecheckButton";
import { Shot } from "@/components/Shot";
import { SiteHeader } from "@/components/SiteHeader";
import { loadAudit } from "@/lib/audits";
import { compareCountdowns, formatSeconds, inr } from "@/lib/detectors";
import { pickStep, screenshotUrl, stageOfAction } from "@/lib/evidence";
import { PATTERN_BY_ID } from "@/lib/patterns";
import { STAGE_LABEL, STAGES, type CoverageStatus, type Severity } from "@/lib/types";

export const dynamic = "force-dynamic";

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  high: { label: "Rupees added", className: "bg-clay text-paper" },
  medium: { label: "Repeatable pattern", className: "bg-ink text-paper" },
  review: { label: "For review", className: "border border-ink/25 text-ink/70" },
};

const COVERAGE: Record<CoverageStatus, { label: string; dot: string }> = {
  found: { label: "Found", dot: "bg-clay" },
  review: { label: "For review", dot: "bg-transparent border border-clay" },
  clear: { label: "Not found", dot: "bg-ink/25" },
  not_checked: { label: "Not checked", dot: "bg-transparent border border-ink/20" },
};

const BLOCKED: Record<string, string> = {
  otp: "Stopped at a phone OTP",
  login: "Stopped at a login",
  captcha: "Stopped at a captcha",
  out_of_stock: "Product out of stock",
  site_error: "The site returned an error",
  other: "Could not continue",
};

const observedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await loadAudit(id);
  if (!audit) notFound();

  const { run, observation: o, findings, coverage, gap } = audit;
  const steps = run.steps ?? [];
  const highCount = findings.filter((f) => f.severity !== "review").length;
  const reviewCount = findings.length - highCount;
  const countdownChecks = compareCountdowns(run, o);
  const hasCountdown = o.urgency_claims.some((claim) => claim.kind === "countdown");
  const furthest = STAGES.indexOf(o.furthest_stage);

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden bg-night text-paper print:bg-white print:text-ink">
        <div className="no-print pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-clay/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-8 sm:px-10">
          <SiteHeader tone="paper" right={<PrintButton />} />

          <div className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-paper/50 print:text-stone">
                Checkout audit · {o.store_name}
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
                {o.product_name ?? "Product"}
              </h1>
              <p className="mt-5 text-sm text-paper/60 print:text-stone">
                Observed {observedAt(run.started_at)} IST · guest shopper, Bengaluru 560037 ·{" "}
                <a href={o.product_url || run.url} className="underline decoration-paper/30 underline-offset-4 hover:text-paper">
                  product page
                </a>
              </p>
            </div>

            <div className="grid grid-cols-[auto_auto_1fr] items-end gap-x-8 gap-y-2">
              <div>
                <p className="text-xs text-paper/50 print:text-stone">Product page</p>
                <p className="mt-1 font-serif text-5xl tracking-tight sm:text-6xl">
                  {gap.listed != null ? inr(gap.listed) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-paper/50 print:text-stone">
                  {gap.finalIsPartial ? "Last total shown" : "At payment"}
                </p>
                <p className="mt-1 font-serif text-5xl tracking-tight text-clay sm:text-6xl">
                  {gap.final != null ? inr(gap.final) : "—"}
                </p>
              </div>
              <div className="pb-2 text-sm text-paper/70 print:text-ink/70">
                {gap.added != null && gap.added > 0 && (
                  <p>
                    <span className="font-serif text-2xl text-paper print:text-ink">+{inr(gap.added)}</span>
                    <br />
                    added after the product was chosen
                  </p>
                )}
                {gap.added === 0 && !gap.finalIsPartial && <p>No change between the product page and payment.</p>}
                {gap.finalIsPartial && <p>{BLOCKED[o.blocked_by]}. Later charges could not be seen.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <section className="grid grid-cols-2 border-b border-ink/10 sm:grid-cols-5">
          {[
            ["Findings", String(highCount)],
            ["For review", String(reviewCount)],
            ["Stages reached", `${audit.stagesReached} of 4`],
            ["Agent steps", String(run.num_of_steps ?? run.progress.length)],
            ["Time", formatSeconds(run.elapsed_seconds)],
          ].map(([label, value]) => (
            <div key={label} className="border-r border-ink/10 py-6 pr-4 last:border-r-0 sm:px-6 sm:first:pl-0">
              <p className="font-serif text-4xl tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-stone">{label}</p>
            </div>
          ))}
        </section>

        <section className="py-14">
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone">The journey</p>
          <ol className="mt-6 grid gap-px bg-ink/10 sm:grid-cols-4">
            {STAGES.map((stage, index) => {
              const reached = index <= furthest;
              const stoppedHere = index === furthest && o.blocked_by !== "none";
              const fees = o.fee_lines.filter((fee) => fee.first_seen_stage === stage);
              return (
                <li key={stage} className={`bg-paper p-6 ${reached ? "" : "opacity-45"}`}>
                  <div className="flex items-baseline justify-between">
                    <p className="font-medium">{STAGE_LABEL[stage]}</p>
                    <span className="font-serif text-xl text-clay">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm text-ink/75">
                    {stage === "product" && gap.listed != null && <p>Price shown {inr(gap.listed)}</p>}
                    {stage === "cart" && reached && (
                      <p>
                        {o.cart_items.length} item{o.cart_items.length === 1 ? "" : "s"} in cart
                      </p>
                    )}
                    {fees.map((fee) => (
                      <p key={fee.label} className="text-clay">
                        + {inr(fee.amount_inr)} {fee.label}
                      </p>
                    ))}
                    {stage === o.furthest_stage && gap.final != null && !stoppedHere && (
                      <p className="font-medium text-ink">Total {inr(gap.final)}</p>
                    )}
                    {stoppedHere && <p className="text-ink">{BLOCKED[o.blocked_by]}</p>}
                    {!reached && <p>Not reached</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="pb-14">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone">Findings</p>
            <p className="text-xs text-stone">Each finding is a rule applied to what the agent saw</p>
          </div>
          {findings.length === 0 && (
            <p className="mt-6 border border-ink/10 p-8 font-serif text-2xl">
              Nothing was flagged on the steps the agent could reach.
            </p>
          )}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {findings.map((finding) => {
              const step = pickStep(steps, finding);
              const stepNumber = step ? steps.indexOf(step) + 1 : null;
              return (
                <article key={finding.id} className="break-inside-avoid border border-ink/10 bg-white/50">
                  {step && (
                    <div className="border-b border-ink/10">
                      <Shot
                        src={screenshotUrl(run.run_id, step.id)}
                        alt={step.action}
                        fallback={finding.quote ? `“${finding.quote}”` : undefined}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${SEVERITY[finding.severity].className}`}>
                        {SEVERITY[finding.severity].label}
                      </span>
                      <span className="text-xs text-stone">{PATTERN_BY_ID[finding.pattern].name}</span>
                    </div>
                    <h2 className="mt-4 font-serif text-2xl leading-snug tracking-tight">{finding.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink/70">{finding.summary}</p>
                    {finding.quote && (
                      <blockquote className="mt-4 border-l-2 border-clay pl-4 text-sm italic text-ink/80">
                        “{finding.quote}”
                      </blockquote>
                    )}
                    <p className="mt-4 text-xs text-stone">
                      {STAGE_LABEL[finding.stage]}
                      {stepNumber && step && ` · step ${stepNumber}: ${step.action}`}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {hasCountdown && (
          <section className="mb-14 grid gap-8 border border-ink/10 p-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-stone">Fresh-session recheck</p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight">Is the countdown real?</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                A new browser visits the same product as a first-time shopper. A real deadline keeps
                counting down. A fake one restarts.
              </p>
              <div className="mt-6">
                <RecheckButton runId={run.run_id} label={run.recheck ? "Recheck again" : "Recheck in a fresh session"} />
              </div>
            </div>
            <div className="space-y-4">
              {countdownChecks.length === 0 && (
                <p className="text-sm text-stone">
                  {run.recheck
                    ? "The fresh session did not show a comparable countdown."
                    : "Not rechecked yet."}
                </p>
              )}
              {countdownChecks.map((check) => (
                <div key={check.text} className="grid grid-cols-3 gap-4 border-b border-ink/10 pb-4">
                  <div>
                    <p className="text-xs text-stone">First visit</p>
                    <p className="mt-1 font-serif text-3xl">{formatSeconds(check.first)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone">Should show</p>
                    <p className="mt-1 font-serif text-3xl text-ink/50">
                      {check.expected > 0 ? formatSeconds(check.expected) : "Ended"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone">Fresh session</p>
                    <p className={`mt-1 font-serif text-3xl ${check.restarted ? "text-clay" : ""}`}>
                      {check.second != null ? formatSeconds(check.second) : "None"}
                    </p>
                  </div>
                  <p className="col-span-3 text-xs text-ink/60">
                    {check.restarted ? "Restarted for a new visitor." : "Consistent with a real deadline."} “{check.text}”
                    {run.recheck && ` · rechecked ${observedAt(run.recheck.started_at)} IST`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="break-inside-avoid pb-14">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone">CCPA coverage · 13 dark patterns</p>
            <div className="hidden gap-4 text-xs text-stone sm:flex">
              {Object.values(COVERAGE).map((c) => (
                <span key={c.label} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 grid border-l border-t border-ink/10 sm:grid-cols-2 lg:grid-cols-3">
            {coverage.map((item) => (
              <div key={item.pattern} className="border-b border-r border-ink/10 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{PATTERN_BY_ID[item.pattern].name}</p>
                  <span className="flex items-center gap-1.5 text-xs text-ink/70">
                    <span className={`h-2 w-2 rounded-full ${COVERAGE[item.status].dot}`} />
                    {COVERAGE[item.status].label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-stone">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {steps.length > 0 && (
          <section className="no-print pb-14">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone">Every step the agent took</p>
            <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-4">
              {steps.slice(0, -1).map((step, index) => (
                <figure key={step.id} className="w-72 shrink-0 snap-start border border-ink/10 bg-white/50">
                  <Shot src={screenshotUrl(run.run_id, step.id)} alt={step.action} />
                  <figcaption className="flex gap-2 p-3 text-xs">
                    <span className="font-serif text-clay">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-ink/70">{step.action}</span>
                    {stageOfAction(step.action) && (
                      <span className="ml-auto shrink-0 text-stone">{STAGE_LABEL[stageOfAction(step.action)!]}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 py-8 text-xs leading-relaxed text-stone">
          <p className="max-w-2xl">
            Observations from one guest journey on the date shown, mapped to the CCPA Guidelines for
            Prevention and Regulation of Dark Patterns, 2023. Not a legal finding. The agent used
            dummy contact details and stopped before payment. Run {run.run_id}.
          </p>
          <Link href="/compare" className="no-print text-ink underline underline-offset-4">
            Compare with other stores
          </Link>
        </footer>
      </div>
    </main>
  );
}

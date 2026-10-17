import { LiveAudit } from "@/components/LiveAudit";
import { SiteHeader } from "@/components/SiteHeader";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10">
      <SiteHeader />
      <div className="mt-14 max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone">New audit</p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight">
          Send a shopper to <em className="text-clay">the checkout.</em>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
          The agent adds one item to the cart, checks out as a guest in Bengaluru, and stops before
          payment. It takes three to six minutes.
        </p>
      </div>
      <LiveAudit key={url ?? ""} initialUrl={url} />
    </main>
  );
}

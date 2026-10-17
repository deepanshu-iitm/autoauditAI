import Link from "next/link";

const steps = [
  {
    index: "01",
    title: "Shops like a customer",
    text: "Opens the product, adds it to the cart, and checks out as a guest.",
  },
  {
    index: "02",
    title: "Stops before payment",
    text: "Records every fee, add-on, and countdown on the way. Never pays.",
  },
  {
    index: "03",
    title: "Reports with proof",
    text: "Each finding names the CCPA pattern, with the amount, quote, and page.",
  },
];

export default function HomePage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <section className="flex min-h-screen flex-col justify-between bg-[radial-gradient(ellipse_at_top_left,rgba(196,86,42,0.18),transparent_42%)] px-8 py-8 sm:px-12 lg:px-16">
        <header className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center bg-clay text-xs font-medium text-paper">
            A
          </span>
          <p className="text-sm font-medium tracking-tight">AutoAudit</p>
        </header>

        <div className="max-w-xl py-12">
          <h1 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-7xl">
            The price you chose is not <em className="font-normal text-clay">the price you pay.</em>
          </h1>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink/75">
            AutoAudit runs the regulator&apos;s reality test on an online store. An agent walks the
            checkout like a shopper and reports every charge and add-on that appeared after the
            product was chosen.
          </p>
        </div>

        <div className="max-w-xl border-t border-ink/10 pt-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone">
            The reality test that started it
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-xs text-stone">Product page</p>
              <p className="mt-1 font-serif text-4xl tracking-tight">₹170</p>
            </div>
            <div>
              <p className="text-xs text-stone">Cart</p>
              <p className="mt-1 font-serif text-4xl tracking-tight text-clay">₹177.44</p>
            </div>
            <ul className="space-y-1 pb-1 text-sm text-ink/75">
              <li>
                <span className="text-clay">Drip pricing.</span> Handling charge added in the cart.
              </li>
              <li>
                <span className="text-clay">Basket sneaking.</span> Paid membership pre-selected.
              </li>
            </ul>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-stone">
            From the CCPA&apos;s 2025 order fining Zepto ₹7 lakh. Every online store in India must
            self-audit for these patterns each year from 1 January 2027.
          </p>
        </div>
      </section>

      <aside className="relative flex min-h-[72vh] items-center overflow-hidden bg-night px-8 py-14 text-paper sm:px-12 lg:min-h-screen">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-clay/45 blur-3xl" />
        <div className="relative w-full max-w-md">
          <p className="text-[11px] uppercase tracking-[0.22em] text-paper/45">How it works</p>
          <ol className="mt-6 space-y-4">
            {steps.map((step) => (
              <li
                key={step.index}
                className="border border-paper/10 bg-paper/[0.04] p-6 backdrop-blur-sm transition-colors hover:border-clay/50"
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">{step.title}</p>
                  <span className="font-serif text-2xl text-clay">{step.index}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-paper/65">{step.text}</p>
              </li>
            ))}
          </ol>
          <Link
            href="/audit"
            className="group mt-8 flex items-center justify-between bg-clay px-6 py-4 text-sm font-medium text-paper transition-colors hover:bg-[#b04b23]"
          >
            Start an audit
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </aside>
    </main>
  );
}

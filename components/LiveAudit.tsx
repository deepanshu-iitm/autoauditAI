"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { stageOfAction } from "@/lib/evidence";
import { EXAMPLES } from "@/lib/examples";
import { STAGE_LABEL, STAGES, type Stage } from "@/lib/types";
import { useRun } from "@/lib/use-run";

export function LiveAudit({ initialUrl }: { initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const run = useRun("/api/audit");
  const started = useRef(false);

  async function begin(target: string) {
    const outcome = await run.start({ url: target });
    if (outcome.ok && outcome.runId) router.push(`/audit/${outcome.runId}`);
  }

  useEffect(() => {
    if (initialUrl && !started.current) {
      started.current = true;
      void begin(initialUrl);
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    void begin(url.trim());
  }

  const seen = run.progress.map(stageOfAction).filter((stage): stage is Stage => stage !== null);
  const current = seen.length ? Math.max(...seen.map((stage) => STAGES.indexOf(stage))) : run.status === "running" ? 0 : -1;
  const running = run.status === "running";

  return (
    <div className="mt-10">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a product page URL from an Indian online store"
          className="min-w-0 flex-1 border border-ink/15 bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
          required
          disabled={running}
        />
        {running ? (
          <button type="button" onClick={run.cancel} className="border border-ink/20 px-6 py-3 text-sm">
            Cancel run
          </button>
        ) : (
          <button type="submit" className="bg-clay px-7 py-3 text-sm font-medium text-paper">
            Run audit
          </button>
        )}
      </form>

      {!running && run.status === "idle" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone">
          <span>Try</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.url}
              type="button"
              onClick={() => setUrl(example.url)}
              className="border border-ink/10 px-3 py-1.5 transition-colors hover:border-clay hover:text-ink"
            >
              {example.store}
            </button>
          ))}
        </div>
      )}

      {run.error && <p className="mt-6 border border-clay/40 bg-clay/10 px-4 py-3 text-sm">{run.error}</p>}

      <ol className="mt-10 grid grid-cols-4 border-y border-ink/10">
        {STAGES.map((stage, index) => {
          const state = index < current ? "done" : index === current ? (running ? "active" : "done") : "todo";
          return (
            <li key={stage} className="relative px-1 py-4 sm:px-4">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 ${
                  state === "todo" ? "bg-transparent" : state === "active" ? "animate-pulse bg-clay" : "bg-clay"
                }`}
              />
              <p className="font-serif text-xl text-clay">{String(index + 1).padStart(2, "0")}</p>
              <p className={`mt-1 text-sm ${state === "todo" ? "text-stone" : "text-ink"}`}>{STAGE_LABEL[stage]}</p>
            </li>
          );
        })}
      </ol>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div className="relative aspect-video overflow-hidden bg-night shadow-[0_30px_80px_-40px_rgba(36,28,24,0.7)]">
          {run.streamingUrl ? (
            <iframe src={run.streamingUrl} title="Live TinyFish browser" className="h-full w-full" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-serif text-2xl text-paper/80">
                  {running ? "Opening a browser…" : "The agent's browser appears here"}
                </p>
                <p className="mt-2 text-xs text-paper/40">Live view from TinyFish while the audit runs</p>
              </div>
            </div>
          )}
          {running && (
            <span className="absolute left-4 top-4 flex items-center gap-2 bg-night/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-paper">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay" /> Live · {run.elapsed}s
            </span>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone">What the agent is doing</p>
            <p className="text-xs text-stone">{run.progress.length} steps</p>
          </div>
          <ol className="mt-4 max-h-[440px] space-y-3 overflow-auto pr-2 text-sm">
            {run.progress.map((line, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-6 shrink-0 font-serif text-clay">{String(index + 1).padStart(2, "0")}</span>
                <span className={index === run.progress.length - 1 && running ? "text-ink" : "text-ink/65"}>
                  {line}
                </span>
              </li>
            ))}
            {run.progress.length === 0 && (
              <li className="text-stone">
                {running ? "Waiting for the first step…" : "Steps stream here as the agent shops."}
              </li>
            )}
          </ol>
          {run.status === "done" && <p className="mt-6 text-sm text-clay">Building the report…</p>}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRun } from "@/lib/use-run";

const SLOTS = 4;

function RunnerCard({ url, trigger, onDone }: { url: string; trigger: number; onDone: () => void }) {
  const run = useRun("/api/audit");

  useEffect(() => {
    if (!trigger || !url) return;
    void run.start({ url }).then(onDone);
  }, [trigger]);

  if (!url || run.status === "idle") return null;
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  return (
    <div className="border border-ink/10 bg-white/50">
      <div className="relative aspect-video bg-night">
        {run.streamingUrl && run.status === "running" ? (
          <iframe src={run.streamingUrl} title={`Live browser for ${host}`} className="h-full w-full" />
        ) : (
          <p className="absolute inset-0 grid place-items-center text-xs text-paper/50">
            {run.status === "running" ? "Opening a browser…" : run.status === "done" ? "Finished" : "Stopped"}
          </p>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium">{host}</p>
          <p className="shrink-0 text-xs text-stone">
            {run.progress.length} steps · {run.elapsed}s
          </p>
        </div>
        <p className="mt-1 truncate text-xs text-ink/60">
          {run.error ?? run.progress.at(-1) ?? "Starting…"}
        </p>
        {run.status === "done" && run.runId && (
          <Link href={`/audit/${run.runId}`} className="mt-2 inline-block text-xs text-clay underline underline-offset-4">
            Open report
          </Link>
        )}
      </div>
    </div>
  );
}

export function CompareRunner({ examples }: { examples: string[] }) {
  const router = useRouter();
  const [urls, setUrls] = useState<string[]>(() =>
    Array.from({ length: SLOTS }, (_, index) => examples[index] ?? ""),
  );
  const [trigger, setTrigger] = useState(0);
  const filled = urls.filter((url) => url.trim()).length;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {urls.map((url, index) => (
          <input
            key={index}
            value={url}
            onChange={(event) =>
              setUrls((current) => current.map((value, i) => (i === index ? event.target.value : value)))
            }
            placeholder={`Product page URL ${index + 1}`}
            className="border border-ink/15 bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          disabled={filled === 0}
          onClick={() => setTrigger((value) => value + 1)}
          className="bg-clay px-7 py-3 text-sm font-medium text-paper disabled:opacity-50"
        >
          Run {filled} audit{filled === 1 ? "" : "s"} in parallel
        </button>
        <p className="text-xs text-stone">Each store gets its own browser. The ranking below updates as they finish.</p>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {urls.map((url, index) => (
          <RunnerCard key={index} url={url.trim()} trigger={trigger} onDone={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

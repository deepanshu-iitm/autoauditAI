"use client";

import { useRouter } from "next/navigation";
import { useRun } from "@/lib/use-run";

export function RecheckButton({ runId, label }: { runId: string; label: string }) {
  const router = useRouter();
  const run = useRun("/api/recheck");

  async function recheck() {
    const outcome = await run.start({ runId });
    if (outcome.ok) router.refresh();
  }

  return (
    <div className="no-print">
      <button
        type="button"
        onClick={recheck}
        disabled={run.status === "running"}
        className="bg-clay px-5 py-2.5 text-sm font-medium text-paper transition-opacity disabled:opacity-60"
      >
        {run.status === "running" ? `Visiting as a new shopper · ${run.elapsed}s` : label}
      </button>
      {run.status === "running" && run.progress.length > 0 && (
        <p className="mt-2 text-xs text-stone">{run.progress.at(-1)}</p>
      )}
      {run.error && <p className="mt-2 text-xs text-clay">{run.error}</p>}
    </div>
  );
}

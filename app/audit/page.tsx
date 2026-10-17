"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

type StreamEvent = {
  type: string;
  run_id?: string;
  streaming_url?: string;
  purpose?: string;
  status?: string;
  result?: unknown;
  error?: unknown;
  message?: string;
};

type Status = "idle" | "running" | "done" | "failed";

const DEFAULT_URL = "https://scrapeme.live/shop";
const DEFAULT_GOAL = "Open the first product. Return its name and the price shown, as JSON.";

export default function AuditPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [status, setStatus] = useState<Status>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [complete, setComplete] = useState<StreamEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  async function runAudit(event: FormEvent) {
    event.preventDefault();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("running");
    setRunId(null);
    setStreamingUrl(null);
    setProgress([]);
    setComplete(null);
    setError(null);
    setElapsed(0);

    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, goal }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const line = buffer.slice(0, boundary).replace(/^data:\s?/, "");
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          const data = JSON.parse(line) as StreamEvent;
          if (data.run_id) setRunId(data.run_id);
          if (data.type === "STREAMING_URL" && data.streaming_url) setStreamingUrl(data.streaming_url);
          if (data.type === "PROGRESS" && data.purpose) {
            setProgress((lines) => [...lines, data.purpose as string]);
          }
          if (data.type === "COMPLETE") {
            finished = true;
            setComplete(data);
            setStatus(data.status === "COMPLETED" ? "done" : "failed");
          }
          if (data.type === "ERROR") {
            throw new Error(data.message ?? "The stream stopped.");
          }
        }
      }

      if (!finished) throw new Error("The stream ended before the run finished.");
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setStatus("failed");
    } finally {
      clearInterval(timer);
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
    }
  }

  return (
    <main className="min-h-screen px-8 py-8 sm:px-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center bg-clay text-xs font-medium text-paper">
            A
          </span>
          <span className="text-sm font-medium tracking-tight">AutoAudit</span>
        </Link>
        <p className="text-xs text-stone">
          {status === "running" && `Running · ${elapsed}s`}
          {status === "done" && `Finished in ${elapsed}s · ${progress.length} steps`}
          {status === "failed" && "Run failed"}
        </p>
      </header>

      <form onSubmit={runAudit} className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.4fr_auto]">
        <label className="block">
          <span className="text-xs text-stone">Page URL</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="mt-1 w-full border border-ink/15 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-clay"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs text-stone">Goal</span>
          <input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="mt-1 w-full border border-ink/15 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-clay"
            required
          />
        </label>
        <button
          type="submit"
          disabled={status === "running"}
          className="self-end bg-clay px-6 py-2.5 text-sm font-medium text-paper transition-opacity disabled:opacity-50"
        >
          {status === "running" ? "Running…" : "Run"}
        </button>
      </form>

      {error && <p className="mt-6 border border-clay/40 bg-clay/10 px-4 py-3 text-sm">{error}</p>}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative aspect-video overflow-hidden border border-ink/10 bg-night">
          {streamingUrl ? (
            <iframe src={streamingUrl} title="Live TinyFish browser" className="h-full w-full" />
          ) : (
            <p className="absolute inset-0 grid place-items-center text-sm text-paper/50">
              {status === "running" ? "Starting the browser…" : "The live browser appears here."}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone">Progress</p>
            <ol className="mt-3 space-y-2 text-sm">
              {progress.map((line, index) => (
                <li key={index} className="flex gap-3">
                  <span className="font-serif text-clay">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-ink/80">{line}</span>
                </li>
              ))}
              {progress.length === 0 && <li className="text-stone">No steps yet.</li>}
            </ol>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone">
              Result {runId && <span className="normal-case tracking-normal">· {runId}</span>}
            </p>
            <pre className="mt-3 max-h-80 overflow-auto bg-night p-4 text-xs leading-relaxed text-paper/80">
              {complete ? JSON.stringify(complete.result ?? complete.error ?? complete, null, 2) : "—"}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}

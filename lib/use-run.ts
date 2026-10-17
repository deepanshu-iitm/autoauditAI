"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RunStatus = "idle" | "running" | "done" | "failed";

type StreamEvent = {
  type: string;
  run_id?: string;
  streaming_url?: string;
  purpose?: string;
  status?: string;
  result?: unknown;
  error?: { message?: string } | null;
  message?: string;
};

export function useRun(endpoint: string) {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("failed");
    setError("Cancelled.");
  }, []);

  const start = useCallback(
    async (body: Record<string, unknown>): Promise<{ runId: string | null; ok: boolean }> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("running");
      setRunId(null);
      setStreamingUrl(null);
      setProgress([]);
      setResult(null);
      setError(null);
      setElapsed(0);

      const startedAt = Date.now();
      const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
      let id: string | null = null;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const json = await response.json().catch(() => null);
          throw new Error(json?.error ?? `Request failed with ${response.status}`);
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
            if (!line.trim()) continue;

            const data = JSON.parse(line) as StreamEvent;
            if (data.run_id) {
              id = data.run_id;
              setRunId(data.run_id);
            }
            if (data.type === "STREAMING_URL" && data.streaming_url) setStreamingUrl(data.streaming_url);
            if (data.type === "PROGRESS" && data.purpose) {
              setProgress((lines) => [...lines, data.purpose as string]);
            }
            if (data.type === "COMPLETE") {
              finished = true;
              setResult(data.result ?? null);
              if (data.status !== "COMPLETED") {
                throw new Error(data.error?.message ?? `The run ended with status ${data.status}.`);
              }
              setStatus("done");
            }
            if (data.type === "ERROR") throw new Error(data.message ?? "The stream stopped.");
          }
        }

        if (!finished) throw new Error("The stream ended before the run finished.");
        return { runId: id, ok: true };
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Something went wrong.");
          setStatus("failed");
        }
        return { runId: id, ok: false };
      } finally {
        clearInterval(timer);
        setElapsed(Math.round((Date.now() - startedAt) / 1000));
      }
    },
    [endpoint],
  );

  return { status, runId, streamingUrl, progress, result, error, elapsed, start, cancel };
}

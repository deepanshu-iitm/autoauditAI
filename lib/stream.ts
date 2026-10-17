import { cancelRun, readEvents, startRunStream, TinyFishError, type RunRequest } from "./tinyfish";

export const RUN_LIMIT_SECONDS = 420;

export type RunOutcome = {
  runId: string;
  startedAt: Date;
  finishedAt: Date;
  status: string;
  result: unknown;
  error: unknown;
  streamingUrl: string | null;
  progress: string[];
};

export async function streamRun(
  request: Request,
  runRequest: RunRequest,
  onFinish: (outcome: RunOutcome) => Promise<unknown>,
) {
  const upstreamAbort = new AbortController();
  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await startRunStream(runRequest, upstreamAbort.signal);
  } catch (error) {
    const status = error instanceof TinyFishError ? error.status : 502;
    const message = error instanceof Error ? error.message : "Could not start the run.";
    return Response.json({ error: message }, { status });
  }

  const encoder = new TextEncoder();
  const startedAt = new Date();
  const progress: string[] = [];
  let streamingUrl: string | null = null;
  let runId: string | null = null;
  let finished = false;
  let timedOut = false;

  const stop = () => {
    if (finished) return;
    finished = true;
    if (runId) void cancelRun(runId);
    upstreamAbort.abort();
  };
  request.signal.addEventListener("abort", stop);
  const deadline = setTimeout(() => {
    timedOut = true;
    stop();
  }, RUN_LIMIT_SECONDS * 1000);

  const finish = (status: string, result: unknown, error: unknown) =>
    runId
      ? onFinish({
          runId,
          startedAt,
          finishedAt: new Date(),
          status,
          result,
          error,
          streamingUrl,
          progress,
        }).catch((saveError) => console.error("Could not save run", runId, saveError))
      : undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      try {
        for await (const event of readEvents(upstream)) {
          if (event.type === "HEARTBEAT") continue;
          if (event.type === "STARTED") runId = event.run_id;
          if (event.type === "STREAMING_URL") streamingUrl = event.streaming_url;
          if (event.type === "PROGRESS") progress.push(event.purpose);

          if (event.type === "COMPLETE") {
            finished = true;
            await finish(event.status, event.result ?? null, event.error ?? null);
          }

          send(event);
        }
      } catch (error) {
        if (timedOut) {
          await finish("TIMED_OUT", null, { message: `Stopped after ${RUN_LIMIT_SECONDS} seconds.` });
          send({ type: "ERROR", message: `The run was stopped after ${RUN_LIMIT_SECONDS / 60} minutes.` });
        } else {
          const message = error instanceof Error ? error.message : "Stream interrupted.";
          send({ type: "ERROR", message });
        }
      } finally {
        clearTimeout(deadline);
        request.signal.removeEventListener("abort", stop);
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

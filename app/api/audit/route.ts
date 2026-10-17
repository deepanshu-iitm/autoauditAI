import { checkoutGoal, observationSchema } from "@/lib/journey";
import { saveRun } from "@/lib/saved";
import { cancelRun, readEvents, startRunStream, TinyFishError, type RunRequest } from "@/lib/tinyfish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUN_LIMIT_SECONDS = 420;

type AuditBody = {
  url?: string;
  goal?: string;
  proxy?: "default" | "off";
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AuditBody;
  const url = body.url?.trim();
  const customGoal = body.goal?.trim();

  if (!url) {
    return Response.json({ error: "A product URL is required." }, { status: 400 });
  }

  const kind = customGoal ? "custom" : "checkout";
  const runRequest: RunRequest = customGoal
    ? { url, goal: customGoal }
    : {
        url,
        goal: checkoutGoal(),
        output_schema: observationSchema,
        browser_profile: "stealth",
        agent_config: { max_duration_seconds: RUN_LIMIT_SECONDS },
      };
  if (body.proxy === "off") runRequest.proxy_config = { enabled: false };

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

  const record = (status: string, result: unknown, error: unknown) => {
    if (!runId) return;
    const finishedAt = new Date();
    return saveRun({
      run_id: runId,
      kind,
      url,
      goal: runRequest.goal,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      elapsed_seconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
      status,
      streaming_url: streamingUrl,
      progress,
      result,
      error,
    }).catch((saveError) => console.error("Could not save run", runId, saveError));
  };

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
            await record(event.status, event.result ?? null, event.error ?? null);
          }

          send(event);
        }
      } catch (error) {
        if (timedOut) {
          await record("TIMED_OUT", null, { message: `Stopped after ${RUN_LIMIT_SECONDS} seconds.` });
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

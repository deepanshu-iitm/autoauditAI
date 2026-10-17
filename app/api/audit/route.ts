import { checkoutGoal, observationSchema } from "@/lib/journey";
import { saveRun } from "@/lib/saved";
import { RUN_LIMIT_SECONDS, streamRun } from "@/lib/stream";
import { getRun, type RunRequest } from "@/lib/tinyfish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditBody = {
  url?: string;
  goal?: string;
  proxy?: "default" | "off";
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AuditBody;
  const url = body.url?.trim();
  const customGoal = body.goal?.trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "A product page URL starting with https:// is required." }, { status: 400 });
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

  return streamRun(request, runRequest, async (outcome) => {
    const details = await getRun(outcome.runId).catch(() => null);
    await saveRun({
      run_id: outcome.runId,
      kind,
      url,
      goal: runRequest.goal,
      started_at: outcome.startedAt.toISOString(),
      finished_at: outcome.finishedAt.toISOString(),
      elapsed_seconds: Math.round((outcome.finishedAt.getTime() - outcome.startedAt.getTime()) / 1000),
      status: outcome.status,
      streaming_url: outcome.streamingUrl,
      progress: outcome.progress,
      result: outcome.result,
      error: outcome.error,
      num_of_steps: details?.num_of_steps ?? null,
      steps: details?.steps,
    });
  });
}

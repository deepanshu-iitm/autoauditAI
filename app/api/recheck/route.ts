import { recheckGoal, recheckSchema } from "@/lib/journey";
import { readRun, saveRun } from "@/lib/saved";
import { RUN_LIMIT_SECONDS, streamRun } from "@/lib/stream";
import type { Countdown } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { runId?: string };
  const original = body.runId ? await readRun(body.runId) : null;
  if (!original) return Response.json({ error: "Saved audit not found." }, { status: 404 });

  return streamRun(
    request,
    {
      url: original.url,
      goal: recheckGoal(),
      output_schema: recheckSchema,
      browser_profile: "stealth",
      agent_config: { max_duration_seconds: RUN_LIMIT_SECONDS },
    },
    async (outcome) => {
      const latest = (await readRun(original.run_id)) ?? original;
      const result = outcome.result as { countdowns?: Countdown[] } | null;
      await saveRun({
        ...latest,
        recheck: {
          run_id: outcome.runId,
          started_at: outcome.startedAt.toISOString(),
          finished_at: outcome.finishedAt.toISOString(),
          status: outcome.status,
          countdowns: result?.countdowns ?? [],
          error: outcome.error,
        },
      });
    },
  );
}

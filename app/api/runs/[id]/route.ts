import { isRunId } from "@/lib/saved";
import { getRun, TinyFishError } from "@/lib/tinyfish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isRunId(id)) return Response.json({ error: "Unknown run." }, { status: 400 });
  try {
    return Response.json(await getRun(id));
  } catch (error) {
    const status = error instanceof TinyFishError ? error.status : 502;
    return Response.json({ error: "Could not load the run." }, { status });
  }
}

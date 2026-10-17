import { readEvents, startRunStream, TinyFishError } from "@/lib/tinyfish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditBody = {
  url?: string;
  goal?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AuditBody;
  const url = body.url?.trim();
  const goal = body.goal?.trim();

  if (!url || !goal) {
    return Response.json({ error: "Both url and goal are required." }, { status: 400 });
  }

  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await startRunStream({ url, goal }, request.signal);
  } catch (error) {
    const status = error instanceof TinyFishError ? error.status : 502;
    const message = error instanceof Error ? error.message : "Could not start the run.";
    return Response.json({ error: message }, { status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of readEvents(upstream)) {
          if (event.type === "HEARTBEAT") continue;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream interrupted.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "ERROR", message })}\n\n`),
        );
      } finally {
        controller.close();
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

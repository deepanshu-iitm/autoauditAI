import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isRunId, screenshotPath } from "@/lib/saved";
import { getScreenshot } from "@/lib/tinyfish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const image = (bytes: Buffer) =>
  new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const { id, stepId } = await params;
  if (!isRunId(id) || !isRunId(stepId)) return new Response("Unknown step.", { status: 400 });

  const file = screenshotPath(id, stepId);
  const cached = await readFile(file).catch(() => null);
  if (cached) return image(cached);

  const bytes = await getScreenshot(id, stepId).catch(() => null);
  if (!bytes) return new Response("No screenshot for this step.", { status: 404 });

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes).catch(() => undefined);
  return image(bytes);
}

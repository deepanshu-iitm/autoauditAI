import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const SAVED_DIR = path.join(process.cwd(), "data", "saved");

export type SavedRun = {
  run_id: string;
  kind: "checkout" | "custom";
  url: string;
  goal: string;
  started_at: string;
  finished_at: string;
  elapsed_seconds: number;
  status: string;
  streaming_url: string | null;
  progress: string[];
  result: unknown;
  error: unknown;
};

export async function saveRun(run: SavedRun) {
  await mkdir(SAVED_DIR, { recursive: true });
  const file = path.join(SAVED_DIR, `${run.run_id}.json`);
  await writeFile(file, JSON.stringify(run, null, 2), "utf8");
  return file;
}

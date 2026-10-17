import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SavedRun } from "./types";

export const SAVED_DIR = path.join(process.cwd(), "data", "saved");
export const SCREENS_DIR = path.join(process.cwd(), "data", "screens");

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isRunId = (value: string) => ID.test(value);

export async function saveRun(run: SavedRun) {
  await mkdir(SAVED_DIR, { recursive: true });
  const file = path.join(SAVED_DIR, `${run.run_id}.json`);
  await writeFile(file, JSON.stringify(run, null, 2), "utf8");
  return file;
}

export async function readRun(runId: string): Promise<SavedRun | null> {
  if (!isRunId(runId)) return null;
  try {
    return JSON.parse(await readFile(path.join(SAVED_DIR, `${runId}.json`), "utf8")) as SavedRun;
  } catch {
    return null;
  }
}

export async function listRuns(): Promise<SavedRun[]> {
  const names = await readdir(SAVED_DIR).catch(() => [] as string[]);
  const runs = await Promise.all(
    names.filter((name) => name.endsWith(".json")).map((name) => readRun(name.replace(/\.json$/, ""))),
  );
  return runs
    .filter((run): run is SavedRun => run !== null)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export function screenshotPath(runId: string, stepId: string) {
  return path.join(SCREENS_DIR, runId, `${stepId}.jpg`);
}

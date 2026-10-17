import { buildAudit } from "./detectors";
import { listRuns, readRun, saveRun } from "./saved";
import { getRun } from "./tinyfish";
import type { Audit, SavedRun } from "./types";

async function withSteps(run: SavedRun) {
  if (run.steps && run.steps.length >= run.progress.length) return run;
  try {
    const details = await getRun(run.run_id);
    const updated = { ...run, steps: details.steps, num_of_steps: details.num_of_steps };
    await saveRun(updated);
    return updated;
  } catch {
    return run;
  }
}

export async function loadAudit(runId: string): Promise<Audit | null> {
  const run = await readRun(runId);
  if (!run || run.kind !== "checkout") return null;
  return buildAudit(await withSteps(run));
}

export async function loadAudits(): Promise<Audit[]> {
  const runs = (await listRuns()).filter((run) => run.kind === "checkout");
  return runs.map(buildAudit).filter((audit): audit is Audit => audit !== null);
}

export function latestPerStore(audits: Audit[]) {
  const seen = new Map<string, Audit>();
  for (const audit of audits) {
    const key = audit.observation.store_name.toLowerCase();
    if (!seen.has(key)) seen.set(key, audit);
  }
  return [...seen.values()];
}

export function rank(audits: Audit[]) {
  const weight = (audit: Audit) =>
    audit.gap.undisclosed * 1000 +
    audit.findings.filter((f) => f.severity === "medium").length * 100 +
    audit.findings.length;
  return [...audits].sort((a, b) => weight(b) - weight(a));
}

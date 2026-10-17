import type { Finding, RunStep, Stage } from "./types";

const STAGE_HINTS: Record<Stage, string> = {
  product: "product|pincode|variant|offer",
  cart: "cart|bag",
  checkout: "checkout|address|fill|phone|otp|email",
  payment: "payment|order summary|final",
};

export function stageOfAction(action: string): Stage | null {
  for (const stage of ["payment", "checkout", "cart", "product"] as Stage[]) {
    if (new RegExp(STAGE_HINTS[stage], "i").test(action)) return stage;
  }
  return null;
}

export function pickStep(steps: RunStep[], finding: Pick<Finding, "stage" | "hint">) {
  const usable = steps.slice(0, -1);
  const byHint = finding.hint
    ? usable.filter((step) => new RegExp(finding.hint as string, "i").test(step.action))
    : [];
  if (byHint.length) return byHint[0];
  const byStage = usable.filter((step) => new RegExp(STAGE_HINTS[finding.stage], "i").test(step.action));
  return byStage.at(-1) ?? null;
}

export const screenshotUrl = (runId: string, stepId: string) =>
  `/api/runs/${runId}/steps/${stepId}/screenshot`;

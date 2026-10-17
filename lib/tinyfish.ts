const AGENT_BASE = "https://agent.tinyfish.ai";

export type RunRequest = {
  url: string;
  goal: string;
  output_schema?: Record<string, unknown>;
  browser_profile?: "lite" | "stealth";
  proxy_config?: Record<string, unknown>;
  agent_config?: { max_duration_seconds?: number };
};

export type TinyFishEvent =
  | { type: "STARTED"; run_id: string; timestamp?: string }
  | { type: "STREAMING_URL"; run_id: string; streaming_url: string; timestamp?: string }
  | { type: "PROGRESS"; run_id: string; purpose: string; timestamp?: string }
  | { type: "HEARTBEAT"; timestamp?: string }
  | {
      type: "COMPLETE";
      run_id: string;
      status: string;
      result?: unknown;
      error?: { code?: string; message?: string; help_message?: string } | null;
      timestamp?: string;
    };

export class TinyFishError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) {
    throw new TinyFishError("TINYFISH_API_KEY is not set in .env.local", 500);
  }
  return key;
}

export async function startRunStream(body: RunRequest, signal?: AbortSignal) {
  const response = await fetch(`${AGENT_BASE}/v1/automation/run-sse`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new TinyFishError(text || `TinyFish returned ${response.status}`, response.status);
  }

  return response.body;
}

export type RunDetails = {
  num_of_steps: number | null;
  steps: { id: string; action: string; timestamp: string }[];
};

export async function getRun(runId: string): Promise<RunDetails> {
  const response = await fetch(`${AGENT_BASE}/v1/runs/${runId}`, {
    headers: { "X-API-Key": apiKey() },
    cache: "no-store",
  });
  if (!response.ok) throw new TinyFishError(`TinyFish returned ${response.status}`, response.status);
  const run = (await response.json()) as {
    num_of_steps?: number | null;
    steps?: { id: string; action?: string; timestamp?: string }[];
  };
  return {
    num_of_steps: run.num_of_steps ?? null,
    steps: (run.steps ?? []).map((step) => ({
      id: step.id,
      action: step.action ?? "",
      timestamp: step.timestamp ?? "",
    })),
  };
}

export async function getScreenshot(runId: string, stepId: string) {
  const response = await fetch(`${AGENT_BASE}/v1/runs/${runId}/steps/${stepId}/screenshot`, {
    headers: { "X-API-Key": apiKey() },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function cancelRun(runId: string) {
  await fetch(`${AGENT_BASE}/v1/runs/${runId}/cancel`, {
    method: "POST",
    headers: { "X-API-Key": apiKey() },
  }).catch(() => undefined);
}

export async function* readEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseChunk(chunk);
      if (event) yield event;
      boundary = buffer.indexOf("\n\n");
    }
  }

  const tail = parseChunk(buffer);
  if (tail) yield tail;
}

function parseChunk(chunk: string): TinyFishEvent | null {
  const data = chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    return JSON.parse(data) as TinyFishEvent;
  } catch {
    return null;
  }
}

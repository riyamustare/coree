import { randomUUID } from "node:crypto";

const baseUrl = process.env.MEMORY_SERVICE_URL;
const secret = process.env.MEMORY_SERVICE_SECRET;
if (!baseUrl || !secret) {
  throw new Error(
    "Set MEMORY_SERVICE_URL and MEMORY_SERVICE_SECRET before running this script.",
  );
}

interface Sample {
  userId: string;
  recallMs: number;
  rememberMs: number;
  isolated: boolean;
}

async function request(
  path: string,
  method: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-memory-service-secret": secret!,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      `${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  return payload;
}

const users = Array.from({ length: 40 }, () => randomUUID());
const samples: Sample[] = [];

try {
  await Promise.all(
    users.map(async (userId, index) => {
      const token = `private-person-${index}-${userId.slice(0, 8)}`;
      const rememberStart = performance.now();
      await request("/remember", "POST", {
        userId,
        sessionId: randomUUID(),
        episode: {
          id: randomUUID(),
          text: `Conversation ${token}`,
          occurredAt: new Date().toISOString(),
        },
        entities: [{ name: token, type: "person" }],
        facts: [
          {
            label: "Trusted friend",
            text: `${token} is a trusted friend`,
            category: "relationships",
            subject: token,
            entity: token,
            predicate: "relationship",
            confidence: 0.9,
          },
        ],
        procedures: [],
        goals: [],
      });
      const rememberMs = performance.now() - rememberStart;

      const recallStart = performance.now();
      const result = await request("/recall", "POST", {
        userId,
        message: `Tell me about ${token}`,
      });
      const recallMs = performance.now() - recallStart;
      const memories = Array.isArray(result.memories) ? result.memories : [];
      const texts = memories.flatMap((item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.text === "string"
          ? [item.text]
          : [],
      );
      const isolated =
        texts.some((text) => text.includes(token)) &&
        users.every(
          (other, otherIndex) =>
            otherIndex === index ||
            !texts.some((text) => text.includes(other.slice(0, 8))),
        );
      samples.push({ userId, recallMs, rememberMs, isolated });
    }),
  );

  const percentile = (values: number[], percentileValue: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.ceil(percentileValue * sorted.length) - 1] || 0;
  };
  const isolated = samples.filter((sample) => sample.isolated).length;
  console.table([
    {
      simulated_users: samples.length,
      isolated_users: `${isolated}/${samples.length}`,
      recall_p50_ms: percentile(
        samples.map((sample) => sample.recallMs),
        0.5,
      ).toFixed(1),
      recall_p95_ms: percentile(
        samples.map((sample) => sample.recallMs),
        0.95,
      ).toFixed(1),
      remember_p50_ms: percentile(
        samples.map((sample) => sample.rememberMs),
        0.5,
      ).toFixed(1),
      remember_p95_ms: percentile(
        samples.map((sample) => sample.rememberMs),
        0.95,
      ).toFixed(1),
    },
  ]);
  if (isolated !== samples.length) process.exitCode = 1;
} finally {
  await Promise.all(
    users.map(async (userId) => {
      await Promise.all([
        request(`/memories/${userId}`, "DELETE"),
        request(`/handoffs/${userId}`, "DELETE"),
      ]);
    }),
  );
}

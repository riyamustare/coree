import { timingSafeEqual } from "node:crypto";
import express from "express";
import { FalkorDB } from "falkordb";
import {
  graphName,
  isGoalStatus,
  MemoryGraph,
  type LegacyMemoryInput,
  type RememberInput,
} from "./memory.js";

const serviceSecret = process.env.MEMORY_SERVICE_SECRET;
const falkordbUrl = process.env.FALKORDB_URL;
if (!serviceSecret || !falkordbUrl) {
  throw new Error("MEMORY_SERVICE_SECRET and FALKORDB_URL must be configured");
}

const app = express();
app.use(express.json({ limit: "256kb" }));
const db = await FalkorDB.connect({ url: falkordbUrl });
const memory = new MemoryGraph((name) => db.selectGraph(name));

app.get("/health", (_req, res) => res.json({ ok: true }));

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isLegacyMemoryInput(value: unknown): value is LegacyMemoryInput {
  if (typeof value !== "object" || value === null) return false;
  const memory = value as Record<string, unknown>;
  return (
    isUuid(memory.id) &&
    typeof memory.content === "string" &&
    memory.content.trim().length > 0 &&
    memory.content.length <= 5000 &&
    typeof memory.createdAt === "string" &&
    Number.isFinite(Date.parse(memory.createdAt)) &&
    (memory.sourceSessionId === null ||
      isUuid(memory.sourceSessionId))
  );
}

app.use((req, res, next) => {
  const provided = Buffer.from(req.header("x-memory-service-secret") || "");
  const expected = Buffer.from(serviceSecret);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

app.post("/remember", async (req, res, next) => {
  try {
    const payload = req.body as RememberInput;
    if (!payload?.userId || !payload.sessionId || !payload.episode?.id) {
      res
        .status(400)
        .json({ error: "userId, sessionId and episode.id are required" });
      return;
    }
    res.json(await memory.remember(payload));
  } catch (error) {
    next(error);
  }
});

app.post("/import-legacy", async (req, res, next) => {
  try {
    const { userId, memories } = req.body as {
      userId?: unknown;
      memories?: unknown;
    };
    if (
      !isUuid(userId) ||
      !Array.isArray(memories) ||
      memories.length > 10 ||
      !memories.every(isLegacyMemoryInput)
    ) {
      res.status(400).json({
        error:
          "A userId and up to 10 valid legacy memory summaries are required",
      });
      return;
    }
    graphName(userId);
    const imported = await memory.importLegacyMemories(userId, memories);
    res.json({ imported });
  } catch (error) {
    next(error);
  }
});

app.post("/recall", async (req, res, next) => {
  try {
    const { userId, message } = req.body as {
      userId?: string;
      message?: string;
    };
    if (!userId || typeof message !== "string") {
      res.status(400).json({ error: "userId and message are required" });
      return;
    }
    res.json(await memory.recall(userId, message));
  } catch (error) {
    next(error);
  }
});

app.get("/memories/:userId", async (req, res, next) => {
  try {
    res.json(await memory.list(req.params.userId));
  } catch (error) {
    next(error);
  }
});

app.get("/graph/:userId", async (req, res, next) => {
  try {
    res.json(await memory.graphView(req.params.userId));
  } catch (error) {
    next(error);
  }
});

app.patch("/goals/:userId/:id", async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!isGoalStatus(status)) {
      res.status(400).json({ error: "A valid goal status is required" });
      return;
    }
    await memory.updateGoalStatus(req.params.userId, req.params.id, status);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/explain", async (req, res, next) => {
  try {
    const { userId, ids } = req.body as { userId?: string; ids?: string[] };
    if (!userId || !Array.isArray(ids)) {
      res.status(400).json({ error: "userId and ids are required" });
      return;
    }
    res.json({ items: await memory.explain(userId, ids) });
  } catch (error) {
    next(error);
  }
});

app.delete("/memories/:userId/:id", async (req, res, next) => {
  try {
    await memory.forget(req.params.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/memories/:userId", async (req, res, next) => {
  try {
    await memory.forgetAll(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get("/handoffs/:userId/pending", async (req, res, next) => {
  try {
    res.json({ handoff: await memory.pendingHandoff(req.params.userId) });
  } catch (error) {
    next(error);
  }
});

app.patch("/handoffs/:userId/:id/done", async (req, res, next) => {
  try {
    await memory.completeHandoff(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/handoffs/:userId", async (req, res, next) => {
  try {
    await memory.forgetHandoffs(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Memory service request failed:", error);
    res.status(500).json({ error: "Memory service request failed" });
  },
);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`Core memory service listening on ${port}`));

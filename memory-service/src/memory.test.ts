import assert from "node:assert/strict";
import test from "node:test";
import {
  graphName,
  isContradiction,
  MemoryGraph,
  normalizeName,
  type GraphClient,
  type RememberInput,
} from "./memory.js";

const userId = "9f1d1086-4b20-4d74-a55f-5b21ec45c103";

function input(overrides: Partial<RememberInput> = {}): RememberInput {
  return {
    userId,
    sessionId: "session-1",
    episode: {
      id: "episode-1",
      text: "A conversation",
      occurredAt: "2026-10-18T00:00:00Z",
    },
    entities: [
      { name: "Aisha", type: "person" },
      { name: "Pune", type: "place" },
    ],
    facts: [
      {
        ref: "F1",
        text: "Work has felt stressful lately",
        label: "Work stress",
        category: "work",
        subject: "you",
        predicate: "feeling",
        confidence: 0.9,
      },
      {
        ref: "F2",
        text: "Aisha is your close friend. You talk to her when work gets stressful.",
        label: "Aisha, close friend",
        category: "relationships",
        subject: "Aisha",
        predicate: "relationship",
        entity: "Aisha",
        confidence: 0.95,
      },
    ],
    procedures: [],
    goals: [
      {
        ref: "G1",
        text: "Sleep earlier",
        status: "in_progress",
        why: "You want to sleep earlier",
        category: "health",
      },
    ],
    relations: [
      {
        fromRef: "F2",
        toRef: "F1",
        reason: "You lean on Aisha when work is stressful",
        kind: "stated",
      },
    ],
    ...overrides,
  };
}

test("normalizes entity names and isolates graph names per user", () => {
  assert.equal(normalizeName("  Aisha   Khan "), "aisha khan");
  assert.notEqual(
    graphName(userId),
    graphName("9f1d1086-4b20-4d74-a55f-5b21ec45c104"),
  );
  assert.throws(() => graphName("not-a-user-id"), /valid Supabase user ID/);
});

test("shares per-user index setup across concurrent memory requests", async () => {
  const indexQueries: string[] = [];
  const client: GraphClient = {
    async query(query) {
      if (query.startsWith("CREATE INDEX")) indexQueries.push(query);
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { data: [] };
    },
  };
  const memory = new MemoryGraph(() => client);

  await Promise.all([
    memory.recall(userId, "hello"),
    memory.recall(userId, "checking in"),
    memory.recall(userId, "anything new?"),
  ]);

  assert.equal(indexQueries.length, 3);
  assert.equal(new Set(indexQueries).size, 3);
});

test("runs independent memory-list reads concurrently", async () => {
  let activeQueries = 0;
  let maximumActiveQueries = 0;
  const client: GraphClient = {
    async query() {
      activeQueries += 1;
      maximumActiveQueries = Math.max(maximumActiveQueries, activeQueries);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeQueries -= 1;
      return { data: [] };
    },
  };
  const memory = new MemoryGraph(() => client);

  await memory.list(userId);

  assert.ok(maximumActiveQueries > 1);
});

test("imports legacy summaries as idempotent, source-dated episodes per user", async () => {
  const graphNames: string[] = [];
  const queries: Array<{ query: string; params?: Record<string, unknown> }> =
    [];
  const client: GraphClient = {
    async query(query, options) {
      queries.push({ query, params: options?.params });
      return { data: [] };
    },
  };
  const memory = new MemoryGraph((name) => {
    graphNames.push(name);
    return client;
  });
  const legacyMemories = [
    {
      id: "memory-1",
      content: "You recently moved to Pune.",
      createdAt: "2026-10-10T12:00:00.000Z",
      sourceSessionId: "session-1",
    },
  ];

  assert.equal(
    await memory.importLegacyMemories(userId, legacyMemories),
    legacyMemories.length,
  );
  assert.equal(await memory.importLegacyMemories(userId, []), 0);

  const importQuery = queries.find(({ query }) => query.includes("UNWIND"));
  assert.ok(importQuery);
  assert.match(
    importQuery.query,
    /MERGE \(ep:Episode \{id: memory\.episodeId\}\)/,
  );
  assert.match(importQuery.query, /MERGE \(u\)-\[:HAS_EPISODE\]->\(ep\)/);
  assert.equal(new Set(graphNames).size, 1);
  assert.equal(graphNames[0], `user_${userId}`);
  assert.deepEqual(importQuery.params?.memories, [
    {
      ...legacyMemories[0],
      episodeId: "legacy:memory-1",
    },
  ]);
  assert.equal(importQuery.params?.userId, userId);
});

test("matches superseding facts by normalized subject and predicate", () => {
  const oldFact = {
    subject: "You",
    predicate: "residence",
    text: "You live in Pune",
    label: "Residence",
    category: "home" as const,
    confidence: 0.9,
  };
  assert.equal(
    isContradiction(oldFact, { ...oldFact, text: "You live in Bangalore" }),
    true,
  );
  assert.equal(
    isContradiction(oldFact, {
      ...oldFact,
      predicate: "occupation",
      text: "You work in Pune",
    }),
    false,
  );
  assert.equal(
    isContradiction(oldFact, {
      ...oldFact,
      subject: "Aisha",
      text: "Aisha lives in Bangalore",
    }),
    false,
  );
  assert.equal(
    isContradiction(
      {
        ...oldFact,
        subject: "user",
        predicate: "other",
        category: "home",
        text: "You live in Bangalore",
      },
      {
        ...oldFact,
        subject: "you",
        predicate: "residence",
        text: "You moved to Pune",
      },
    ),
    true,
  );
});

test("maps explicit memories to categories, direct user facts, person nodes and user goals", async () => {
  const queries: Array<{ query: string; params?: Record<string, unknown> }> =
    [];
  const client: GraphClient = {
    async query(query, options) {
      queries.push({ query, params: options?.params });
      return { data: [] };
    },
  };
  const graphNames: string[] = [];
  const memory = new MemoryGraph((name) => {
    graphNames.push(name);
    return client;
  });
  const result = await memory.remember(input());
  assert.ok(graphNames.includes(`user_${userId}`));
  assert.ok(graphNames.includes("agent_state"));
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("MERGE (u)-[:HAS_FACT]->(f)") &&
        params?.id === result.trace.find((item) => item.type === "fact")?.id,
    ),
  );
  assert.ok(
    queries.some(({ query }) => query.includes("MERGE (u)-[:HAS_GOAL]->(g)")),
  );
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("MERGE (f)-[:ABOUT]->(e)") &&
        params?.entityType === "person",
    ),
  );
  assert.equal(
    queries.some(({ params }) => params?.type === "topic"),
    false,
  );
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("RELATED_TO") &&
        params?.kind === "stated" &&
        params.reason === "You lean on Aisha when work is stressful",
    ),
  );
  assert.equal(
    result.trace.some((item) => item.type === "goal"),
    true,
  );
});

test("updates matching goals and stores no duplicate goal node", async () => {
  const goalParameters: Array<Record<string, unknown> | undefined> = [];
  const queries: string[] = [];
  const client: GraphClient = {
    async query(query, options) {
      queries.push(query);
      if (query.includes("MERGE (g:Goal")) {
        goalParameters.push(options?.params);
        return { data: [{ id: "existing-goal" }] };
      }
      return { data: [] };
    },
  };
  const memory = new MemoryGraph(() => client);
  await memory.remember(
    input({
      goals: [
        {
          ref: "G1",
          text: "I want to sleep earlier",
          status: "achieved",
          why: "I want to wake rested",
          category: "health",
        },
      ],
    }),
  );
  assert.equal(goalParameters[0]?.normalizedText, "i want to sleep earlier");
  assert.equal(goalParameters[0]?.status, "achieved");
  assert.equal(
    queries.some((query) => query.includes("CREATE (g:Goal")),
    false,
  );
  assert.ok(
    queries.some((query) => query.includes("MERGE (u)-[:HAS_GOAL]->(g)")),
  );
});

test("caps extracted relations at three and preserves stated or possible kinds", async () => {
  const relationParameters: Array<Record<string, unknown> | undefined> = [];
  const client: GraphClient = {
    async query(query, options) {
      if (query.includes("RELATED_TO"))
        relationParameters.push(options?.params);
      return { data: [] };
    },
  };
  const relations = Array.from({ length: 5 }, (_, index) => ({
    fromRef: "F1",
    toRef: "G1",
    reason: `Link ${index}`,
    kind: index === 0 ? ("stated" as const) : ("possible" as const),
  }));
  await new MemoryGraph(() => client).remember(input({ relations }));
  assert.equal(relationParameters.length, 3);
  assert.equal(relationParameters[0]?.kind, "stated");
  assert.equal(relationParameters[1]?.kind, "possible");
});

test("supersedes residence facts by user subject and predicate without deleting history", async () => {
  const queries: string[] = [];
  const client: GraphClient = {
    async query(query) {
      queries.push(query);
      return query.includes("RETURN old.id AS id, old.text AS text")
        ? { data: [{ id: "old-pune-fact", text: "You live in Pune" }] }
        : { data: [] };
    },
  };
  await new MemoryGraph(() => client).remember(
    input({
      sessionId: "session-2",
      episode: {
        id: "episode-2",
        text: "You moved to Bangalore",
        occurredAt: "2026-10-18T00:00:00Z",
      },
      entities: [{ name: "Bangalore", type: "place" }],
      facts: [
        {
          ref: "F1",
          text: "You live in Bangalore",
          label: "Residence",
          category: "home",
          subject: "you",
          predicate: "residence",
          entity: "Bangalore",
          confidence: 0.95,
        },
      ],
      goals: [],
      relations: [],
    }),
  );
  assert.ok(
    queries.some((query) => query.includes("SET old.valid_to = $validFrom")),
  );
  assert.ok(
    queries.some((query) =>
      query.includes("MERGE (newer)-[:SUPERSEDES]->(old)"),
    ),
  );
  assert.equal(
    queries.some((query) => query.includes("DELETE old")),
    false,
  );
});

test("updates a legacy home fact when a new residence is extracted as another predicate", async () => {
  const queries: Array<{
    query: string;
    params?: Record<string, unknown>;
  }> = [];
  const client: GraphClient = {
    async query(query, options) {
      queries.push({ query, params: options?.params });
      if (query.includes("RETURN old.id AS id, old.text AS text")) {
        return {
          data: [
            {
              id: "old-bangalore-fact",
              text: "You live in Bangalore",
              subject: "user",
              predicate: "other",
              category: "home",
            },
          ],
        };
      }
      return { data: [] };
    },
  };

  await new MemoryGraph(() => client).remember(
    input({
      sessionId: "session-pune",
      episode: {
        id: "episode-pune",
        text: "You moved from Bangalore to Pune",
        occurredAt: "2026-10-19T00:00:00Z",
      },
      entities: [{ name: "Pune", type: "place" }],
      facts: [
        {
          ref: "F1",
          text: "You moved from Bangalore to Pune",
          label: "Moving from your",
          category: "home",
          subject: "user",
          predicate: "other",
          entity: "Pune",
          confidence: 0.95,
        },
      ],
      goals: [],
      relations: [],
    }),
  );

  const residenceLookup = queries.find(({ query }) =>
    query.includes("RETURN old.id AS id, old.text AS text"),
  );
  assert.equal(residenceLookup?.params?.subject, "you");
  assert.equal(residenceLookup?.params?.predicate, "residence");
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("SET old.valid_to = $validFrom") &&
        params?.oldId === "old-bangalore-fact",
    ),
  );
  assert.ok(
    queries.some(
      ({ query }) => query.includes("MERGE (newer)-[:SUPERSEDES]->(old)"),
    ),
  );
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("CREATE (f:Fact") &&
        params?.predicate === "residence" &&
        params.subject === "you",
    ),
  );
});

test("supersedes a former residence when one fact states the current move", async () => {
  const queries: Array<{ query: string; params?: Record<string, unknown> }> = [];
  const client: GraphClient = {
    async query(query, options) {
      queries.push({ query, params: options?.params });
      if (query.includes("RETURN old.id AS id, old.text AS text")) {
        return {
          data: [
            {
              id: "old-bangalore-fact",
              text: "You live in Bangalore",
              subject: "you",
              predicate: "residence",
              category: "home",
            },
          ],
        };
      }
      return { data: [] };
    },
  };

  await new MemoryGraph(() => client).remember(
    input({
      sessionId: "session-current-move",
      episode: {
        id: "episode-current-move",
        text: "You used to live in Bangalore, and now you are living in Pune.",
        occurredAt: "2026-10-18T00:00:00Z",
      },
      entities: [{ name: "Pune", type: "place" }],
      facts: [
        {
          ref: "F1",
          text: "You now live in Pune.",
          label: "Moved to Pune",
          category: "home",
          subject: "you",
          predicate: "residence",
          entity: "Pune",
          confidence: 0.95,
        },
      ],
      goals: [],
      relations: [],
    }),
  );

  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("SET old.valid_to = $validFrom") &&
        params?.oldId === "old-bangalore-fact",
    ),
  );
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("CREATE (f:Fact") &&
        params?.text === "You now live in Pune." &&
        params?.entity === "Pune",
    ),
  );
  assert.ok(
    queries.some(({ query }) =>
      query.includes("MERGE (newer)-[:SUPERSEDES]->(old)"),
    ),
  );
});

test("maps the example conversation without topic entity nodes", async () => {
  const entityNames: string[] = [];
  const writes: Array<{ query: string; params?: Record<string, unknown> }> = [];
  let oldResidence: { id: string; text: string } | null = null;
  const client: GraphClient = {
    async query(query, options) {
      const params = options?.params;
      writes.push({ query, params });
      if (query.includes("RETURN old.id AS id, old.text AS text")) {
        return {
          data:
            params?.subject === "you" &&
            params.predicate === "residence" &&
            oldResidence
              ? [oldResidence]
              : [],
        };
      }
      if (
        query.includes("MERGE (e:Entity {normalized_name: $normalizedName})")
      ) {
        if (typeof params?.name === "string") entityNames.push(params.name);
      }
      if (
        query.includes("CREATE (f:Fact") &&
        params?.predicate === "residence"
      ) {
        oldResidence = {
          id: String(params.id),
          text: String(params.text),
        };
      }
      return { data: [] };
    },
  };
  const memory = new MemoryGraph(() => client);
  await memory.remember(
    input({
      entities: [
        { name: "Aisha", type: "person" },
        { name: "Pune", type: "place" },
      ],
      facts: [
        {
          ref: "F1",
          text: "Work has felt stressful lately",
          label: "Work stress",
          category: "work",
          subject: "you",
          predicate: "feeling",
          confidence: 0.9,
        },
        {
          ref: "F2",
          text: "Aisha is your close friend. You talk to her when work gets stressful.",
          label: "Aisha, your close friend",
          category: "relationships",
          subject: "Aisha",
          predicate: "relationship",
          entity: "Aisha",
          confidence: 0.95,
        },
        {
          ref: "F3",
          text: "You live in Pune",
          label: "Residence",
          category: "home",
          subject: "you",
          predicate: "residence",
          entity: "Pune",
          confidence: 0.95,
        },
      ],
      relations: [
        {
          fromRef: "F2",
          toRef: "F1",
          reason: "You lean on Aisha when work is stressful",
          kind: "stated",
        },
      ],
    }),
  );
  await memory.remember(
    input({
      sessionId: "session-2",
      episode: {
        id: "episode-2",
        text: "You moved to Bangalore",
        occurredAt: "2026-10-19T00:00:00Z",
      },
      entities: [{ name: "Bangalore", type: "place" }],
      facts: [
        {
          ref: "F1",
          text: "You live in Bangalore",
          label: "Residence",
          category: "home",
          subject: "you",
          predicate: "residence",
          entity: "Bangalore",
          confidence: 0.95,
        },
      ],
      goals: [],
      relations: [],
    }),
  );

  assert.deepEqual(entityNames.sort(), ["Aisha", "Bangalore", "Pune"]);
  assert.ok(
    writes.some(
      ({ query, params }) =>
        query.includes("MERGE (u)-[:HAS_GOAL]->(g)") &&
        params?.goalId !== undefined,
    ),
  );
  assert.ok(
    writes.some(
      ({ query, params }) =>
        query.includes("MERGE (f)-[:ABOUT]->(e)") && params?.entity === "Aisha",
    ),
  );
  assert.ok(
    writes.some(
      ({ query, params }) =>
        query.includes("MERGE (source)-[r:RELATED_TO") &&
        params?.kind === "stated",
    ),
  );
  assert.ok(
    writes.some(({ query }) => query.includes("SET old.valid_to = $validFrom")),
  );
  assert.ok(
    writes.some(({ query }) =>
      query.includes("MERGE (newer)-[:SUPERSEDES]->(old)"),
    ),
  );
});

test("returns one synthetic user node and only user-facing graph link types", async () => {
  const graph = new MemoryGraph(() => ({
    async query(query) {
      if (query.includes("source_id AS source_id")) {
        return { data: [] };
      }
      if (query.includes("RETURN coalesce(n.id")) {
        return {
          data: [
            {
              source_id: "fact-1",
              source_labels: ["Fact"],
              source_properties: {
                id: "fact-1",
                text: "You feel stressed",
                category: "work",
              },
              rel_type: "RELATED_TO",
              target_id: "goal-1",
              target_labels: ["Goal"],
              target_properties: {
                id: "goal-1",
                text: "Sleep earlier",
                status: "open",
              },
              rel_properties: {
                reason: "You see a connection",
                kind: "possible",
              },
            },
          ],
        };
      }
      return { data: [] };
    },
  }));
  const result = await graph.graphView(userId);
  assert.equal(result.nodes.filter((node) => node.type === "user").length, 1);
  assert.ok(
    result.nodes.some(
      (node) => node.type === "goal" && node.category === "other",
    ),
  );
  assert.deepEqual(result.links, [
    {
      source: "fact-1",
      target: "goal-1",
      type: "RELATED_TO",
      reason: "You see a connection",
      kind: "possible",
    },
    {
      source: `user:${userId}`,
      target: "goal-1",
      type: "HAS_GOAL",
    },
  ]);
});

test("keeps the synthetic user node inside the 150-node response cap", async () => {
  const graph = new MemoryGraph(() => ({
    async query() {
      return {
        data: Array.from({ length: 160 }, (_, index) => ({
          source_id: `fact-${index}`,
          source_labels: ["Fact"],
          source_properties: { id: `fact-${index}`, text: `Fact ${index}` },
          rel_type: null,
          target_id: null,
          target_labels: null,
          target_properties: null,
          rel_properties: null,
        })),
      };
    },
  }));
  const result = await graph.graphView(userId);
  assert.equal(result.nodes.length, 150);
  assert.equal(result.nodes[0]?.type, "user");
  assert.equal(result.nodes.filter((node) => node.type === "user").length, 1);
});

test("migrates legacy topic entities idempotently while retaining facts and history", async () => {
  let topicExists = true;
  let topicFactAttached = true;
  const queries: Array<{ query: string; params?: Record<string, unknown> }> =
    [];
  const client: GraphClient = {
    async query(query, options) {
      queries.push({ query, params: options?.params });
      if (query.includes("RETURN e.normalized_name AS normalized_name")) {
        return {
          data: topicExists
            ? [{ normalized_name: "work", name: "Work", type: "topic" }]
            : [],
        };
      }
      if (query.includes("RETURN f.id AS id")) {
        return {
          data: topicFactAttached ? [{ id: "legacy-fact" }] : [],
        };
      }
      if (query.includes("RETURN g.id AS id") && query.includes("RELATES_TO")) {
        return { data: topicExists ? [{ id: "legacy-goal" }] : [] };
      }
      if (query.includes("DETACH DELETE e")) topicExists = false;
      if (query.includes("DELETE r") && query.includes("ABOUT")) {
        topicFactAttached = false;
      }
      if (
        query.includes("RETURN g.id AS id") &&
        query.includes("MATCH (g:Goal)")
      ) {
        return { data: [{ id: "legacy-goal" }] };
      }
      return { data: [] };
    },
  };
  const memory = new MemoryGraph(() => client);

  const firstRun = await memory.migrateLegacyGraph(userId);
  const secondRun = await memory.migrateLegacyGraph(userId);

  assert.deepEqual(firstRun, { convertedEntities: 1, attachedGoals: 1 });
  assert.deepEqual(secondRun, { convertedEntities: 0, attachedGoals: 1 });
  assert.equal(
    queries.filter(({ query }) => query.includes("DETACH DELETE e")).length,
    1,
  );
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("MERGE (u)-[:HAS_FACT]->(f)") &&
        params?.id === "legacy-fact",
    ),
  );
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("MERGE (u)-[:HAS_GOAL]->(g)") &&
        params?.id === "legacy-goal",
    ),
  );
  assert.ok(
    queries.some(
      ({ query, params }) =>
        query.includes("SET f.category = coalesce") &&
        params?.category === "work" &&
        params.subject === "you",
    ),
  );
  assert.equal(
    queries.some(({ query }) =>
      /DELETE\s+(?:old|f:Fact|ep:Episode)/i.test(query),
    ),
    false,
  );
});

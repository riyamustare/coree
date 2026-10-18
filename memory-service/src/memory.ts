import { randomUUID } from "node:crypto";

export type EntityType = "person" | "place";
export type MemoryCategory =
  | "work"
  | "relationships"
  | "home"
  | "health"
  | "habits"
  | "preferences"
  | "other";
export type GoalStatus = "open" | "in_progress" | "achieved" | "dropped";
export type RelationKind = "stated" | "possible";

export interface EntityInput {
  name: string;
  type: EntityType;
}
export interface FactInput {
  ref?: string;
  text: string;
  label: string;
  category: MemoryCategory;
  subject: string;
  predicate: string;
  confidence: number;
  entity?: string;
  validFrom?: string;
}

export interface RememberInput {
  userId: string;
  sessionId: string;
  episode: { id: string; text: string; occurredAt: string };
  entities: EntityInput[];
  facts: FactInput[];
  procedures: Array<{ text: string; category: MemoryCategory }>;
  goals: Array<{
    ref?: string;
    text: string;
    status: GoalStatus;
    why: string;
    category: MemoryCategory;
    startedAt?: string;
    lastMentionedAt?: string;
  }>;
  relations: Array<{
    fromRef: string;
    toRef: string;
    reason: string;
    kind: RelationKind;
  }>;
}

export interface LegacyMemoryInput {
  id: string;
  content: string;
  createdAt: string;
  sourceSessionId: string | null;
}

export interface GraphClient {
  query(
    query: string,
    options?: { params?: Record<string, unknown> },
  ): Promise<{ data?: unknown[] }>;
}

export interface MemoryTraceItem {
  id: string;
  type: "fact" | "episode" | "procedure" | "goal";
  text: string;
}

export interface GraphNode {
  graphId: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function normalizeFactSubject(value: string): string {
  const subject = normalizeName(value);
  return subject === "user" || subject === "the user" ? "you" : subject;
}

function normalizeFactPredicate(
  predicate: string | undefined,
  category: string | undefined,
  text: string,
): string {
  const normalizedPredicate = normalizeName(predicate || "");
  if (["residence", "location", "home"].includes(normalizedPredicate)) {
    return "residence";
  }
  if (
    (category?.toLowerCase() === "home" ||
      normalizedPredicate === "" ||
      normalizedPredicate === "other") &&
    /\b(?:live[sd]?|living|resid(?:e|es|ing)|moved|moving|relocated|relocating)\b/i.test(
      text,
    )
  ) {
    return "residence";
  }
  return normalizedPredicate;
}

export function normalizeCategory(value: unknown): MemoryCategory {
  const category = typeof value === "string" ? value.toLowerCase() : "";
  return new Set([
    "work",
    "relationships",
    "home",
    "health",
    "habits",
    "preferences",
  ]).has(category)
    ? (category as MemoryCategory)
    : "other";
}

export function isGoalStatus(value: unknown): value is GoalStatus {
  return (
    value === "open" ||
    value === "in_progress" ||
    value === "achieved" ||
    value === "dropped"
  );
}

export function categoryFromTopic(value: unknown): MemoryCategory {
  if (typeof value !== "string") return "other";
  const normalized = normalizeName(value);
  if (/\b(work|job|career|office)\b/.test(normalized)) return "work";
  if (/\b(friend|family|relationship|partner)\b/.test(normalized))
    return "relationships";
  if (/\b(home|house|city|residence|move)\b/.test(normalized)) return "home";
  if (/\b(sleep|health|exercise|stress|emotion)\b/.test(normalized))
    return "health";
  if (/\b(habit|routine)\b/.test(normalized)) return "habits";
  if (/\b(preference|communication)\b/.test(normalized)) return "preferences";
  return "other";
}

export function graphName(userId: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    throw new Error("A valid Supabase user ID is required");
  }
  return `user_${userId.toLowerCase()}`;
}

export function isContradiction(
  existing: FactInput,
  incoming: FactInput,
): boolean {
  return (
    normalizeFactSubject(existing.subject) ===
      normalizeFactSubject(incoming.subject) &&
    normalizeFactPredicate(
      existing.predicate,
      existing.category,
      existing.text,
    ) ===
      normalizeFactPredicate(
        incoming.predicate,
        incoming.category,
        incoming.text,
      ) &&
    normalizeName(existing.text) !== normalizeName(incoming.text)
  );
}

export function extractRows<T extends Record<string, unknown>>(result: {
  data?: unknown[];
}): T[] {
  if (!Array.isArray(result.data)) return [];
  return result.data.filter(
    (row): row is T => typeof row === "object" && row !== null,
  );
}

export class MemoryGraph {
  private readonly indexSetup = new Map<string, Promise<void>>();
  private static readonly maxCachedGraphIndexes = 1024;

  constructor(private readonly graphFor: (name: string) => GraphClient) {}

  private async graph(userId: string): Promise<GraphClient> {
    const name = graphName(userId);
    const graph = this.graphFor(name);
    let setup = this.indexSetup.get(name);
    if (!setup) {
      setup = (async () => {
        for (const query of [
          "CREATE INDEX FOR (e:Entity) ON (e.name)",
          "CREATE INDEX FOR (e:Entity) ON (e.normalized_name)",
          "CREATE INDEX FOR (f:Fact) ON (f.valid_to)",
        ]) {
          try {
            await graph.query(query);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            if (!/already.*index|index.*already/i.test(message)) throw error;
          }
        }
      })();
      this.indexSetup.set(name, setup);
      while (this.indexSetup.size > MemoryGraph.maxCachedGraphIndexes) {
        const oldestName = this.indexSetup.keys().next().value;
        if (!oldestName) break;
        this.indexSetup.delete(oldestName);
      }
      setup.catch(() => {
        if (this.indexSetup.get(name) === setup) {
          this.indexSetup.delete(name);
        }
      });
    }
    await setup;
    return graph;
  }

  async remember(
    input: RememberInput,
  ): Promise<{ trace: MemoryTraceItem[]; handoffId: string }> {
    const graph = await this.graph(input.userId);
    const now = new Date().toISOString();
    const trace: MemoryTraceItem[] = [];
    await graph.query("MERGE (u:User {id: $userId}) SET u.updated_at = $now", {
      params: { userId: input.userId, now },
    });
    await graph.query(
      `MERGE (ep:Episode {id: $episodeId})
       SET ep.text = $text, ep.occurred_at = $occurredAt, ep.type = 'episodic'`,
      {
        params: {
          ...input.episode,
          episodeId: input.episode.id,
        },
      },
    );
    trace.push({
      id: input.episode.id,
      type: "episode",
      text: input.episode.text,
    });

    const entityNames = new Map<string, EntityType>();
    for (const entity of input.entities) {
      if (entity.type !== "person" && entity.type !== "place") continue;
      entityNames.set(normalizeName(entity.name), entity.type);
      await graph.query(
        `MERGE (e:Entity {normalized_name: $normalizedName})
         SET e.id = $normalizedName, e.name = $name, e.type = $type
         WITH e MATCH (ep:Episode {id: $episodeId})
         MERGE (ep)-[:MENTIONS]->(e)`,
        {
          params: {
            normalizedName: normalizeName(entity.name),
            ...entity,
            episodeId: input.episode.id,
          },
        },
      );
    }

    const factIds: string[] = [];
    const relationSources = new Map<string, { id: string; label: string }>();
    for (const fact of input.facts) {
      const validFrom = fact.validFrom || now;
      const subject = normalizeFactSubject(fact.subject || "you");
      const predicate = normalizeFactPredicate(
        fact.predicate,
        fact.category,
        fact.text,
      );
      const normalizedEntity = fact.entity ? normalizeName(fact.entity) : null;
      const activeFacts = extractRows<{ id: string; text: string }>(
        await graph.query(
          `MATCH (old:Fact)
           WHERE old.valid_to IS NULL
             AND toLower(coalesce(old.subject, 'you')) IN $subjects
             AND (toLower(coalesce(old.predicate, '')) = $predicate
               OR ($predicate = 'residence' AND (
                 toLower(coalesce(old.category, '')) = 'home'
                 OR old.predicate IS NULL
                 OR toLower(old.predicate) = 'other'
               )))
           RETURN old.id AS id, old.text AS text, old.subject AS subject,
             old.predicate AS predicate, old.category AS category`,
          {
            params: {
              subjects:
                subject === "you" ? ["you", "user", "the user"] : [subject],
              subject,
              predicate,
            },
          },
        ),
      ).filter(
        (active) => {
          const values = active as typeof active & {
            subject?: string;
            predicate?: string;
            category?: string;
          };
          return (
            typeof active.id === "string" &&
            typeof active.text === "string" &&
            normalizeFactSubject(values.subject || "you") === subject &&
            normalizeFactPredicate(
              values.predicate,
              values.category,
              active.text,
            ) === predicate
          );
        },
      );
      const unchanged = activeFacts.find(
        (active) =>
          !isContradiction(
            {
              ...fact,
              subject,
              predicate: fact.predicate,
              text: active.text,
              confidence: 1,
            },
            fact,
          ),
      );
      const id = unchanged?.id || randomUUID();
      const params = {
        ...fact,
        id,
        subject,
        predicate,
        category: normalizeCategory(fact.category),
        confidence: Math.min(1, Math.max(0, fact.confidence)),
        validFrom,
        episodeId: input.episode.id,
      };
      if (!unchanged) {
        await graph.query(
          `CREATE (f:Fact {
             id: $id, text: $text, label: $label, category: $category,
             subject: $subject, predicate: $predicate, confidence: $confidence,
             valid_from: $validFrom, valid_to: null, type: 'semantic'
           })`,
          { params },
        );
        for (const old of activeFacts) {
          await graph.query(
            `MATCH (old:Fact {id: $oldId})
             SET old.valid_to = $validFrom
             WITH old
             MATCH (newer:Fact {id: $newId})
             MERGE (newer)-[:SUPERSEDES]->(old)`,
            { params: { oldId: old.id, newId: id, validFrom } },
          );
        }
      } else {
        await graph.query(
          `MATCH (f:Fact {id: $id})
           SET f.confidence = $confidence, f.category = $category,
             f.label = $label`,
          { params },
        );
      }
      await graph.query(
        `MATCH (f:Fact {id: $id}), (ep:Episode {id: $episodeId})
         MERGE (f)-[:DERIVED_FROM]->(ep)`,
        { params: { id, episodeId: input.episode.id } },
      );
      if (normalizedEntity && entityNames.has(normalizedEntity)) {
        await graph.query(
          `MATCH (f:Fact {id: $id})
           MERGE (e:Entity {normalized_name: $normalizedEntity})
           ON CREATE SET e.name = $entity, e.type = $entityType
           MERGE (f)-[:ABOUT]->(e)`,
          {
            params: {
              id,
              normalizedEntity,
              entity: fact.entity,
              entityType: entityNames.get(normalizedEntity),
            },
          },
        );
      } else if (!normalizedEntity || subject === "you" || subject === "user") {
        await graph.query(
          `MATCH (u:User {id: $userId}), (f:Fact {id: $id})
           MERGE (u)-[:HAS_FACT]->(f)`,
          { params: { userId: input.userId, id } },
        );
      } else {
        const normalizedSubject = normalizeName(fact.subject);
        if (entityNames.has(normalizedSubject)) {
          await graph.query(
            `MATCH (f:Fact {id: $id})
             MATCH (e:Entity {normalized_name: $normalizedSubject})
             MERGE (f)-[:ABOUT]->(e)`,
            { params: { id, normalizedSubject } },
          );
        } else {
          await graph.query(
            `MATCH (u:User {id: $userId}), (f:Fact {id: $id})
             MERGE (u)-[:HAS_FACT]->(f)`,
            { params: { userId: input.userId, id } },
          );
        }
      }
      factIds.push(id);
      trace.push({ id, type: "fact", text: fact.text });
      relationSources.set(normalizeName(fact.ref || fact.label), {
        id,
        label: fact.label,
      });
      relationSources.set(normalizeName(fact.label), { id, label: fact.label });
      relationSources.set(normalizeName(fact.text), { id, label: fact.label });
    }

    for (const procedure of input.procedures) {
      const generatedId = randomUUID();
      const saved = extractRows<{ id: string }>(
        await graph.query(
          `MERGE (p:Procedure {normalized_text: $normalizedText})
         ON CREATE SET p.id = $generatedId, p.created_at = $now, p.type = 'procedural'
         SET p.text = $text, p.category = $category, p.updated_at = $now
         WITH p MATCH (ep:Episode {id: $episodeId})
         MERGE (p)-[:LEARNED_FROM]->(ep)
         RETURN p.id AS id`,
          {
            params: {
              generatedId,
              normalizedText: normalizeName(procedure.text),
              text: procedure.text,
              category: normalizeCategory(procedure.category),
              now,
              episodeId: input.episode.id,
            },
          },
        ),
      )[0];
      const id = saved?.id || generatedId;
      trace.push({ id, type: "procedure", text: procedure.text });
    }

    const goalIds: string[] = [];
    for (const goal of input.goals) {
      const generatedId = randomUUID();
      const saved = extractRows<{ id: string }>(
        await graph.query(
          `MERGE (g:Goal {normalized_text: $normalizedText})
           ON CREATE SET g.id = $generatedId, g.started_at = $startedAt
           SET g.text = $text, g.status = $status, g.why = $why,
             g.category = $category, g.last_mentioned_at = $lastMentionedAt,
             g.updated_at = $now
           RETURN g.id AS id`,
          {
            params: {
              generatedId,
              normalizedText: normalizeName(goal.text),
              text: goal.text,
              status: isGoalStatus(goal.status) ? goal.status : "open",
              why: goal.why,
              category: normalizeCategory(goal.category),
              startedAt: goal.startedAt || now,
              lastMentionedAt: goal.lastMentionedAt || now,
              now,
            },
          },
        ),
      )[0];
      const id = saved?.id || generatedId;
      goalIds.push(id);
      await graph.query(
        `MATCH (u:User {id: $userId}), (g:Goal {id: $goalId}),
              (ep:Episode {id: $episodeId})
         MERGE (u)-[:HAS_GOAL]->(g)
         MERGE (g)-[:DERIVED_FROM]->(ep)`,
        {
          params: {
            userId: input.userId,
            goalId: id,
            episodeId: input.episode.id,
          },
        },
      );
      trace.push({ id, type: "goal", text: goal.text });
      relationSources.set(normalizeName(goal.ref || goal.text), {
        id,
        label: goal.text,
      });
    }

    for (const relation of input.relations.slice(0, 3)) {
      const source = relationSources.get(normalizeName(relation.fromRef));
      const target = relationSources.get(normalizeName(relation.toRef));
      if (
        !source ||
        !target ||
        source.id === target.id ||
        !["stated", "possible"].includes(relation.kind)
      ) {
        continue;
      }
      await graph.query(
        `MATCH (source {id: $sourceId}), (target {id: $targetId})
         MERGE (source)-[r:RELATED_TO {reason: $reason, kind: $kind}]->(target)`,
        {
          params: {
            sourceId: source.id,
            targetId: target.id,
            reason: relation.reason,
            kind: relation.kind,
          },
        },
      );
    }

    const handoffId = randomUUID();
    const stateGraph = this.graphFor("agent_state");
    await stateGraph.query(
      `MERGE (h:Handoff {id: $id})
       SET h.from_agent = 'memory', h.to_agent = 'check-in', h.user_id = $userId,
           h.task = 'Follow up on a goal or important recent conversation',
           h.context_fact_ids = $contextIds, h.status = 'pending', h.created_at = $now`,
      {
        params: {
          id: handoffId,
          userId: input.userId,
          contextIds: [...factIds, ...goalIds],
          now,
        },
      },
    );
    return { trace, handoffId };
  }

  async importLegacyMemories(
    userId: string,
    memories: LegacyMemoryInput[],
  ): Promise<number> {
    if (memories.length === 0) return 0;
    const graph = await this.graph(userId);
    await graph.query(
      `UNWIND $memories AS memory
       MERGE (u:User {id: $userId})
       MERGE (ep:Episode {id: memory.episodeId})
       SET ep.text = memory.content, ep.occurred_at = memory.createdAt,
         ep.type = 'episodic', ep.source = 'legacy_postgres',
         ep.legacy_memory_id = memory.id,
         ep.source_session_id = memory.sourceSessionId
       MERGE (u)-[:HAS_EPISODE]->(ep)`,
      {
        params: {
          userId,
          memories: memories.map((memory) => ({
            ...memory,
            episodeId: `legacy:${memory.id}`,
          })),
        },
      },
    );
    return memories.length;
  }

  async updateGoalStatus(
    userId: string,
    id: string,
    status: GoalStatus,
  ): Promise<void> {
    if (!isGoalStatus(status)) throw new Error("Invalid goal status");
    const graph = await this.graph(userId);
    await graph.query(
      `MATCH (g:Goal {id: $id})
       SET g.status = $status, g.last_mentioned_at = $now, g.updated_at = $now`,
      { params: { id, status, now: new Date().toISOString() } },
    );
  }

  async migrateLegacyGraph(
    userId: string,
  ): Promise<{ convertedEntities: number; attachedGoals: number }> {
    const graph = await this.graph(userId);
    const now = new Date().toISOString();
    await graph.query(
      "MERGE (u:User {id: $userId}) SET u.updated_at = coalesce(u.updated_at, $now)",
      { params: { userId, now } },
    );
    const entities = extractRows<{
      normalized_name: string;
      name: string;
      type: string;
    }>(
      await graph.query(
        `MATCH (e:Entity)
         RETURN e.normalized_name AS normalized_name, e.name AS name, e.type AS type`,
      ),
    ).filter(
      (entity) =>
        typeof entity.normalized_name === "string" &&
        typeof entity.name === "string",
    );
    let convertedEntities = 0;
    for (const entity of entities) {
      const isPersonalPlaceholder = ["you", "user"].includes(
        normalizeName(entity.name),
      );
      if (
        (entity.type === "person" || entity.type === "place") &&
        !isPersonalPlaceholder
      ) {
        await graph.query(
          `MATCH (e:Entity {normalized_name: $normalizedName})
           SET e.id = coalesce(e.id, e.normalized_name)`,
          { params: { normalizedName: entity.normalized_name } },
        );
        continue;
      }
      const category = categoryFromTopic(entity.name);
      const facts = extractRows<{ id: string }>(
        await graph.query(
          `MATCH (f:Fact)-[:ABOUT]->(e:Entity {normalized_name: $normalizedName})
           RETURN f.id AS id`,
          { params: { normalizedName: entity.normalized_name } },
        ),
      );
      for (const fact of facts) {
        if (typeof fact.id !== "string") continue;
        await graph.query(
          `MATCH (f:Fact {id: $id}), (e:Entity {normalized_name: $normalizedName})
           SET f.category = coalesce(f.category, $category),
               f.subject = coalesce(f.subject, $subject),
               f.label = coalesce(f.label, substring(f.text, 0, 24))
           WITH f, e
           MATCH (f)-[r:ABOUT]->(e)
           DELETE r`,
          {
            params: {
              id: fact.id,
              normalizedName: entity.normalized_name,
              category,
              subject: "you",
            },
          },
        );
        await graph.query(
          `MATCH (u:User {id: $userId}), (f:Fact {id: $id})
           MERGE (u)-[:HAS_FACT]->(f)`,
          { params: { userId, id: fact.id } },
        );
      }
      const goals = extractRows<{ id: string }>(
        await graph.query(
          `MATCH (g:Goal)-[:RELATES_TO]->(e:Entity {normalized_name: $normalizedName})
           RETURN g.id AS id`,
          { params: { normalizedName: entity.normalized_name } },
        ),
      );
      for (const goal of goals) {
        if (typeof goal.id !== "string") continue;
        await graph.query(
          `MATCH (g:Goal {id: $id})
           SET g.category = coalesce(g.category, $category),
               g.why = coalesce(g.why, ''),
               g.started_at = coalesce(g.started_at, g.created_at, $now),
               g.last_mentioned_at = coalesce(g.last_mentioned_at, g.updated_at, $now),
               g.status = CASE WHEN g.status IN ['done', 'complete', 'completed'] THEN 'achieved'
                 WHEN g.status IN ['active', 'in progress'] THEN 'in_progress'
                 WHEN g.status IN ['open', 'in_progress', 'achieved', 'dropped'] THEN g.status
                 ELSE 'open' END`,
          { params: { id: goal.id, category, now } },
        );
        await graph.query(
          `MATCH (u:User {id: $userId}), (g:Goal {id: $id})
           MERGE (u)-[:HAS_GOAL]->(g)`,
          { params: { userId, id: goal.id } },
        );
        await graph.query(
          `MATCH (g:Goal {id: $id})-[r:RELATES_TO]->(:Entity)
           DELETE r`,
          { params: { id: goal.id } },
        );
      }
      await graph.query(
        `MATCH (e:Entity {normalized_name: $normalizedName})
         DETACH DELETE e`,
        { params: { normalizedName: entity.normalized_name } },
      );
      convertedEntities += 1;
    }
    const factDefaults = extractRows<{
      id: string;
      entity_name?: string;
      entity_type?: string;
    }>(
      await graph.query(
        `MATCH (f:Fact)
         OPTIONAL MATCH (f)-[:ABOUT]->(e:Entity)
         RETURN f.id AS id, e.name AS entity_name, e.type AS entity_type`,
      ),
    );
    for (const fact of factDefaults) {
      if (typeof fact.id !== "string") continue;
      const subject =
        fact.entity_type === "person" && typeof fact.entity_name === "string"
          ? fact.entity_name
          : "you";
      const category =
        fact.entity_type === "person"
          ? "relationships"
          : fact.entity_type === "place"
            ? "home"
            : "other";
      await graph.query(
        `MATCH (f:Fact {id: $id})
         SET f.category = coalesce(f.category, $category),
             f.subject = coalesce(f.subject, $subject),
             f.label = coalesce(f.label, substring(f.text, 0, 24)),
             f.confidence = coalesce(f.confidence, 0.7),
             f.valid_from = coalesce(f.valid_from, f.created_at, $now)`,
        { params: { id: fact.id, category, subject, now } },
      );
    }
    await graph.query(
      `MATCH (p:Procedure)
       SET p.category = coalesce(p.category, 'other')`,
    );
    const allGoals = extractRows<{ id: string }>(
      await graph.query("MATCH (g:Goal) RETURN g.id AS id"),
    );
    for (const goal of allGoals) {
      if (typeof goal.id !== "string") continue;
      await graph.query(
        `MATCH (u:User {id: $userId}), (g:Goal {id: $id})
         SET g.status = CASE WHEN g.status IN ['done', 'complete', 'completed'] THEN 'achieved'
           WHEN g.status IN ['active', 'in progress'] THEN 'in_progress'
           WHEN g.status IN ['open', 'in_progress', 'achieved', 'dropped'] THEN g.status
           ELSE 'open' END,
           g.why = coalesce(g.why, ''),
           g.category = coalesce(g.category, 'other'),
           g.started_at = coalesce(g.started_at, g.created_at, $now),
           g.last_mentioned_at = coalesce(g.last_mentioned_at, g.updated_at, $now)
         MERGE (u)-[:HAS_GOAL]->(g)`,
        { params: { userId, id: goal.id, now } },
      );
    }
    return { convertedEntities, attachedGoals: allGoals.length };
  }

  async graphView(userId: string): Promise<{
    nodes: Array<{
      id: string;
      type:
        "user" | "person" | "place" | "fact" | "goal" | "procedure" | "episode";
      label: string;
      text?: string;
      category: MemoryCategory;
      properties: Record<string, unknown>;
    }>;
    links: Array<{
      source: string;
      target: string;
      type:
        | "HAS_GOAL"
        | "HAS_FACT"
        | "ABOUT"
        | "HAS_EPISODE"
        | "DERIVED_FROM"
        | "SUPERSEDES"
        | "RELATED_TO";
      reason?: string;
      kind?: RelationKind;
    }>;
  }> {
    const graph = await this.graph(userId);
    const rows = extractRows<Record<string, unknown>>(
      await graph.query(
        `MATCH (n)
         OPTIONAL MATCH (n)-[r]->(m)
         RETURN coalesce(n.id, n.normalized_name, toString(id(n))) AS source_id,
           labels(n) AS source_labels,
           properties(n) AS source_properties, type(r) AS rel_type,
           coalesce(m.id, m.normalized_name, toString(id(m))) AS target_id,
           labels(m) AS target_labels,
           properties(m) AS target_properties, properties(r) AS rel_properties
         LIMIT 500`,
      ),
    );
    const nodes = new Map<
      string,
      {
        id: string;
        type:
          | "user"
          | "person"
          | "place"
          | "fact"
          | "goal"
          | "procedure"
          | "episode";
        label: string;
        text?: string;
        category: MemoryCategory;
        properties: Record<string, unknown>;
      }
    >();
    const links = new Map<
      string,
      {
        source: string;
        target: string;
        type:
          | "HAS_GOAL"
          | "HAS_FACT"
          | "ABOUT"
          | "HAS_EPISODE"
          | "DERIVED_FROM"
          | "SUPERSEDES"
          | "RELATED_TO";
        reason?: string;
        kind?: RelationKind;
      }
    >();
    const userNodeId = `user:${userId}`;
    const legacyCategories = new Map<string, MemoryCategory>();
    for (const row of rows) {
      if (
        row.rel_type === "ABOUT" &&
        Array.isArray(row.source_labels) &&
        row.source_labels.includes("Fact") &&
        Array.isArray(row.target_labels) &&
        row.target_labels.includes("Entity") &&
        typeof row.source_id === "string"
      ) {
        const target =
          typeof row.target_properties === "object" &&
          row.target_properties !== null
            ? (row.target_properties as Record<string, unknown>)
            : {};
        if (target.type !== "person" && target.type !== "place") {
          legacyCategories.set(row.source_id, categoryFromTopic(target.name));
        }
      }
    }
    const addNode = (
      idValue: unknown,
      labelsValue: unknown,
      propsValue: unknown,
    ) => {
      if (typeof idValue !== "string") return;
      const labels = Array.isArray(labelsValue)
        ? (labelsValue as string[])
        : [];
      const props =
        typeof propsValue === "object" && propsValue !== null
          ? (propsValue as Record<string, unknown>)
          : {};
      const label = labels[0] || "";
      if (label === "User") {
        nodes.set(userNodeId, {
          id: userNodeId,
          type: "user",
          label: "You",
          category: "other",
          properties: {},
        });
        return;
      }
      if (label === "Entity") {
        const entityType = props.type;
        if (entityType !== "person" && entityType !== "place") return;
        nodes.set(idValue, {
          id: idValue,
          type: entityType,
          label: typeof props.name === "string" ? props.name : entityType,
          category: "other",
          properties: props,
        });
        return;
      }
      if (!["Fact", "Goal", "Procedure", "Episode"].includes(label)) return;
      const type = label.toLowerCase() as
        "fact" | "goal" | "procedure" | "episode";
      const text = typeof props.text === "string" ? props.text : undefined;
      const category = props.category
        ? normalizeCategory(props.category)
        : legacyCategories.get(idValue) || "other";
      if (type === "goal" && !isGoalStatus(props.status)) {
        props.status = props.status === "done" ? "achieved" : "open";
      }
      nodes.set(idValue, {
        id: idValue,
        type,
        label: typeof props.label === "string" ? props.label : text || label,
        ...(text ? { text } : {}),
        category,
        properties: { ...props, category },
      });
    };
    for (const row of rows) {
      addNode(row.source_id, row.source_labels, row.source_properties);
      addNode(row.target_id, row.target_labels, row.target_properties);
    }
    const allowed = new Set([
      "HAS_GOAL",
      "HAS_FACT",
      "HAS_EPISODE",
      "ABOUT",
      "DERIVED_FROM",
      "LEARNED_FROM",
      "CONTAINS",
      "SUPERSEDES",
      "RELATED_TO",
    ]);
    for (const row of rows) {
      let relType = row.rel_type;
      const sourceId = row.source_id;
      const targetId = row.target_id;
      if (typeof relType !== "string" || !allowed.has(relType)) continue;
      const sourceLabels = Array.isArray(row.source_labels)
        ? row.source_labels
        : [];
      const targetLabels = Array.isArray(row.target_labels)
        ? row.target_labels
        : [];
      const sourceProps =
        typeof row.source_properties === "object" &&
        row.source_properties !== null
          ? (row.source_properties as Record<string, unknown>)
          : {};
      const targetProps =
        typeof row.target_properties === "object" &&
        row.target_properties !== null
          ? (row.target_properties as Record<string, unknown>)
          : {};
      let source = typeof sourceId === "string" ? sourceId : "";
      let target = typeof targetId === "string" ? targetId : "";
      if (sourceLabels[0] === "User") source = userNodeId;
      if (targetLabels[0] === "User") target = userNodeId;
      if (
        sourceLabels[0] === "Entity" &&
        sourceProps.type !== "person" &&
        sourceProps.type !== "place"
      ) {
        source = userNodeId;
        if (relType === "ABOUT") continue;
      }
      if (
        targetLabels[0] === "Entity" &&
        targetProps.type !== "person" &&
        targetProps.type !== "place"
      ) {
        if (relType === "ABOUT" && sourceLabels[0] === "Fact") {
          source = userNodeId;
          target = typeof sourceId === "string" ? sourceId : "";
          relType = "HAS_FACT";
        } else {
          target = userNodeId;
        }
      }
      if (relType === "LEARNED_FROM") relType = "DERIVED_FROM";
      if (
        relType === "CONTAINS" &&
        (sourceLabels[0] === "Session" || targetLabels[0] === "Session")
      ) {
        continue;
      }
      if (!source || !target) continue;
      const mappedType = relType as
        | "HAS_GOAL"
        | "HAS_FACT"
        | "HAS_EPISODE"
        | "ABOUT"
        | "DERIVED_FROM"
        | "SUPERSEDES"
        | "RELATED_TO";
      const relProps =
        typeof row.rel_properties === "object" && row.rel_properties !== null
          ? (row.rel_properties as Record<string, unknown>)
          : {};
      const key = `${source}:${mappedType}:${target}:${String(relProps.reason || "")}`;
      links.set(key, {
        source,
        target,
        type: mappedType,
        ...(typeof relProps.reason === "string"
          ? { reason: relProps.reason }
          : {}),
        ...(relProps.kind === "stated" || relProps.kind === "possible"
          ? { kind: relProps.kind }
          : {}),
      });
    }
    for (const [id, node] of nodes) {
      if (node.type !== "goal" || !node.properties.id) continue;
      const key = `${userNodeId}:HAS_GOAL:${id}:`;
      links.set(key, { source: userNodeId, target: id, type: "HAS_GOAL" });
    }
    if (!nodes.has(userNodeId)) {
      nodes.set(userNodeId, {
        id: userNodeId,
        type: "user",
        label: "You",
        category: "other",
        properties: {},
      });
    }
    const limitedNodes = [
      nodes.get(userNodeId)!,
      ...[...nodes.values()]
        .filter((node) => node.id !== userNodeId)
        .slice(0, 149),
    ];
    const limitedIds = new Set(limitedNodes.map((node) => node.id));
    return {
      nodes: limitedNodes,
      links: [...links.values()].filter(
        (link) => limitedIds.has(link.source) && limitedIds.has(link.target),
      ),
    };
  }

  async recall(
    userId: string,
    message: string,
  ): Promise<{ memories: MemoryTraceItem[]; trace: string[] }> {
    const graph = await this.graph(userId);
    const messageLower = message.toLocaleLowerCase("en-US");
    const [entityResult, procedureResult, goalResult, episodeResult] =
      await Promise.all([
        graph.query(
          `MATCH (e:Entity)
       WHERE size(e.normalized_name) > 1 AND $messageLower CONTAINS e.normalized_name
       MATCH (f:Fact)-[:ABOUT]->(e)
       WHERE f.valid_to IS NULL
       RETURN DISTINCT f.id AS id, f.text AS text
       ORDER BY f.valid_from DESC LIMIT 8`,
          { params: { messageLower } },
        ),
        graph.query(
          `MATCH (p:Procedure) RETURN p.id AS id, p.text AS text
       ORDER BY p.created_at DESC LIMIT 5`,
        ),
        graph.query(
          `MATCH (g:Goal) WHERE g.status = 'open' OR g.status = 'active'
       RETURN g.id AS id, g.text AS text ORDER BY g.created_at DESC LIMIT 5`,
        ),
        graph.query(
          `MATCH (ep:Episode) RETURN ep.id AS id, ep.text AS text
       ORDER BY ep.occurred_at DESC LIMIT 3`,
        ),
      ]);
    const entityRows = extractRows<{ id: string; text: string }>(entityResult);
    const fallbackFacts = entityRows.length
      ? []
      : extractRows<{ id: string; text: string }>(
          await graph.query(
            `MATCH (f:Fact) WHERE f.valid_to IS NULL
       RETURN f.id AS id, f.text AS text ORDER BY f.valid_from DESC LIMIT 3`,
          ),
        );
    const procedureRows = extractRows<{ id: string; text: string }>(
      procedureResult,
    );
    const goalRows = extractRows<{ id: string; text: string }>(goalResult);
    const episodeRows = extractRows<{ id: string; text: string }>(
      episodeResult,
    );
    const memories: MemoryTraceItem[] = [
      ...entityRows.map((row) => ({ ...row, type: "fact" as const })),
      ...fallbackFacts.map((row) => ({ ...row, type: "fact" as const })),
      ...procedureRows.map((row) => ({ ...row, type: "procedure" as const })),
      ...goalRows.map((row) => ({ ...row, type: "goal" as const })),
      ...episodeRows.map((row) => ({ ...row, type: "episode" as const })),
    ];
    return { memories, trace: memories.map((memory) => memory.id) };
  }

  async list(userId: string): Promise<{
    facts: unknown[];
    procedures: unknown[];
    goals: unknown[];
    nodes: GraphNode[];
    edges: GraphEdge[];
  }> {
    const graph = await this.graph(userId);
    const [graphResult, handoffResult, facts, procedures, goals] =
      await Promise.all([
        graph.query(
          `MATCH (n)
         OPTIONAL MATCH (n)-[r]->(m)
         RETURN id(n) AS source_graph_id, labels(n) AS source_labels,
           properties(n) AS source_properties, type(r) AS relationship_type,
           id(m) AS target_graph_id, labels(m) AS target_labels,
           properties(m) AS target_properties, properties(r) AS relationship_properties`,
        ),
        this.graphFor("agent_state").query(
          `MATCH (h:Handoff {user_id: $userId})
         RETURN h.id AS id, properties(h) AS properties`,
          { params: { userId } },
        ),
        graph.query(
          `MATCH (f:Fact)-[:DERIVED_FROM]->(ep:Episode)
       OPTIONAL MATCH (f)-[:ABOUT]->(e:Entity)
       WITH f, e, ep ORDER BY ep.occurred_at DESC
       WITH f, e, collect(ep)[0] AS ep
       RETURN f.id AS id, f.text AS text, f.label AS label, f.subject AS subject,
         f.predicate AS predicate, f.category AS category,
         f.confidence AS confidence, f.valid_from AS valid_from,
         f.valid_to AS valid_to, e.name AS entity, ep.id AS episode_id,
         ep.text AS episode_text, ep.occurred_at AS episode_date ORDER BY f.valid_from DESC`,
        ),
        graph.query(
          `MATCH (p:Procedure)-[:LEARNED_FROM]->(ep:Episode)
       WITH p, ep ORDER BY ep.occurred_at DESC
       WITH p, collect(ep)[0] AS ep
       RETURN p.id AS id, p.text AS text, p.category AS category,
         ep.id AS episode_id, ep.text AS episode_text,
         ep.occurred_at AS episode_date ORDER BY p.created_at DESC`,
        ),
        graph.query(
          `MATCH (g:Goal)
       OPTIONAL MATCH (g)-[:DERIVED_FROM|LEARNED_FROM]->(ep:Episode)
       WITH g, ep ORDER BY ep.occurred_at DESC
       WITH g, collect(ep)[0] AS ep
       RETURN g.id AS id, g.text AS text, g.status AS status, g.why AS why,
         g.category AS category, g.started_at AS started_at,
         g.last_mentioned_at AS last_mentioned_at,
         ep.id AS episode_id, ep.text AS episode_text,
         ep.occurred_at AS episode_date ORDER BY g.created_at DESC`,
        ),
      ]);
    const graphRows = extractRows<Record<string, unknown>>(graphResult);
    const nodesById = new Map<string, GraphNode>();
    const edgesByKey = new Map<string, GraphEdge>();
    const addNode = (
      graphId: unknown,
      labels: unknown,
      properties: unknown,
    ) => {
      if (graphId === null || graphId === undefined) return;
      const key = String(graphId);
      if (nodesById.has(key)) return;
      nodesById.set(key, {
        graphId: key,
        labels: Array.isArray(labels)
          ? labels.filter((label): label is string => typeof label === "string")
          : [],
        properties:
          typeof properties === "object" && properties !== null
            ? (properties as Record<string, unknown>)
            : {},
      });
    };
    for (const row of graphRows) {
      addNode(row.source_graph_id, row.source_labels, row.source_properties);
      addNode(row.target_graph_id, row.target_labels, row.target_properties);
      if (row.source_graph_id == null || row.target_graph_id == null) continue;
      const type =
        typeof row.relationship_type === "string" ? row.relationship_type : "";
      if (!type) continue;
      const source = String(row.source_graph_id);
      const target = String(row.target_graph_id);
      const properties =
        typeof row.relationship_properties === "object" &&
        row.relationship_properties !== null
          ? (row.relationship_properties as Record<string, unknown>)
          : {};
      const key = `${source}:${type}:${target}:${JSON.stringify(properties)}`;
      edgesByKey.set(key, { source, target, type, properties });
    }
    const handoffRows = extractRows<Record<string, unknown>>(handoffResult);
    const handoffs: GraphNode[] = handoffRows.flatMap((row) => {
      if (typeof row.id !== "string") return [];
      const properties =
        typeof row.properties === "object" && row.properties !== null
          ? (row.properties as Record<string, unknown>)
          : {};
      return [
        {
          graphId: `handoff:${row.id}`,
          labels: ["Handoff"],
          properties,
        },
      ];
    });
    return {
      facts: extractRows(facts),
      procedures: extractRows(procedures),
      goals: extractRows(goals),
      nodes: [...nodesById.values(), ...handoffs],
      edges: [...edgesByKey.values()],
    };
  }

  async explain(userId: string, ids: string[]): Promise<unknown[]> {
    const graph = await this.graph(userId);
    const result = await graph.query(
      `MATCH (n) WHERE n.id IN $ids
       OPTIONAL MATCH (n)-[:DERIVED_FROM|LEARNED_FROM]->(ep:Episode)
       OPTIONAL MATCH (n)-[:SUPERSEDES]->(old:Fact)
       OPTIONAL MATCH (n)<-[:SUPERSEDES]-(newer:Fact)
       RETURN n.id AS id, labels(n) AS labels, n.text AS text,
         ep.id AS episode_id, coalesce(ep.text, n.text) AS episode_text,
         coalesce(ep.occurred_at, n.occurred_at) AS episode_date,
         old.id AS superseded_id, old.text AS superseded_text,
         newer.id AS superseded_by_id, newer.text AS superseded_by_text`,
      { params: { ids } },
    );
    const grouped = new Map<
      string,
      {
        id: string;
        labels?: unknown;
        text?: unknown;
        episodes: Array<{ id: string; text: string; date: string | null }>;
        supersededFacts: Array<{ id: string; text: string }>;
        supersededBy: Array<{ id: string; text: string }>;
      }
    >();
    for (const row of extractRows<Record<string, unknown>>(result)) {
      if (typeof row.id !== "string") continue;
      const item = grouped.get(row.id) || {
        id: row.id,
        labels: row.labels,
        text: row.text,
        episodes: [],
        supersededFacts: [],
        supersededBy: [],
      };
      if (
        typeof row.episode_id === "string" &&
        typeof row.episode_text === "string"
      ) {
        if (!item.episodes.some((episode) => episode.id === row.episode_id)) {
          item.episodes.push({
            id: row.episode_id,
            text: row.episode_text,
            date:
              typeof row.episode_date === "string" ? row.episode_date : null,
          });
        }
      }
      if (
        typeof row.superseded_id === "string" &&
        typeof row.superseded_text === "string" &&
        !item.supersededFacts.some((fact) => fact.id === row.superseded_id)
      ) {
        item.supersededFacts.push({
          id: row.superseded_id,
          text: row.superseded_text,
        });
      }
      if (
        typeof row.superseded_by_id === "string" &&
        typeof row.superseded_by_text === "string" &&
        !item.supersededBy.some((fact) => fact.id === row.superseded_by_id)
      ) {
        item.supersededBy.push({
          id: row.superseded_by_id,
          text: row.superseded_by_text,
        });
      }
      grouped.set(row.id, item);
    }
    return [...grouped.values()];
  }

  async forget(userId: string, id: string): Promise<void> {
    const graph = await this.graph(userId);
    await graph.query(
      "MATCH (n) WHERE n.id = $id OR n.normalized_name = $id DETACH DELETE n",
      {
        params: { id },
      },
    );
  }

  async forgetAll(userId: string): Promise<void> {
    const graph = await this.graph(userId);
    await graph.query("MATCH (n) DETACH DELETE n");
    await this.forgetHandoffs(userId);
  }

  async pendingHandoff(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const graph = this.graphFor("agent_state");
    const rows = extractRows<Record<string, unknown>>(
      await graph.query(
        `MATCH (h:Handoff {user_id: $userId, status: 'pending'})
       RETURN h.id AS id, h.task AS task, h.context_fact_ids AS fact_ids
       ORDER BY h.created_at DESC LIMIT 1`,
        { params: { userId } },
      ),
    );
    return rows[0] || null;
  }

  async completeHandoff(id: string, userId: string): Promise<void> {
    await this.graphFor("agent_state").query(
      `MATCH (h:Handoff {id: $id, user_id: $userId, status: 'pending'})
       SET h.status = 'done', h.completed_at = $now`,
      { params: { id, userId, now: new Date().toISOString() } },
    );
  }

  async forgetHandoffs(userId: string): Promise<void> {
    await this.graphFor("agent_state").query(
      "MATCH (h:Handoff {user_id: $userId}) DETACH DELETE h",
      { params: { userId } },
    );
  }
}

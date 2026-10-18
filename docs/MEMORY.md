# FalkorDB memory model

Each Supabase account has a private `user_<supabase_user_id>` graph. Postgres
remains the source of truth for authentication, sessions, and messages. The graph
stores people and places as `Entity` nodes (`type: person | place`); topics are
categories on memories, never entities. `Fact`, `Goal`, and `Procedure` nodes
carry a `category` from `work | relationships | home | health | habits |
preferences | other`.

## Node and relationship model

- `(User)-[:HAS_FACT]->(Fact)` for memories about you.
- `(User)-[:HAS_EPISODE]->(Episode)` for imported legacy session summaries.
- `(Fact)-[:ABOUT]->(Entity)` for facts about a person or place.
- `(User)-[:HAS_GOAL]->(Goal)` for your goals. Goals carry `text`, `status`
  (`open | in_progress | achieved | dropped`), `why`, `started_at`,
  `last_mentioned_at`, and `category`.
- `(Fact)-[:DERIVED_FROM]->(Episode)` and
  `(Goal)-[:DERIVED_FROM]->(Episode)` keep the source conversation.
- `(Procedure)-[:LEARNED_FROM]->(Episode)` records conversational preferences.
- `(newer:Fact)-[:SUPERSEDES]->(older:Fact)` preserves changing facts; the old
  fact is retained with `valid_to` set.
- `(Memory)-[:RELATED_TO {reason, kind}]->(Memory)` connects facts and goals.
  `kind` is `stated` when you clearly made the connection, or `possible` when
  the relationship is tentative.
- `(Episode)-[:MENTIONS]->(Entity)` connects an episode to named people/places.

The shared `agent_state` graph contains user-scoped `Handoff` nodes for
memory-agent to check-in-agent follow-ups. It is not used to share private
memories between users.

## FalkorDB Browser queries

Select the relevant `user_<supabase_user_id>` graph in FalkorDB Browser.

Show current goals and their source episodes:

```cypher
MATCH (you:User)-[:HAS_GOAL]->(goal:Goal)
OPTIONAL MATCH (goal)-[:DERIVED_FROM]->(episode:Episode)
RETURN goal.text, goal.status, goal.why, goal.category,
       episode.text, episode.occurred_at
ORDER BY goal.last_mentioned_at DESC;
```

Show connected memories, including the explanation and whether the link was
stated or possible:

```cypher
MATCH (from)-[link:RELATED_TO]->(to)
RETURN from.text, from.category, link.reason, link.kind,
       to.text, to.category
ORDER BY link.kind, link.reason
LIMIT 50;
```

Show the history of a fact that was superseded:

```cypher
MATCH path = (newer:Fact)-[:SUPERSEDES*1..]->(older:Fact)
RETURN path
ORDER BY newer.valid_from DESC;
```

Show facts and the conversations that support them:

```cypher
MATCH (fact:Fact)-[:DERIVED_FROM]->(episode:Episode)
OPTIONAL MATCH (fact)-[:ABOUT]->(entity:Entity)
OPTIONAL MATCH (:User)-[:HAS_FACT]->(fact)
RETURN fact.text, fact.category, fact.confidence, fact.valid_from,
       fact.valid_to, entity.name, episode.text, episode.occurred_at
ORDER BY fact.valid_from DESC
LIMIT 25;
```

Show imported legacy session summaries and their source session IDs:

```cypher
MATCH (:User)-[:HAS_EPISODE]->(episode:Episode {source: 'legacy_postgres'})
RETURN episode.text, episode.occurred_at, episode.source_session_id
ORDER BY episode.occurred_at DESC
LIMIT 25;
```

Inspect pending and completed check-in handoffs in the shared `agent_state`
graph:

```cypher
MATCH (handoff:Handoff)
RETURN handoff.user_id, handoff.from_agent, handoff.to_agent, handoff.task,
       handoff.context_fact_ids, handoff.status, handoff.created_at
ORDER BY handoff.created_at DESC
LIMIT 25;
```

## Backfilling existing memory

Before enabling FalkorDB for a project that already has Postgres memories,
import the existing per-user summaries as episodic graph nodes:

```sh
npm run migrate:legacy-memories
```

Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`MEMORY_SERVICE_URL`, and `MEMORY_SERVICE_SECRET` in the trusted operator
environment that runs the command. The import is idempotent, preserves the
original summary date and source session ID, and leaves Postgres records
untouched. It imports summaries as episodes only; it does not infer facts,
goals, or procedures from prose. Never expose the service-role key to the
browser or commit a real value.

For an existing FalkorDB graph that uses the earlier topic-entity model, also
run the following idempotent model migration once per Supabase user graph. Set
`FALKORDB_URL` in the trusted operator environment to point to the relevant
FalkorDB deployment:

```sh
npm run migrate:model --prefix memory-service -- <supabase-user-id>
```

It re-categorizes topic entities' facts, attaches those facts to the user,
attaches legacy goals directly to the user, normalizes goal status and dates,
and removes only the converted topic entities. Facts, episodes, and
`SUPERSEDES` history are preserved. Run once per user; rerunning is safe.

## Service and application setup

The React app calls authenticated Supabase Edge Functions. Edge Functions call
the private memory service over HTTPS using `x-memory-service-secret`; neither
the FalkorDB URL nor the service secret is exposed to the browser. Set
`MEMORY_BACKEND=falkordb` to enable graph-backed recall and writes. The existing
Postgres summary memories remain the fallback if the graph service is
unavailable.

For local development, set `FALKORDB_URL`, `MEMORY_SERVICE_URL`, and
`MEMORY_SERVICE_SECRET` in the appropriate service and Supabase environments.
Start FalkorDB and the service from the repository root:

```sh
docker run --name coree-falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest
npm install --prefix memory-service
npm run dev --prefix memory-service
```

Run the focused service tests with:

```sh
npm run test:memory-service
```

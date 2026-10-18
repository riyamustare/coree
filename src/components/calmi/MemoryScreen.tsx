import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalmiShell } from "./CalmiShell";
import {
  MemoryConstellation,
  type ConstellationCategory,
  type ConstellationGoalStatus,
  type ConstellationLink,
  type ConstellationNode,
} from "./MemoryConstellation";
import {
  inferMemoryCategory,
  reconcileResidenceHistory,
} from "@/lib/memoryGraph";
import { toDirectAddress } from "@/lib/personLanguage";

interface MemoryItem {
  id: string;
  text: string;
  status?: string;
  entity?: string;
  category?: string;
  legacy?: boolean;
  episode_text?: string;
  episode_date?: string;
}

interface MemoryData {
  facts: MemoryItem[];
  procedures: MemoryItem[];
  goals: MemoryItem[];
  nodes: ConstellationNode[];
  links: ConstellationLink[];
}

const memoryCache = new Map<string, MemoryData>();

interface MemoryScreenProps {
  userId: string;
  genzMode: boolean;
  onGenzToggle: (enabled: boolean) => void;
  onGoHome: () => void;
  onViewInsights: () => void;
  onViewHistory: () => void;
  onOpenNotes: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  theme: "light" | "dark";
  onThemeToggle: (event?: React.MouseEvent) => void;
}

const validCategories = new Set<ConstellationCategory>([
  "work",
  "relationships",
  "home",
  "health",
  "habits",
  "preferences",
  "other",
]);

function graphFallback(
  data: Omit<MemoryData, "nodes" | "links">,
  userId: string,
) {
  const nodes: ConstellationNode[] = [
    {
      id: `user:${userId}`,
      type: "user",
      label: "You",
      category: "other",
      properties: {},
    },
  ];
  const links: ConstellationLink[] = [];
  const category = (value: string | undefined): ConstellationCategory =>
    value && validCategories.has(value as ConstellationCategory)
      ? (value as ConstellationCategory)
      : "other";
  const addItems = (
    items: MemoryItem[],
    type: "fact" | "goal" | "procedure",
  ) => {
    for (const item of items) {
      const node: ConstellationNode = {
        id: item.id,
        type,
        label: item.text.slice(0, 40),
        text: item.text,
        category:
          item.category && item.category !== "legacy"
            ? category(item.category)
            : (inferMemoryCategory(item.text) as ConstellationCategory),
        properties: { ...item },
      };
      nodes.push(node);
      if (type === "goal") {
        links.push({
          source: `user:${userId}`,
          target: item.id,
          type: "HAS_GOAL",
        });
      } else if (type === "fact" && item.entity) {
        const entityId = `person:${item.entity.toLocaleLowerCase()}`;
        if (!nodes.some((candidate) => candidate.id === entityId)) {
          nodes.push({
            id: entityId,
            type: "person",
            label: item.entity,
            category: "other",
            properties: { name: item.entity },
          });
        }
        links.push({ source: item.id, target: entityId, type: "ABOUT" });
      } else if (type === "fact") {
        links.push({
          source: `user:${userId}`,
          target: item.id,
          type: "HAS_FACT",
        });
      }
    }
  };
  addItems(data.facts, "fact");
  addItems(data.goals, "goal");
  addItems(data.procedures, "procedure");
  return { nodes, links };
}

export function MemoryScreen(props: MemoryScreenProps) {
  const cachedMemory = memoryCache.get(props.userId);
  const [memory, setMemory] = useState<MemoryData>(
    () =>
      cachedMemory ?? {
        facts: [],
        procedures: [],
        goals: [],
        nodes: [],
        links: [],
      },
  );
  const [loading, setLoading] = useState(!cachedMemory);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    if (!memoryCache.has(props.userId)) setLoading(true);
    setLoadError(false);
    const listResult = await supabase.functions.invoke("memory", {
      body: { action: "list" },
    });
    if (listResult.error) {
      console.error("Could not load memories:", listResult.error);
      setLoadError(true);
      toast({
        title: "Could not load memory",
        description: "Please try again shortly.",
        variant: "destructive",
      });
    } else {
      const facts = Array.isArray(listResult.data?.facts)
        ? listResult.data.facts
        : [];
      const procedures = Array.isArray(listResult.data?.procedures)
        ? listResult.data.procedures
        : [];
      const goals = Array.isArray(listResult.data?.goals)
        ? listResult.data.goals
        : [];
      const graphResult =
        listResult.data?.backend === "falkordb"
          ? await supabase.functions.invoke("memory", {
              body: { action: "graph" },
            })
          : null;
      if (graphResult?.error) {
        console.warn(
          "Could not load the memory graph; showing the available memories instead.",
          graphResult.error,
        );
      }
      const fallback = graphFallback(
        { facts, procedures, goals },
        props.userId,
      );
      const graphNodes = Array.isArray(graphResult?.data?.nodes)
        ? (graphResult.data.nodes as ConstellationNode[])
        : [];
      const sourceByMemoryId = new Map<
        string,
        { episode_text: string; episode_date?: string }
      >();
      for (const item of [...facts, ...procedures, ...goals] as MemoryItem[]) {
        if (typeof item.id !== "string" || typeof item.episode_text !== "string") {
          continue;
        }
        sourceByMemoryId.set(item.id, {
          episode_text: item.episode_text,
          ...(typeof item.episode_date === "string"
            ? { episode_date: item.episode_date }
            : {}),
        });
      }
      const graphNodesWithSources = graphNodes.map((node) => {
        const source = sourceByMemoryId.get(node.id);
        return source
          ? { ...node, properties: { ...node.properties, ...source } }
          : node;
      });
      const graphLinks = Array.isArray(graphResult?.data?.links)
        ? (graphResult.data.links as ConstellationLink[])
        : [];
      const graphData =
        graphNodesWithSources.filter((node) => node.type !== "user").length > 0
          ? reconcileResidenceHistory(graphNodesWithSources, graphLinks)
          : reconcileResidenceHistory(fallback.nodes, fallback.links);
      const nextMemory: MemoryData = {
        facts,
        procedures,
        goals,
        nodes: graphData.nodes,
        links: graphData.links,
      };
      memoryCache.set(props.userId, nextMemory);
      setMemory(nextMemory);
    }
    setLoading(false);
  }, [props.userId]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  const forget = async (item: MemoryItem) => {
    setBusyId(item.id);
    const { error } = await supabase.functions.invoke("memory", {
      body: { action: "forget", id: item.id, legacy: item.legacy === true },
    });
    if (error) {
      console.error("Could not forget memory:", error);
      toast({
        title: "Memory was not removed",
        description: "Please try again.",
        variant: "destructive",
      });
    } else {
      await loadMemories();
    }
    setBusyId(null);
  };

  const forgetNode = async (node: ConstellationNode) => {
    await forget({
      id: node.id,
      text: node.text || node.label,
      legacy: node.properties.category === "legacy",
    });
  };

  const updateGoal = async (
    node: ConstellationNode,
    status: ConstellationGoalStatus,
  ) => {
    setBusyId(node.id);
    const { error } = await supabase.functions.invoke("memory", {
      body: { action: "goal-status", id: node.id, status },
    });
    if (error) {
      console.error("Could not update the goal:", error);
      toast({
        title: "Goal was not updated",
        description: "Please try again.",
        variant: "destructive",
      });
    } else {
      await loadMemories();
    }
    setBusyId(null);
  };

  const hasMemories = memory.nodes.some((node) => node.type !== "user");
  const goals = memory.goals;

  return (
    <CalmiShell
      userId={props.userId}
      genzMode={props.genzMode}
      onGenzToggle={props.onGenzToggle}
      onGoHome={props.onGoHome}
      onViewInsights={props.onViewInsights}
      onViewHistory={props.onViewHistory}
      onOpenNotes={props.onOpenNotes}
      onOpenSettings={props.onOpenSettings}
      onSignOut={props.onSignOut}
      theme={props.theme}
      onThemeToggle={props.onThemeToggle}
    >
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pt-16 md:pt-6">
        <header className="mb-6">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            your space
          </p>
          <h1 className="text-3xl font-black lowercase tracking-tight text-foreground">
            memory
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            What matters to you, the people in your life, and how it all
            connects.
          </p>
        </header>

        {goals.length ? (
          <details className="mb-5 rounded-2xl border border-border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
              Your goals{" "}
              <span className="ml-1 text-muted-foreground">
                ({goals.length})
              </span>
            </summary>
            <ul className="space-y-2 border-t border-border px-4 py-3">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>{toDirectAddress(goal.text)}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {(goal.status || "open").replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {!loading && loadError ? (
          <div className="mb-5 rounded-2xl border border-destructive/40 bg-card p-5">
            <p className="text-sm">Memory could not be loaded right now.</p>
            <button
              type="button"
              onClick={() => void loadMemories()}
              className="mt-3 text-sm font-semibold text-primary underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : null}
        {!loading && !loadError && !hasMemories ? (
          <p className="mb-5 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Start chatting to create memories.
          </p>
        ) : null}
        {loading && !hasMemories ? (
          <p className="mb-5 text-sm text-muted-foreground">Loading memory…</p>
        ) : null}

        {hasMemories ? (
          <MemoryConstellation
            nodes={memory.nodes}
            links={memory.links}
            onForget={(node) => void forgetNode(node)}
            onGoalStatus={(node, status) => void updateGoal(node, status)}
          />
        ) : null}
      </main>
    </CalmiShell>
  );
}

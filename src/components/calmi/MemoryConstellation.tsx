import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin, X } from "lucide-react";
import {
  groupMemoriesByCategory,
  nodeCaption,
  summarizeConversation,
  wrapNodeCaption,
} from "@/lib/memoryGraph";

export type ConstellationNodeType =
  | "user"
  | "category"
  | "person"
  | "place"
  | "fact"
  | "goal"
  | "procedure"
  | "episode";
export type ConstellationCategory =
  | "work"
  | "relationships"
  | "home"
  | "health"
  | "habits"
  | "preferences"
  | "other";
export type ConstellationGoalStatus =
  "open" | "in_progress" | "achieved" | "dropped";

export interface ConstellationNode {
  id: string;
  type: ConstellationNodeType;
  label: string;
  text?: string;
  category: ConstellationCategory;
  properties: Record<string, unknown>;
}

export interface ConstellationLink {
  source: string;
  target: string;
  type:
    | "HAS_GOAL"
    | "HAS_FACT"
    | "HAS_EPISODE"
    | "HAS_CATEGORY"
    | "CONTAINS_CATEGORY"
    | "ABOUT"
    | "DERIVED_FROM"
    | "SUPERSEDES"
    | "RELATED_TO";
  reason?: string;
  kind?: "stated" | "possible";
}

interface Point extends ConstellationNode {
  x: number;
  y: number;
}

interface AnimatedPoint extends Point {
  opacity: number;
}

interface MemoryConstellationProps {
  nodes: ConstellationNode[];
  links: ConstellationLink[];
  highlightIds?: string[];
  onForget: (node: ConstellationNode) => void;
  onGoalStatus: (
    node: ConstellationNode,
    status: ConstellationGoalStatus,
  ) => void;
}

type MemoryFilter = "entity" | "fact" | "goal" | "procedure" | "episode";

const filterOptions: Array<{
  id: MemoryFilter;
  label: string;
  color: string;
}> = [
  { id: "entity", label: "Entities", color: "#60a5fa" },
  { id: "fact", label: "Memories", color: "#2dd4bf" },
  { id: "goal", label: "Goals", color: "#f59e0b" },
  { id: "procedure", label: "Procedures", color: "#a78bfa" },
  { id: "episode", label: "Episodes", color: "#64748b" },
];

const categoryColors: Partial<Record<ConstellationCategory, string>> = {
  work: "#60a5fa",
  relationships: "#c084fc",
  home: "#fbbf24",
  health: "#34d399",
  habits: "#fb923c",
  preferences: "#a78bfa",
};

function factIsOld(node: ConstellationNode) {
  return node.type === "fact" && node.properties.valid_to != null;
}

function makeForceLayout(
  nodes: ConstellationNode[],
  links: ConstellationLink[],
  visibleIds: Set<string>,
): Point[] {
  const visible = nodes.filter((node) => visibleIds.has(node.id));
  const center = { x: 450, y: 300 };
  const seedFor = (node: ConstellationNode) => {
    let hash = 0;
    for (const char of node.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const normalized = Math.abs(hash) / 2147483647;
    return {
      angle: normalized * Math.PI * 2,
      radius: 64 + ((normalized * 7919) % 1) * 150,
    };
  };
  const points = visible.map((node) => {
    const { angle, radius } = seedFor(node);
    return {
      ...node,
      x: node.type === "user" ? center.x : center.x + Math.cos(angle) * radius,
      y: node.type === "user" ? center.y : center.y + Math.sin(angle) * radius,
    };
  });
  const pointById = new Map(points.map((point) => [point.id, point]));
  const connected = links.filter(
    (link) =>
      pointById.has(link.source) &&
      pointById.has(link.target) &&
      link.type !== "DERIVED_FROM",
  );
  const velocities = new Map(points.map((point) => [point.id, { x: 0, y: 0 }]));

  for (let iteration = 0; iteration < 260; iteration += 1) {
    const forces = new Map(points.map((point) => [point.id, { x: 0, y: 0 }]));
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      if (a.type === "user") continue;
      const forceA = forces.get(a.id)!;
      forceA.x += (center.x - a.x) * 0.0012;
      forceA.y += (center.y - a.y) * 0.0012;
      for (let j = i + 1; j < points.length; j += 1) {
        const b = points[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 1) {
          dx = 1;
          dy = 0;
          distanceSquared = 1;
        }
        const distance = Math.sqrt(distanceSquared);
        const separation = a.type === "goal" || b.type === "goal" ? 62 : 52;
        const collision = Math.max(0, separation - distance) * 0.075;
        const repulsion = 1150 / distanceSquared;
        const push = collision + repulsion;
        forceA.x += (dx / distance) * push;
        forceA.y += (dy / distance) * push;
        if (b.type !== "user") {
          const forceB = forces.get(b.id)!;
          forceB.x -= (dx / distance) * push;
          forceB.y -= (dy / distance) * push;
        }
      }
    }
    for (const link of connected) {
      const source = pointById.get(link.source)!;
      const target = pointById.get(link.target)!;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired =
        link.type === "SUPERSEDES"
          ? 76
          : link.type === "CONTAINS_CATEGORY"
            ? 68
            : link.type === "HAS_CATEGORY"
              ? 108
              : link.type === "RELATED_TO"
                ? 118
                : source.type === "user" || target.type === "user"
                  ? 118
                  : 90;
      const pull = (distance - desired) * 0.009;
      forces.get(source.id)!.x += (dx / distance) * pull;
      forces.get(source.id)!.y += (dy / distance) * pull;
      forces.get(target.id)!.x -= (dx / distance) * pull;
      forces.get(target.id)!.y -= (dy / distance) * pull;
    }
    for (const point of points) {
      if (point.type === "user") continue;
      const force = forces.get(point.id)!;
      const velocity = velocities.get(point.id)!;
      velocity.x = (velocity.x + force.x) * 0.78;
      velocity.y = (velocity.y + force.y) * 0.78;
      point.x = Math.max(36, Math.min(864, point.x + velocity.x));
      point.y = Math.max(36, Math.min(564, point.y + velocity.y));
    }
  }
  return points;
}

function nodeColor(node: ConstellationNode) {
  if (node.type === "user") return "#3b82f6";
  if (node.type === "category")
    return categoryColors[node.category] || "#94a3b8";
  if (node.type === "goal") return "#fbbf24";
  if (node.type === "person" || node.type === "place") return "#60a5fa";
  if (node.type === "fact") return "#2dd4bf";
  if (node.type === "procedure") return "#a78bfa";
  return "#94a3b8";
}

function statusFor(node: ConstellationNode): ConstellationGoalStatus {
  const status = node.properties.status;
  return status === "in_progress" ||
    status === "achieved" ||
    status === "dropped"
    ? status
    : "open";
}

export function MemoryConstellation({
  nodes,
  links,
  highlightIds = [],
  onForget,
  onGoalStatus,
}: MemoryConstellationProps) {
  const graphRef = useRef<SVGSVGElement>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<MemoryFilter>>(
    () => new Set(filterOptions.map((option) => option.id)),
  );
  const [showHistory, setShowHistory] = useState(false);
  const [traceMode, setTraceMode] = useState(false);
  const [blurLabels, setBlurLabels] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const filteredNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          node.type === "user" ||
          (node.type !== "category" &&
            (node.type === "episode"
              ? showHistory && visibleTypes.has("episode")
              : visibleTypes.has(
                  node.type === "person" || node.type === "place"
                    ? "entity"
                    : node.type,
                )) &&
            (showHistory || !factIsOld(node))),
      ),
    [nodes, showHistory, visibleTypes],
  );
  const categoryGraph = useMemo(
    () => groupMemoriesByCategory(filteredNodes, links),
    [filteredNodes, links],
  );
  const visibleNodes = categoryGraph.nodes;
  const graphLinks = categoryGraph.links;
  const visibleIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );
  const points = useMemo(
    () => makeForceLayout(visibleNodes, graphLinks, visibleIds),
    [visibleNodes, graphLinks, visibleIds],
  );
  const [animatedPoints, setAnimatedPoints] = useState<AnimatedPoint[]>([]);
  const animatedPointsRef = useRef(animatedPoints);
  const animationFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const startPositions = new Map(
      animatedPointsRef.current.map((point) => [
        point.id,
        { x: point.x, y: point.y, opacity: point.opacity },
      ]),
    );
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      const finalPoints = points.map((point) => ({ ...point, opacity: 1 }));
      animatedPointsRef.current = finalPoints;
      setAnimatedPoints(finalPoints);
      return;
    }

    const startTime = performance.now();
    const center = { x: 450, y: 300 };
    const duration = 680;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextPoints = points.map((point) => {
        const previous = startPositions.get(point.id);
        const initialAngle = point.id
          .split("")
          .reduce((angle, character) => angle + character.charCodeAt(0), 0);
        const start = previous ?? {
          x:
            point.type === "user"
              ? center.x
              : center.x + Math.cos(initialAngle) * 28,
          y:
            point.type === "user"
              ? center.y
              : center.y + Math.sin(initialAngle) * 28,
          opacity: 0,
        };
        return {
          ...point,
          x: start.x + (point.x - start.x) * easedProgress,
          y: start.y + (point.y - start.y) * easedProgress,
          opacity: start.opacity + (1 - start.opacity) * easedProgress,
        };
      });
      animatedPointsRef.current = nextPoints;
      setAnimatedPoints(nextPoints);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [points]);
  const displayPoints = useMemo(
    () =>
      animatedPoints.map((point) => ({
        ...point,
        ...dragPositions[point.id],
      })),
    [animatedPoints, dragPositions],
  );
  const pointById = useMemo(
    () => new Map(displayPoints.map((point) => [point.id, point])),
    [displayPoints],
  );
  const selected = visibleNodes.find((node) => node.id === selectedId) || null;
  const selectedSourceNodeIds = new Set([
    ...(selectedId ? [selectedId] : []),
    ...links
      .filter(
        (link) =>
          link.type === "ABOUT" &&
          link.target === selectedId &&
          nodes.find((node) => node.id === link.source)?.type === "fact",
      )
      .map((link) => link.source),
  ]);
  const selectedEpisodeIds = new Set(
    links
      .filter(
        (link) =>
          link.type === "DERIVED_FROM" &&
          selectedSourceNodeIds.has(link.source),
      )
      .map((link) => link.target),
  );
  const selectedEpisodes = [...selectedEpisodeIds].flatMap((id) => {
    const episode = nodes.find((node) => node.id === id);
    return episode ? [episode] : [];
  });
  const inlineSourceText =
    selectedEpisodes.length === 0
      ? selected?.type === "episode"
        ? selected.text || selected.label
        : typeof selected?.properties.episode_text === "string"
          ? selected.properties.episode_text
          : undefined
      : undefined;
  const inlineSourceDate =
    selected?.type === "episode"
      ? selected.properties.occurred_at
      : selected?.properties.episode_date;
  const relatedLinks = links.filter(
    (link) =>
      link.type === "RELATED_TO" &&
      (link.source === selectedId || link.target === selectedId),
  );
  const supersededBy = links
    .filter((link) => link.type === "SUPERSEDES" && link.target === selectedId)
    .map((link) => nodes.find((node) => node.id === link.source))
    .filter((node): node is ConstellationNode => Boolean(node));
  const supersedes = links
    .filter((link) => link.type === "SUPERSEDES" && link.source === selectedId)
    .map((link) => nodes.find((node) => node.id === link.target))
    .filter((node): node is ConstellationNode => Boolean(node));
  const focusId = hoveredId || selectedId;
  const connectedIds = new Set(
    graphLinks
      .filter((link) => link.source === focusId || link.target === focusId)
      .flatMap((link) => [link.source, link.target]),
  );
  const traceSet = new Set(highlightIds);
  if (traceMode && selectedId) {
    traceSet.add(selectedId);
    graphLinks
      .filter(
        (link) => link.source === selectedId || link.target === selectedId,
      )
      .forEach((link) => {
        traceSet.add(link.source);
        traceSet.add(link.target);
      });
  }
  const linkLabel = (nodeId: string) => {
    const node = visibleNodes.find((candidate) => candidate.id === nodeId);
    return node ? nodeCaption(node) : "Memory";
  };
  const goalWhy =
    selected?.type === "goal" && typeof selected.properties.why === "string"
      ? selected.properties.why
      : "";
  const normalizedGoalWhy = goalWhy
    .toLowerCase()
    .replace(/^(you|i) (?:want|hope) to\s+/i, "")
    .replace(/\bgetting\b/g, "get")
    .replace(/[.!?]+$/g, "")
    .trim();
  const normalizedGoalCaption = selected
    ? nodeCaption(selected)
        .toLowerCase()
        .replace(/\bgetting\b/g, "get")
        .trim()
    : "";
  const showGoalWhy =
    Boolean(goalWhy) && normalizedGoalWhy !== normalizedGoalCaption;
  const rememberedBecause =
    selected?.type === "goal"
      ? "I saved this as a goal so we can check in on it."
      : selected?.type === "procedure"
        ? "I saved this to guide how I respond to you."
        : selected?.type === "person"
          ? "I remembered who this person is in your life."
          : selected?.type === "place"
            ? "I remembered this place as part of your story."
            : "I kept this context in mind for future conversations.";
  const categoryMemoryCount =
    selected?.type === "category"
      ? visibleNodes.filter(
          (node) =>
            node.type !== "category" &&
            node.type !== "user" &&
            node.category === selected.category,
        ).length
      : 0;

  return (
    <div className="space-y-3">
      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const active = visibleTypes.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setVisibleTypes((current) => {
                    const next = new Set(current);
                    if (next.has(option.id)) next.delete(option.id);
                    else next.add(option.id);
                    return next;
                  })
                }
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-border bg-card text-foreground hover:bg-muted"
                    : "border-border/60 bg-transparent text-muted-foreground opacity-60 hover:opacity-100"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(event) => setShowHistory(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Show history
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={blurLabels}
              onChange={(event) => setBlurLabels(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Blur labels
          </label>
          <button
            type="button"
            aria-pressed={traceMode}
            onClick={() =>
              setTraceMode((active) => {
                if (!active) setShowHistory(true);
                return !active;
              })
            }
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              traceMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {traceMode ? "Exit trace mode" : "Why did Core say this?"}
          </button>
          <button
            type="button"
            onClick={() => {
              setVisibleTypes(
                new Set(filterOptions.map((option) => option.id)),
              );
              setShowHistory(false);
              setTraceMode(false);
              setBlurLabels(false);
              setHoveredId(null);
              setSelectedId(null);
              setDragPositions({});
            }}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            Reset view
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-[#111111] text-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Your memory graph</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {
                  visibleNodes.filter(
                    (node) => node.type !== "user" && node.type !== "category",
                  ).length
                }{" "}
                memories ·{" "}
                {
                  graphLinks.filter(
                    (link) =>
                      visibleIds.has(link.source) &&
                      visibleIds.has(link.target),
                  ).length
                }{" "}
                connections
              </p>
            </div>
          </div>
          {highlightIds.length > 0 ? (
            <p className="px-4 pt-3 text-xs text-teal-200">
              {highlightIds.length} memory trace items highlighted.
            </p>
          ) : null}
          <div className="w-full">
            <svg
              ref={graphRef}
              role="img"
              aria-label="Interactive force-directed graph of your memories, goals, people, places, preferences, and conversations"
              viewBox="0 0 900 600"
              className="h-[min(68vh,620px)] min-h-[390px] w-full sm:min-h-[500px]"
              preserveAspectRatio="xMidYMid meet"
              onPointerMove={(event) => {
                if (!draggingId || !graphRef.current) return;
                const bounds = graphRef.current.getBoundingClientRect();
                const scale = Math.min(bounds.width / 900, bounds.height / 600);
                const offsetX = (bounds.width - 900 * scale) / 2;
                const offsetY = (bounds.height - 600 * scale) / 2;
                setDragPositions((current) => ({
                  ...current,
                  [draggingId]: {
                    x: Math.max(
                      20,
                      Math.min(
                        880,
                        (event.clientX - bounds.left - offsetX) / scale,
                      ),
                    ),
                    y: Math.max(
                      20,
                      Math.min(
                        580,
                        (event.clientY - bounds.top - offsetY) / scale,
                      ),
                    ),
                  },
                }));
              }}
              onPointerUp={() => setDraggingId(null)}
              onPointerCancel={() => setDraggingId(null)}
            >
              <defs>
                <radialGradient id="memory-node-user" cx="34%" cy="28%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="72%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </radialGradient>
                <radialGradient id="memory-node-entity" cx="34%" cy="28%">
                  <stop offset="0%" stopColor="#bfdbfe" />
                  <stop offset="72%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </radialGradient>
                <radialGradient id="memory-node-fact" cx="34%" cy="28%">
                  <stop offset="0%" stopColor="#99f6e4" />
                  <stop offset="72%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </radialGradient>
                <radialGradient id="memory-node-procedure" cx="34%" cy="28%">
                  <stop offset="0%" stopColor="#ddd6fe" />
                  <stop offset="72%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </radialGradient>
                <radialGradient id="memory-node-episode" cx="34%" cy="28%">
                  <stop offset="0%" stopColor="#cbd5e1" />
                  <stop offset="72%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#64748b" />
                </radialGradient>
                <marker
                  id="constellation-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M0 0 10 5 0 10z" fill="#f87171" />
                </marker>
              </defs>
              <style>
                {`@keyframes memory-node-breathe { 0%, 100% { opacity: .34; transform: scale(.94); } 50% { opacity: .68; transform: scale(1.08); } } .memory-node-glow { animation: memory-node-breathe 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; } @media (prefers-reduced-motion: reduce) { .memory-node-glow { animation: none !important; } }`}
              </style>
              {graphLinks.map((link, index) => {
                if (
                  !visibleIds.has(link.source) ||
                  !visibleIds.has(link.target)
                )
                  return null;
                if (link.type === "SUPERSEDES" && !showHistory) return null;
                const source = pointById.get(link.source);
                const target = pointById.get(link.target);
                if (!source || !target) return null;
                const isPossible =
                  link.type === "RELATED_TO" && link.kind === "possible";
                const isRelated = link.type === "RELATED_TO";
                const isSupersedes = link.type === "SUPERSEDES";
                const focused =
                  !focusId ||
                  (connectedIds.has(source.id) && connectedIds.has(target.id));
                const traceFocused =
                  !traceMode ||
                  traceSet.size === 0 ||
                  traceSet.has(source.id) ||
                  traceSet.has(target.id);
                return (
                  <g
                    key={`${link.type}-${link.source}-${link.target}-${index}`}
                    opacity={
                      (focused && traceFocused ? 0.58 : 0.1) *
                      Math.min(source.opacity, target.opacity)
                    }
                  >
                    <title>{link.reason || link.type}</title>
                    <line
                      className="memory-link"
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={
                        isSupersedes
                          ? "#f87171"
                          : isRelated
                            ? isPossible
                              ? "#a78bfa"
                              : "#94a3b8"
                            : link.type === "HAS_GOAL"
                              ? "#fbbf24"
                              : link.type === "HAS_CATEGORY" ||
                                  link.type === "CONTAINS_CATEGORY"
                                ? categoryColors[
                                    pointById.get(
                                      link.type === "HAS_CATEGORY"
                                        ? link.target
                                        : link.source,
                                    )?.category || "other"
                                  ] || "#64748b"
                                : "#64748b"
                      }
                      strokeWidth={isRelated ? 1.4 : isSupersedes ? 1.5 : 1.1}
                      strokeDasharray={
                        isSupersedes ? "6 5" : isPossible ? "2 5" : undefined
                      }
                      markerEnd={
                        isSupersedes ? "url(#constellation-arrow)" : undefined
                      }
                      opacity={isSupersedes && factIsOld(target) ? 0.35 : 1}
                    />
                  </g>
                );
              })}
              {displayPoints.map((point) => {
                const isCategory = point.type === "category";
                const isGoal = point.type === "goal";
                const radius = isCategory
                  ? 11
                  : point.type === "user"
                    ? 27
                    : isGoal
                      ? 22
                      : point.type === "person" || point.type === "place"
                        ? 19
                        : point.type === "fact"
                          ? 15
                          : 13;
                const faded = factIsOld(point) && showHistory;
                const focused =
                  (!focusId ||
                    point.id === hoveredId ||
                    point.id === selectedId ||
                    connectedIds.has(point.id)) &&
                  (!traceMode ||
                    traceSet.size === 0 ||
                    traceSet.has(point.id) ||
                    point.type === "user");
                const traced = traceSet.has(point.id);
                const initial = point.label.trim().slice(0, 1).toUpperCase();
                const goalStatus = isGoal ? statusFor(point) : null;
                return (
                  <g
                    key={point.id}
                    role="button"
                    tabIndex={0}
                    aria-label={
                      point.type === "user"
                        ? "You"
                        : `${point.type === "fact" ? "memory" : point.type}: ${nodeCaption(point)}`
                    }
                    onClick={() => setSelectedId(point.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(point.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredId(point.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onPointerDown={(event) => {
                      if (point.type === "user") return;
                      event.stopPropagation();
                      graphRef.current?.setPointerCapture(event.pointerId);
                      setDraggingId(point.id);
                      setSelectedId(point.id);
                    }}
                    onFocus={() => setSelectedId(point.id)}
                    className="cursor-pointer outline-none transition-opacity duration-300 focus:outline-none focus-visible:outline-none motion-reduce:transition-none"
                    style={{ outline: "none" }}
                    opacity={
                      point.opacity * (faded ? 0.35 : 1) * (focused ? 1 : 0.17)
                    }
                  >
                    <title>
                      {nodeCaption(point)}
                      {point.category !== "other" ? ` · ${point.category}` : ""}
                    </title>
                    {selectedId === point.id ? (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={radius + 6}
                        fill="none"
                        stroke="#f8fafc"
                        strokeOpacity=".92"
                        strokeWidth="2.5"
                        pointerEvents="none"
                        className="memory-node-selection"
                      />
                    ) : null}
                    {isGoal ? (
                      <>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={radius}
                          fill="#fbbf24"
                          fillOpacity=".12"
                          stroke="#fbbf24"
                          strokeWidth="2.5"
                        />
                        <circle
                          cx={point.x + 13}
                          cy={point.y - 13}
                          r="7"
                          fill={
                            goalStatus === "achieved"
                              ? "#34d399"
                              : goalStatus === "dropped"
                                ? "#64748b"
                                : "#08111f"
                          }
                          stroke={
                            goalStatus === "open" ||
                            goalStatus === "in_progress"
                              ? "#fbbf24"
                              : "none"
                          }
                          strokeWidth="1.5"
                        />
                        {goalStatus === "in_progress" ? (
                          <path
                            d={`M${point.x + 13} ${point.y - 20} A7 7 0 0 1 ${point.x + 13} ${point.y - 6} L${point.x + 13} ${point.y - 20}Z`}
                            fill="#fbbf24"
                          />
                        ) : null}
                        {goalStatus === "achieved" ? (
                          <Check
                            x={point.x + 8}
                            y={point.y - 18}
                            width={10}
                            height={10}
                            color="#052e2b"
                          />
                        ) : null}
                      </>
                    ) : isCategory ? (
                      <>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={radius + 5}
                          fill={nodeColor(point)}
                          fillOpacity=".1"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={radius}
                          fill="#151b25"
                          stroke={nodeColor(point)}
                          strokeWidth={selectedId === point.id ? 2.5 : 1.5}
                        />
                      </>
                    ) : (
                      <>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={radius + (point.type === "user" ? 11 : 7)}
                          fill={nodeColor(point)}
                          fillOpacity={point.type === "user" ? ".1" : ".07"}
                          className="memory-node-glow"
                          style={{
                            animationDelay: `${-((point.id.length * 7) % 60) / 10}s`,
                          }}
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={radius}
                          fill={`url(#memory-node-${point.type === "person" || point.type === "place" ? "entity" : point.type})`}
                          fillOpacity={point.type === "user" ? ".98" : ".94"}
                          stroke={traced ? "#f0abfc" : nodeColor(point)}
                          strokeWidth={
                            traced ? 3.5 : selectedId === point.id ? 3 : 1.2
                          }
                          className="memory-node-shape"
                        />
                        <circle
                          cx={point.x - radius * 0.28}
                          cy={point.y - radius * 0.3}
                          r={Math.max(2, radius * 0.2)}
                          fill="#ffffff"
                          fillOpacity=".16"
                          pointerEvents="none"
                        />
                      </>
                    )}
                    {point.type === "person" ? (
                      <text
                        x={point.x}
                        y={point.y + 4}
                        textAnchor="middle"
                        fill="#dbeafe"
                        fontSize="11"
                        fontWeight="700"
                        className={`memory-node-label pointer-events-none transition-[x,y,filter] duration-300 motion-reduce:transition-none ${blurLabels ? "blur-[3px]" : ""}`}
                      >
                        {initial}
                      </text>
                    ) : null}
                    {point.type === "place" ? (
                      <MapPin
                        x={point.x - 6}
                        y={point.y - 7}
                        width={12}
                        height={14}
                        color="#dbeafe"
                      />
                    ) : null}
                    <text
                      x={point.x}
                      y={point.y + radius + 13}
                      textAnchor="middle"
                      fill={
                        isCategory
                          ? nodeColor(point)
                          : isGoal
                            ? "#fde68a"
                            : "#e2e8f0"
                      }
                      fontSize={isGoal || isCategory ? 12 : 11}
                      fontWeight={isGoal || isCategory ? 700 : 500}
                      className={`memory-node-label pointer-events-none transition-[x,y,filter] duration-300 motion-reduce:transition-none ${blurLabels ? "blur-[3px]" : ""}`}
                    >
                      {wrapNodeCaption(nodeCaption(point)).map(
                        (line, index) => (
                          <tspan
                            key={`${point.id}-caption-${index}`}
                            x={point.x}
                            dy={index === 0 ? 0 : 13}
                          >
                            {line}
                          </tspan>
                        ),
                      )}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.08] px-4 py-3 text-xs text-slate-400">
            {filterOptions.map((option) => (
              <span key={option.id} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: option.color }}
                />
                {option.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-slate-400" /> stated link
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dotted border-violet-300" />{" "}
              possible link
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dashed border-red-400" />{" "}
              memory history
            </span>
          </div>
        </div>
      </section>

      <section
        aria-live="polite"
        className="min-w-0 rounded-2xl border border-border bg-card p-4 text-foreground"
      >
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {selected.type === "user"
                    ? "You"
                    : selected.type === "category"
                      ? "Category"
                      : selected.type === "fact"
                        ? "Memory"
                        : selected.type[0].toLocaleUpperCase() +
                          selected.type.slice(1)}
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  {nodeCaption(selected)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close memory details"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {selected.type === "category" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {categoryMemoryCount}{" "}
                {categoryMemoryCount === 1 ? "memory" : "memories"} grouped in
                this category.
              </p>
            ) : null}
            {selected.type !== "user" &&
            selected.type !== "category" &&
            selected.type !== "person" &&
            selected.type !== "place" ? (
              <p className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                {selected.category}
              </p>
            ) : null}
            {selected.type === "goal" ? (
              <>
                <p className="mt-3 text-xs text-muted-foreground">
                  Status:{" "}
                  <span className="font-semibold capitalize text-foreground">
                    {statusFor(selected).replace("_", " ")}
                  </span>
                </p>
                {showGoalWhy ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {goalWhy}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusFor(selected) !== "achieved" ? (
                    <button
                      type="button"
                      onClick={() => onGoalStatus(selected, "achieved")}
                      className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700"
                    >
                      Mark as achieved
                    </button>
                  ) : null}
                  {statusFor(selected) !== "dropped" ? (
                    <button
                      type="button"
                      onClick={() => onGoalStatus(selected, "dropped")}
                      className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold"
                    >
                      Drop goal
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
            {typeof selected.properties.confidence === "number" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Confidence: {Math.round(selected.properties.confidence * 100)}%
              </p>
            ) : null}
            {selected.type !== "user" && selected.type !== "category" ? (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                <h4 className="text-xs font-bold">Where this came from</h4>
                {selectedEpisodes.map((episode) => {
                  const episodeText = episode.text || episode.label;
                  if (!episodeText) return null;
                  return (
                    <div
                      key={episode.id}
                      className="mt-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      {typeof episode.properties.occurred_at === "string" ? (
                        <p className="font-medium text-foreground">
                          Session from{" "}
                          {new Date(
                            episode.properties.occurred_at,
                          ).toLocaleDateString()}
                        </p>
                      ) : null}
                      <p className="mt-1">
                        {summarizeConversation(episodeText)}
                      </p>
                    </div>
                  );
                })}
                {inlineSourceText ? (
                  <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {typeof inlineSourceDate === "string" ? (
                      <p className="font-medium text-foreground">
                        Session from{" "}
                        {new Date(inlineSourceDate).toLocaleDateString()}
                      </p>
                    ) : null}
                    <p className="mt-1">
                      {summarizeConversation(inlineSourceText)}
                    </p>
                  </div>
                ) : null}
                {selected.type !== "episode" ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {rememberedBecause}
                  </p>
                ) : null}
                {selectedEpisodes.length === 0 && !inlineSourceText ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    No source conversation is linked to this memory yet.
                  </p>
                ) : null}
              </div>
            ) : null}
            {supersededBy.length || supersedes.length ? (
              <div className="mt-4 border-t border-border pt-3">
                <h4 className="text-xs font-bold">Memory history</h4>
                {supersedes.map((node) => (
                  <p
                    key={node.id}
                    className="mt-1 text-xs text-muted-foreground"
                  >
                    {nodeCaption(node)}
                  </p>
                ))}
                {supersededBy.map((node) => (
                  <p
                    key={node.id}
                    className="mt-1 text-xs text-muted-foreground"
                  >
                    Now: {nodeCaption(node)}
                  </p>
                ))}
              </div>
            ) : null}
            {relatedLinks.length ? (
              <div className="mt-4 border-t border-border pt-3">
                <h4 className="text-xs font-bold">Related to</h4>
                {relatedLinks.map((link, index) => (
                  <p
                    key={`${link.source}-${link.target}-${index}`}
                    className="mt-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="font-semibold text-foreground">
                      {linkLabel(
                        link.source === selected.id ? link.target : link.source,
                      )}
                    </span>
                    <span
                      className={`ml-2 rounded-full px-1.5 py-0.5 ${link.kind === "possible" ? "bg-violet-500/15 text-violet-700" : "bg-muted text-foreground"}`}
                    >
                      {link.kind === "possible" ? "Possible link" : "Stated"}
                    </span>
                    {link.reason ? (
                      <span className="mt-1 block">{link.reason}</span>
                    ) : null}
                  </p>
                ))}
              </div>
            ) : null}
            {selected.type !== "user" &&
            selected.type !== "category" &&
            selected.type !== "episode" ? (
              <button
                type="button"
                onClick={() => onForget(selected)}
                className="mt-5 w-full rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive"
              >
                Forget this
              </button>
            ) : null}
          </>
        ) : (
          <div>
            <p className="text-sm font-semibold">Explore a memory</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Select any node in the graph to see its context, source,
              connections, and history. You can drag nodes to arrange the view.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

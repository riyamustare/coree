import { toDirectAddress } from "./personLanguage";

const captionStopWords = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
]);

const categoryNames: Record<string, string> = {
  work: "Work",
  relationships: "Relationships",
  home: "Home",
  health: "Health",
  habits: "Habits",
  preferences: "Preferences",
  other: "Other",
};

const categoryPatterns: Array<[string, RegExp]> = [
  [
    "preferences",
    /\b(prefer|preference|communication|reply|replies|listening|advice|tone)\b/i,
  ],
  [
    "relationships",
    /\b(friend|aisha|family|partner|relationship|support|talk to her|talk to him)\b/i,
  ],
  ["work", /\b(work|job|career|office|deadline|project|manager|colleague)\b/i],
  [
    "home",
    /\b(home|house|city|moved|move to|living in|lives in|settling in|bangalore|pune)\b/i,
  ],
  [
    "health",
    /\b(sleep|bed|health|exercise|stress|emotion|tired|wind down|scrolling)\b/i,
  ],
  ["habits", /\b(habit|routine|daily|every day|nightly|morning)\b/i],
];

export function inferMemoryCategory(
  ...values: Array<string | undefined>
): string {
  const content = values.filter(Boolean).join(" ");
  return (
    categoryPatterns.find(([, pattern]) => pattern.test(content))?.[0] ||
    "other"
  );
}

interface CategorizedNode {
  id: string;
  type: string;
  label: string;
  text?: string;
  category: string;
  properties: Record<string, unknown>;
}

interface CategorizedLink {
  source: string;
  target: string;
  type: string;
  reason?: string;
  kind?: "stated" | "possible";
}

interface MemoryCaptionNode {
  type: string;
  label: string;
  text?: string;
  category?: string;
  properties: Record<string, unknown>;
}

interface ResidenceHistoryLink {
  source: string;
  target: string;
  type: "SUPERSEDES";
}

export function reconcileResidenceHistory<
  N extends {
    id: string;
    type: string;
    label: string;
    text?: string;
    category: string;
    properties: Record<string, unknown>;
  },
  L extends {
    source: string;
    target: string;
    type: string;
    reason?: string;
    kind?: "stated" | "possible";
  },
>(
  nodes: N[],
  links: L[],
): { nodes: N[]; links: Array<L | ResidenceHistoryLink> } {
  const reconciledNodes = nodes.map((node) => ({
    ...node,
    properties: { ...node.properties },
  }));
  const residences = reconciledNodes
    .map((node, index) => {
      if (
        node.type !== "fact" ||
        (node.category !== "home" && node.properties.category !== "home")
      ) {
        return null;
      }
      const validFrom =
        typeof node.properties.valid_from === "string"
          ? node.properties.valid_from
          : typeof node.properties.created_at === "string"
            ? node.properties.created_at
            : undefined;
      if (!validFrom || !Number.isFinite(Date.parse(validFrom))) return null;

      const caption = nodeCaption(node);
      const location = caption.match(
        /^(?:Moved to|Lives in|Previously lived in)\s+(.+)$/i,
      )?.[1];
      if (!location) return null;
      return { node, index, validFrom, location: location.toLocaleLowerCase() };
    })
    .filter(
      (
        residence,
      ): residence is {
        node: (typeof reconciledNodes)[number];
        index: number;
        validFrom: string;
        location: string;
      } => residence !== null,
    )
    .sort(
      (first, second) =>
        Date.parse(first.validFrom) - Date.parse(second.validFrom),
    );
  const reconciledLinks: Array<L | ResidenceHistoryLink> = [...links];
  for (let index = 1; index < residences.length; index += 1) {
    const previous = residences[index - 1];
    const current = residences[index];
    if (previous.location === current.location) continue;

    if (reconciledNodes[previous.index].properties.valid_to == null) {
      reconciledNodes[previous.index].properties.valid_to = current.validFrom;
    }
    if (
      !reconciledLinks.some(
        (link) =>
          link.type === "SUPERSEDES" &&
          link.source === current.node.id &&
          link.target === previous.node.id,
      )
    ) {
      reconciledLinks.push({
        source: current.node.id,
        target: previous.node.id,
        type: "SUPERSEDES",
      });
    }
  }
  return { nodes: reconciledNodes, links: reconciledLinks };
}

export function nodeCaption(node: MemoryCaptionNode): string {
  const propertyLabel =
    typeof node.properties.label === "string"
      ? node.properties.label.trim()
      : "";
  const displayLabel = propertyLabel || node.label.trim();
  const hasIncompleteLabel =
    /\b(?:from|to|your|the|a|an|is|are|was|were|and|with|because|moving|moved)\s*$/i.test(
      displayLabel,
    );
  const source =
    node.type === "goal" ||
    !displayLabel ||
    /\buser\b|\.{2,}/i.test(displayLabel) ||
    displayLabel.length > 30 ||
    hasIncompleteLabel ||
    (node.type === "fact" &&
      (node.category === "home" || node.properties.category === "home") &&
      Boolean(node.text) &&
      !/\b(?:moved|lives|living)\s+(?:to|in)\s+\S+/i.test(displayLabel))
      ? node.text || displayLabel || node.type
      : displayLabel;
  let caption = toDirectAddress(source || node.type)
    .trim()
    .replace(/\s+/g, " ")
    .split(/[.!?](?:\s|$)/, 1)[0];
  const isHomeFact =
    node.type === "fact" &&
    (node.category === "home" || node.properties.category === "home");
  const isHistoricalResidence = isHomeFact && node.properties.valid_to != null;
  const historicalLocation = isHistoricalResidence
    ? caption.match(
        /\b(?:used to live|previously lived|formerly lived|live[sd]?|living|resid(?:e|es|ing))\s+in\s+([^,.;!?]+)/i,
      )?.[1] ||
      caption.match(
        /\b(?:moved|moving|relocated|relocating)\s+(?:from\s+.+?\s+)?to\s+([^,.;!?]+)/i,
      )?.[1]
    : undefined;
  const currentLivingDestination = isHomeFact
    ? caption.match(
        /\b(?:now|currently)\s+(?:(?:you|i)\s+)?(?:(?:are|am)\s+)?(?:live[sd]?|living|resid(?:e|es|ing))\s+in\s+([^,.;!?]+)/i,
      )?.[1]
    : undefined;
  const movedDestination = isHomeFact
    ? caption.match(
        /\b(?:moved|moving|relocated|relocating)\s+(?:from\s+.+?\s+)?to\s+([^,.;!?]+)/i,
      )?.[1]
    : undefined;
  const livingDestination = isHomeFact
    ? caption.match(
        /\b(?:live[sd]?|living|resid(?:e|es|ing))\s+in\s+([^,.;!?]+)/i,
      )?.[1]
    : undefined;
  if (isHistoricalResidence && historicalLocation) {
    const destination = historicalLocation
      .replace(/\s+(?:and|while|where|after|because)\b.*$/i, "")
      .trim();
    caption = `Previously lived in ${destination}`;
  } else if (
    currentLivingDestination ||
    movedDestination ||
    livingDestination
  ) {
    const destination = (
      currentLivingDestination ||
      movedDestination ||
      livingDestination
    )!
      .replace(/\s+(?:and|while|where|after|because)\b.*$/i, "")
      .trim();
    caption = `${movedDestination ? "Moved to" : "Lives in"} ${destination}`;
  }
  caption = caption.replace(/^(?:you|i) have a goal of\s+/i, "");
  caption = caption.replace(/^(?:your goal is to|goal:)\s*/i, "");
  caption = caption
    .replace(/^(?:you|i) want to\s+/i, "")
    .replace(/^(?:you|i) hope to\s+/i, "")
    .replace(/^(?:you|i) aim to\s+/i, "")
    .replace(/^you live in\b/i, "Lives in")
    .replace(/^you moved to\b/i, "Moved to")
    .replace(/^you prefer\b/i, "Prefers")
    .replace(/^(.+?) is your close friend$/i, "Close friend")
    .replace(/^(.+?) is your friend$/i, "Friend")
    .replace(/^(.+?) is your close friend(?:\s|$)/i, "Close friend")
    .replace(/^(.+?) is a close friend(?:\s|$)/i, "Close friend")
    .replace(/^(.+?) has felt (.+?)( lately)?$/i, "$1 feels $2")
    .replace(/^(.+?) has been (.+?)( lately)?$/i, "$1 · $2")
    .replace(/^you recently moved to\b/i, "Moved to")
    .replace(/^prefers being listened to.*$/i, "Prefers listening")
    .replace(/\b(friend)and\b/gi, "$1 and")
    .replace(/\s+because .*/i, "")
    .replace(/^(the )?user\s+/i, "")
    .replace(/^(you|i) (?:have|has) a goal to\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (
    node.type === "fact" &&
    /\b(?:is your|is a|your)\s+(?:close\s+)?friend\b|\bclose friend\b/i.test(
      caption,
    )
  ) {
    caption = /\bclose friend\b/i.test(caption) ? "Close friend" : "Friend";
  }
  if (node.type === "person") {
    caption = caption
      .replace(/[,.· -]+(?:your |my )?(?:close )?friend\b.*$/i, "")
      .trim();
  }
  if (!caption) return node.label || node.type;
  const captionWords = caption.split(/\s+/);
  let wordCount = 0;
  let wordEnd = caption.length;
  for (const [index, word] of captionWords.entries()) {
    if (!/[\p{L}\p{N}]/u.test(word)) continue;
    wordCount += 1;
    if (wordCount === (isHistoricalResidence ? 4 : 3)) {
      wordEnd = captionWords.slice(0, index + 1).join(" ").length;
      break;
    }
  }
  caption = caption
    .slice(0, wordEnd)
    .replace(/[\s·,:;—-]+$/u, "")
    .trim();
  while (
    !isHistoricalResidence &&
    caption.split(/\s+/).length > 1 &&
    captionStopWords.has(caption.split(/\s+/).at(-1)!.toLowerCase())
  ) {
    caption = caption.split(/\s+/).slice(0, -1).join(" ");
  }
  return caption[0].toLocaleUpperCase() + caption.slice(1);
}

export function wrapNodeCaption(caption: string, maxLineLength = 22): string[] {
  const words = caption.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > maxLineLength) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function summarizeConversation(text: string, maxWords = 22): string {
  const sentence = text.trim().split(/(?<=[.!?])\s+/u, 1)[0] || text.trim();
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return sentence;
  return `${words
    .slice(0, maxWords)
    .join(" ")
    .replace(/[.,;:!?]+$/u, "")}…`;
}

export function categoryLabel(category: string): string {
  return categoryNames[category] || categoryNames.other;
}

export function groupMemoriesByCategory<
  N extends CategorizedNode,
  L extends CategorizedLink,
>(
  nodes: N[],
  links: L[],
): {
  nodes: Array<
    | N
    | (Omit<CategorizedNode, "type" | "category"> & {
        type: "category";
        category: N["category"];
      })
  >;
  links: Array<
    | L
    | (Omit<CategorizedLink, "type"> & {
        type: "HAS_CATEGORY" | "CONTAINS_CATEGORY";
      })
  >;
} {
  const categorizedNodes = nodes.map((node) => {
    if (
      node.category !== "other" ||
      !["fact", "goal", "procedure"].includes(node.type)
    ) {
      return node;
    }
    const category = inferMemoryCategory(
      node.label,
      typeof node.text === "string"
        ? node.text
        : typeof node.properties.text === "string"
          ? node.properties.text
          : undefined,
      typeof node.properties.episode_text === "string"
        ? node.properties.episode_text
        : undefined,
    );
    return { ...node, category };
  });
  const memories = categorizedNodes.filter((node) =>
    ["fact", "goal", "procedure"].includes(node.type),
  );
  const categories = [...new Set(memories.map((node) => node.category))];
  const categoryNodes = categories.map((category) => ({
    id: `category:${category}`,
    type: "category" as const,
    label: categoryLabel(category),
    category,
    properties: { category, synthetic: true },
  }));
  const memoryIds = new Set(memories.map((node) => node.id));
  const userId = categorizedNodes.find((node) => node.type === "user")?.id;
  const categoryLinks = categories.flatMap((category) => {
    const categoryId = `category:${category}`;
    const members = memories.filter((node) => node.category === category);
    return [
      ...(userId
        ? [
            {
              source: userId,
              target: categoryId,
              type: "HAS_CATEGORY" as const,
            },
          ]
        : []),
      ...members.map((node) => ({
        source: categoryId,
        target: node.id,
        type: "CONTAINS_CATEGORY" as const,
      })),
    ];
  });
  const retainedLinks = links.filter(
    (link) =>
      !(
        memoryIds.has(link.target) &&
        ["HAS_FACT", "HAS_GOAL"].includes(link.type)
      ),
  );
  return {
    nodes: [...categorizedNodes, ...categoryNodes],
    links: [...retainedLinks, ...categoryLinks],
  };
}

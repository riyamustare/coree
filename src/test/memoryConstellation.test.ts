import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MemoryConstellation,
  type ConstellationNode,
} from "@/components/calmi/MemoryConstellation";
import {
  groupMemoriesByCategory,
  inferMemoryCategory,
  nodeCaption,
  reconcileResidenceHistory,
  summarizeConversation,
  wrapNodeCaption,
} from "@/lib/memoryGraph";

function node(overrides: Partial<ConstellationNode> = {}): ConstellationNode {
  return {
    id: "memory-1",
    type: "fact",
    label: "Work has felt stressful lately",
    text: "Work has felt stressful lately. You talk with Aisha when it gets hard.",
    category: "work",
    properties: {},
    ...overrides,
  };
}

describe("nodeCaption", () => {
  it("uses a concise crafted memory label instead of the full description", () => {
    expect(
      nodeCaption(
        node({
          label:
            "Work has felt stressful lately. You talk with Aisha when it gets hard.",
          properties: { label: "Work · stressful" },
        }),
      ),
    ).toBe("Work · stressful");
  });

  it("keeps a short residence label conversational and compact", () => {
    expect(nodeCaption(node({ label: "You live in Bangalore" }))).toBe(
      "Lives in Bangalore",
    );
  });

  it("turns third-person goal text into a concise goal caption", () => {
    expect(
      nodeCaption(
        node({
          type: "goal",
          label: "The user has a goal of getting more sleep",
          text: "The user has a goal of getting more sleep",
        }),
      ),
    ).toBe("Getting more sleep");
  });

  it("converts third-person memories into direct address", () => {
    expect(
      nodeCaption(
        node({
          label: "The user recently moved to Bangalore",
          text: "The user recently moved to Bangalore",
        }),
      ),
    ).toBe("Moved to Bangalore");
  });

  it("uses the complete fact when the generated home label is cut off", () => {
    expect(
      nodeCaption(
        node({
          label: "Moving from your",
          text: "You moved from Bangalore to Pune and are settling in.",
          category: "home",
          properties: { label: "Moving from your", category: "home" },
        }),
      ),
    ).toBe("Moved to Pune");
  });

  it("keeps residence labels concise and reflects the current city", () => {
    expect(
      nodeCaption(
        node({
          label: "Home · residence",
          text: "You now live in Pune.",
          category: "home",
          properties: { label: "Home · residence", category: "home" },
        }),
      ),
    ).toBe("Lives in Pune");
  });

  it("uses the concise move label for a current residence change", () => {
    expect(
      nodeCaption(
        node({
          label: "Moved to Pune",
          text: "You now live in Pune.",
          category: "home",
          properties: { category: "home", label: "Moved to Pune" },
        }),
      ),
    ).toBe("Moved to Pune");
  });

  it("shows only the current city when a residence fact mentions a former home", () => {
    expect(
      nodeCaption(
        node({
          label: "Residence",
          text: "You used to live in Bangalore, and now you are living in Pune.",
          category: "home",
          properties: { category: "home" },
        }),
      ),
    ).toBe("Lives in Pune");
  });

  it("labels a superseded residence with the former city", () => {
    expect(
      nodeCaption(
        node({
          label: "Lives in Bangalore",
          text: "You lived in Bangalore.",
          category: "home",
          properties: { category: "home", valid_to: "2026-10-18T00:00:00Z" },
        }),
      ),
    ).toBe("Previously lived in Bangalore");
  });

  it("reduces a person fact to a clear relationship label", () => {
    expect(
      nodeCaption(
        node({
          label: "The user and Aisha",
          text: "Aisha is the user's close friend. You talk to her when work gets stressful.",
          properties: { label: "The user and Aisha" },
        }),
      ),
    ).toBe("Close friend");
  });

  it("keeps relationship descriptions out of person-node names", () => {
    expect(
      nodeCaption(
        node({
          type: "person",
          label: "Aisha, your close friend",
          text: "Aisha, your close friend",
          properties: { name: "Aisha, your close friend" },
        }),
      ),
    ).toBe("Aisha");
  });

  it("cleans up malformed friend memory labels", () => {
    expect(
      nodeCaption(
        node({
          label: "Close friendand important source",
          text: "Aisha is your close friend and an important source of support.",
        }),
      ),
    ).toBe("Close friend");
  });

  it("limits a long memory to a useful caption of at most three words", () => {
    const caption = nodeCaption(
      node({
        label: "A long, descriptive memory label",
        text: "You moved to Bangalore and are adjusting to a new routine there.",
      }),
    );
    expect(caption).toBe("Moved to Bangalore");
    expect(
      caption.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)),
    ).toHaveLength(3);
  });

  it("keeps a procedure label short and readable", () => {
    expect(
      nodeCaption(
        node({
          type: "procedure",
          label:
            "Prefers being listened to and validated before receiving advice",
          text: "You prefer being listened to and validated before receiving advice.",
        }),
      ),
    ).toBe("Prefers listening");
  });

  it("wraps a complete caption without truncating it", () => {
    const caption = "Prefers being listened to over getting advice";
    const lines = wrapNodeCaption(caption, 22);
    expect(lines.join(" ")).toBe(caption);
    expect(lines.every((line) => line.length <= 22)).toBe(true);
  });
});

describe("memory source details", () => {
  it("shows the source recap and date when a memory node is selected", async () => {
    render(
      createElement(MemoryConstellation, {
        nodes: [
          {
            id: "user:1",
            type: "user",
            label: "You",
            category: "other",
            properties: {},
          },
          node({
            id: "fact:pune",
            label: "Residence",
            text: "You now live in Pune.",
            category: "home",
            properties: {
              category: "home",
              episode_text: "You shared that you moved from Bangalore to Pune.",
              episode_date: "2026-10-18T00:00:00.000Z",
            },
          }),
        ],
        links: [],
        onForget: vi.fn(),
        onGoalStatus: vi.fn(),
      }),
    );

    const memoryNode = await screen.findByRole("button", {
      name: "memory: Lives in Pune",
    });
    fireEvent.click(memoryNode);

    expect(await screen.findByText("Where this came from")).toBeInTheDocument();
    expect(
      screen.getByText("You shared that you moved from Bangalore to Pune."),
    ).toBeInTheDocument();
    expect(screen.getByText("Session from 10/18/2026")).toBeInTheDocument();
  });
});

describe("residence history reconciliation", () => {
  it("moves the earlier legacy residence into history and links it to the current city", () => {
    const legacyFact = (id: string, city: string, validFrom: string) =>
      node({
        id,
        label: `Moved to ${city}`,
        text: `You moved to ${city}.`,
        category: "home",
        properties: { category: "home", valid_from: validFrom },
      });
    const oldHome = legacyFact(
      "old-home",
      "Bangalore",
      "2026-01-01T00:00:00.000Z",
    );
    const currentHome = legacyFact(
      "current-home",
      "Pune",
      "2026-10-18T00:00:00.000Z",
    );

    const graph = reconcileResidenceHistory(
      [oldHome, currentHome],
      [] as Array<{ source: string; target: string; type: string }>,
    );

    expect(graph.nodes.find(({ id }) => id === "old-home")?.properties.valid_to)
      .toBe("2026-10-18T00:00:00.000Z");
    expect(graph.links).toContainEqual({
      source: "current-home",
      target: "old-home",
      type: "SUPERSEDES",
    });
    expect(
      graph.nodes.filter((item) => item.properties.valid_to == null),
    ).toHaveLength(1);
  });

  it("restores a missing supersession edge for facts already marked historical", () => {
    const oldHome = node({
      id: "old-home",
      label: "Moved to Bangalore",
      text: "You moved to Bangalore.",
      category: "home",
      properties: {
        category: "home",
        valid_from: "2026-01-01T00:00:00.000Z",
        valid_to: "2026-10-18T00:00:00.000Z",
      },
    });
    const currentHome = node({
      id: "current-home",
      label: "Moved to Pune",
      text: "You moved to Pune.",
      category: "home",
      properties: {
        category: "home",
        valid_from: "2026-10-18T00:00:00.000Z",
      },
    });
    const graph = reconcileResidenceHistory(
      [oldHome, currentHome],
      [] as Array<{ source: string; target: string; type: string }>,
    );

    expect(graph.links).toContainEqual({
      source: "current-home",
      target: "old-home",
      type: "SUPERSEDES",
    });
  });
});

describe("groupMemoriesByCategory", () => {
  it("connects the user to category hubs and memories to their category", () => {
    const user = node({
      id: "user:1",
      type: "user",
      label: "You",
      category: "other",
      text: undefined,
    });
    const workFact = node({
      id: "fact:work",
      category: "work",
    });
    const relationshipFact = node({
      id: "fact:friend",
      category: "relationships",
      label: "Close friend",
    });
    const goal = node({
      id: "goal:sleep",
      type: "goal",
      category: "health",
      label: "Sleep earlier",
    });
    const graph = groupMemoriesByCategory(
      [user, workFact, relationshipFact, goal],
      [
        { source: user.id, target: workFact.id, type: "HAS_FACT" },
        { source: user.id, target: goal.id, type: "HAS_GOAL" },
      ],
    );

    expect(
      graph.nodes
        .filter((item) => item.type === "category")
        .map(({ id, label }) => ({ id, label })),
    ).toEqual([
      { id: "category:work", label: "Work" },
      { id: "category:relationships", label: "Relationships" },
      { id: "category:health", label: "Health" },
    ]);
    expect(graph.links).toEqual(
      expect.arrayContaining([
        {
          source: user.id,
          target: "category:work",
          type: "HAS_CATEGORY",
        },
        {
          source: "category:work",
          target: workFact.id,
          type: "CONTAINS_CATEGORY",
        },
        {
          source: "category:health",
          target: goal.id,
          type: "CONTAINS_CATEGORY",
        },
      ]),
    );
    expect(
      graph.links.some(
        ({ source, target }) =>
          source === user.id && (target === workFact.id || target === goal.id),
      ),
    ).toBe(false);
  });

  it("keeps other memory relationships intact", () => {
    const friendFact = node({ id: "fact:friend", category: "relationships" });
    const aisha = node({
      id: "person:aisha",
      type: "person",
      label: "Aisha",
      text: undefined,
    });
    const relation = {
      source: friendFact.id,
      target: aisha.id,
      type: "ABOUT" as const,
    };
    expect(
      groupMemoriesByCategory(
        [
          node({
            id: "user:1",
            type: "user",
            label: "You",
            text: undefined,
          }),
          friendFact,
          aisha,
        ],
        [relation],
      ).links,
    ).toContain(relation);
  });

  it("recategorizes seeded legacy memories from their content", () => {
    const legacyNodes = [
      node({
        id: "work",
        label: "Work has felt stressful",
        text: "Work has felt stressful because of overlapping deadlines.",
        category: "other",
      }),
      node({
        id: "aisha",
        label: "Close friendand important source",
        text: "Aisha is your close friend and an important source of support.",
        category: "other",
      }),
      node({
        id: "sleep",
        type: "goal",
        label: "Get to bed",
        text: "You want to get to bed before 11:30 pm.",
        category: "other",
      }),
      node({
        id: "city",
        label: "Moved to Bangalore",
        text: "You recently moved to Bangalore and are adjusting to a new routine.",
        category: "other",
      }),
      node({
        id: "preference",
        type: "procedure",
        label: "Prefers listening",
        text: "You prefer being listened to before receiving advice.",
        category: "other",
      }),
    ];
    const graph = groupMemoriesByCategory(
      [
        node({
          id: "user:1",
          type: "user",
          label: "You",
          text: undefined,
        }),
        ...legacyNodes,
      ],
      [],
    );

    expect(
      legacyNodes.map(
        ({ id }) => graph.nodes.find((item) => item.id === id)?.category,
      ),
    ).toEqual(["work", "relationships", "health", "home", "preferences"]);
  });
});

describe("inferMemoryCategory", () => {
  it.each([
    ["Work has felt stressful due to deadlines", "work"],
    ["Aisha is a close friend and source of support", "relationships"],
    ["I want to get to bed earlier", "health"],
    ["I recently moved to Bangalore", "home"],
    ["I prefer concise, gentle replies", "preferences"],
  ])("infers %s as %s", (text, expectedCategory) => {
    expect(inferMemoryCategory(text)).toBe(expectedCategory);
  });

  it("leaves unclassifiable memories in other", () => {
    expect(inferMemoryCategory("A quiet Sunday afternoon")).toBe("other");
  });
});

describe("summarizeConversation", () => {
  it("uses the first sentence as a conversation summary", () => {
    expect(
      summarizeConversation(
        "Work was stressful this week. I talked to Aisha about it.",
      ),
    ).toBe("Work was stressful this week.");
  });

  it("keeps long conversation summaries within the word limit", () => {
    const summary = summarizeConversation(
      "I moved to Bangalore and started a new job while trying to settle into a new routine and find time to rest.",
      8,
    );
    expect(summary).toBe("I moved to Bangalore and started a new…");
    expect(summary.replace(/…$/u, "").split(/\s+/)).toHaveLength(8);
  });
});

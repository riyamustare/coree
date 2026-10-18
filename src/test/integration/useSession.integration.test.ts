import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import { toast } from "@/hooks/use-toast";

const deleteCalls: string[] = [];

describe("chat API integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCalls.length = 0;

    vi.mocked(supabase.from).mockImplementation((table) => {
      const query = {
        delete: vi.fn().mockImplementation(() => {
          deleteCalls.push(table);
          return {
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      if (table === "sessions") {
        const sessionQuery = {
          ...query,
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "session-test" }, error: null }),
        };
        return sessionQuery as never;
      }

      return {
        ...query,
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as never;
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        text: "that sounds like a lot to carry. what has felt hardest today?",
      },
      error: null,
    } as never);
  });

  it("creates a session, invokes chat, and adds the response to the conversation", async () => {
    const { result } = renderHook(() => useSession("user-test"));
    let sessionId: string | null = null;

    await act(async () => {
      sessionId = await result.current.startSession("text");
    });
    expect(sessionId).toBe("session-test");

    await act(async () => {
      await result.current.sendMessage("I've had a stressful day.");
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith("chat", {
      body: {
        message: "I've had a stressful day.",
        sessionId: "session-test",
        contextMessages: [],
        genzMode: false,
      },
    });
    expect(
      result.current.messages.map(({ role, content }) => [role, content]),
    ).toEqual([
      ["user", "I've had a stressful day."],
      [
        "assistant",
        "that sounds like a lot to carry. what has felt hardest today?",
      ],
    ]);
  });

  it("keeps a session with two user messages in history", async () => {
    const { result } = renderHook(() => useSession("user-test"));

    await act(async () => {
      await result.current.startSession("text");
    });
    await act(async () => {
      await result.current.sendMessage("I moved to Pune.");
      await result.current.sendMessage("I am settling in.");
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { summary: "You shared that you moved to Pune and are settling in." },
      error: null,
    } as never);

    let summary: Awaited<ReturnType<typeof result.current.endSession>> = null;
    await act(async () => {
      summary = await result.current.endSession();
    });

    expect(supabase.functions.invoke).toHaveBeenLastCalledWith("end-session", {
      body: { sessionId: "session-test" },
    });
    expect(deleteCalls).toEqual([]);
    expect(summary?.messages).toHaveLength(4);
    expect(summary?.summary).toContain("moved to Pune");
  });

  it("ignores a chat response after the authenticated user changes", async () => {
    let resolveChat:
      | ((value: { data: { text: string }; error: null }) => void)
      | undefined;
    vi.mocked(supabase.functions.invoke).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        }) as never,
    );

    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) => useSession(userId),
      { initialProps: { userId: "user-test" } },
    );

    await act(async () => {
      await result.current.startSession("text");
    });

    let sendMessagePromise: Promise<void>;
    act(() => {
      sendMessagePromise = result.current.sendMessage("A private message.");
    });
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "chat",
        expect.any(Object),
      );
    });

    rerender({ userId: "another-user" });
    resolveChat?.({ data: { text: "A private response." }, error: null });

    await act(async () => {
      await sendMessagePromise;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("shows the chat function's actionable error message", async () => {
    const functionError = Object.assign(new Error("Edge Function failed"), {
      context: new Response(
        JSON.stringify({
          error: "The AI service is temporarily unavailable. Please try again.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: functionError,
    } as never);

    const { result } = renderHook(() => useSession("user-test"));
    await act(async () => {
      await result.current.startSession("text");
    });
    await act(async () => {
      await result.current.sendMessage("I had a difficult day.");
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Response interrupted",
        description:
          "The AI service is temporarily unavailable. Please try again.",
      }),
    );
  });
});

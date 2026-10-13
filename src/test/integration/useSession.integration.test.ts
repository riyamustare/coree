import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

describe("chat API integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === "sessions") {
        const query = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "session-test" }, error: null }),
        };
        return query as never;
      }

      return {
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
});

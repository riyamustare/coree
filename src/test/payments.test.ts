import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSubscription } from "@/hooks/useSubscription";
import { startProCheckout } from "@/lib/payments";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

describe("paused payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not invoke checkout while payments are disabled", async () => {
    await expect(startProCheckout()).resolves.toEqual({
      error: "Payments are temporarily unavailable.",
    });
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("allows voice sessions without subscription or usage queries", async () => {
    const { result } = renderHook(() => useSubscription("user-test"));

    await act(async () => {
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    expect(result.current.canStartVoice).toBe(true);
    expect(result.current.isPro).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

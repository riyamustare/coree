import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVoice } from "@/hooks/useVoice";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/analytics", () => ({
  trackTtsPlayed: vi.fn(),
  trackVoiceListenStart: vi.fn(),
  trackVoiceListenStop: vi.fn(),
  trackVoiceStageLatency: vi.fn(),
}));

import { toast } from "@/hooks/use-toast";

class MockRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: never) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

describe("useVoice listening lifecycle", () => {
  let getUserMedia: ReturnType<typeof vi.fn>;
  let recognitions: MockRecognition[];

  beforeEach(() => {
    vi.clearAllMocks();
    recognitions = [];
    getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: class extends MockRecognition {
        constructor() {
          super();
          recognitions.push(this);
        }
      },
    });
  });

  it("clears listening state and reports audio-capture failures", async () => {
    const { result } = renderHook(() => useVoice());
    let listening: Promise<string | null> = Promise.resolve(null);

    act(() => {
      listening = result.current.startListening("session-test");
    });
    await waitFor(() => expect(recognitions).toHaveLength(1));

    act(() => {
      recognitions[0].onerror?.({ error: "audio-capture" });
    });

    await expect(listening).resolves.toBeNull();
    expect(result.current.isListening).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Microphone unavailable",
        variant: "destructive",
      }),
    );
  });

  it("stops listening immediately when the mic toggle is pressed", async () => {
    const { result } = renderHook(() => useVoice());
    let listening: Promise<string | null> = Promise.resolve(null);

    act(() => {
      listening = result.current.startListening("session-test");
    });
    expect(result.current.isListening).toBe(true);

    await act(async () => {
      await result.current.stopListening();
      recognitions[0].onend?.();
    });

    await expect(listening).resolves.toBeNull();
    expect(result.current.isListening).toBe(false);
    expect(recognitions[0].stop).toHaveBeenCalledOnce();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("settles an older listen request before starting another", async () => {
    const { result } = renderHook(() => useVoice());
    let firstListening: Promise<string | null> = Promise.resolve(null);

    act(() => {
      firstListening = result.current.startListening("session-test");
    });
    const firstRecognition = recognitions[0];

    act(() => {
      void result.current.startListening("session-test");
    });

    await expect(firstListening).resolves.toBeNull();
    expect(firstRecognition.stop).toHaveBeenCalledOnce();
    expect(recognitions).toHaveLength(2);
    expect(result.current.isListening).toBe(true);
  });
});

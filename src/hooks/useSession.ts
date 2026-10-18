import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  trackDay7Return,
  trackSessionCompleted,
  trackVoiceStageLatency,
} from "@/lib/analytics";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  memoryTrace?: string[];
}

export interface SessionSummary {
  summary: string;
  messageCount: number;
  duration: number; // seconds
  endedAt: string;
  emotions?: Record<string, number> | null;
  messages?: ChatMessage[];
}

async function getFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (
    typeof error !== "object" ||
    error === null ||
    !("context" in error) ||
    !(error.context instanceof Response)
  ) {
    return null;
  }

  try {
    const payload: unknown = await error.context.clone().json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }
  } catch {
    return null;
  }
  return null;
}

export function useSession(userId: string | undefined) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const activeModeRef = useRef<"text" | "voice">("text");
  const userIdRef = useRef(userId);
  const activeSessionIdRef = useRef<string | null>(null);

  if (userIdRef.current !== userId) {
    userIdRef.current = userId;
    activeSessionIdRef.current = null;
  }

  const isCurrentSession = useCallback(
    (requestUserId: string, requestSessionId: string) =>
      userIdRef.current === requestUserId &&
      activeSessionIdRef.current === requestSessionId,
    [],
  );

  const maybeTrackDay7Return = useCallback((currentSessionId?: string) => {
    if (!userId || typeof window === "undefined") return;
    const now = Date.now();
    const STORAGE_KEY = "core_last_session_at";
    const lastSeen = Number(window.localStorage.getItem(STORAGE_KEY) || "0");
    if (lastSeen > 0) {
      const daysSinceLastSession = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSession >= 7) {
        trackDay7Return(daysSinceLastSession, currentSessionId);
      }
    }
    window.localStorage.setItem(STORAGE_KEY, String(now));
  }, [userId]);

  // Reset all session state when the authenticated user changes
  // (sign in/out, switching accounts) to avoid bleeding state across users.
  useEffect(() => {
    activeSessionIdRef.current = null;
    setSessionId(null);
    setSessionStart(null);
    setMessages([]);
    setIsLoading(false);
  }, [userId]);

  const startSession = useCallback(async (mode: "text" | "voice" = "text"): Promise<string | null> => {
    if (!userId) return null;
    activeModeRef.current = mode;
    const { data, error } = await supabase
      .from("sessions")
      .insert({ user_id: userId, mode })
      .select("id")
      .single();
    if (userIdRef.current !== userId) return null;
    if (error) {
      console.error("Failed to create session:", error);
      toast({
        title: "Could not start the conversation",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return null;
    }
    activeSessionIdRef.current = data.id;
    setSessionId(data.id);
    setSessionStart(new Date());
    setMessages([]);
    maybeTrackDay7Return(data.id);
    return data.id;
  }, [userId, maybeTrackDay7Return]);

  const endSession = useCallback(async (): Promise<SessionSummary | null> => {
    const requestUserId = userId;
    const requestSessionId = sessionId;
    if (
      !requestUserId ||
      !requestSessionId ||
      !isCurrentSession(requestUserId, requestSessionId)
    ) {
      return null;
    }

    const duration = sessionStart
      ? Math.floor((Date.now() - sessionStart.getTime()) / 1000)
      : 0;
    const messageCount = messages.length;

    const endedAt = new Date().toISOString();

    // Summarize session via edge function
    try {
      const { data, error } = await supabase.functions.invoke("end-session", {
        body: { sessionId },
      });
      if (error) throw error;
      if (!isCurrentSession(requestUserId, requestSessionId)) return null;

      let sessionData: { summary: string | null; emotions: unknown } | null =
        null;
      if (typeof data?.summary !== "string") {
        const { data: savedSession, error: fetchError } = await supabase
          .from("sessions")
          .select("summary, emotions")
          .eq("id", sessionId)
          .single();
        if (fetchError) throw fetchError;
        sessionData = savedSession;
        if (!isCurrentSession(requestUserId, requestSessionId)) return null;
      }

      const summary =
        (typeof data?.summary === "string" && data.summary) ||
        sessionData?.summary ||
        "You took a moment to reflect today. That matters.";
      const emotions =
        (data?.emotions as Record<string, number> | null) ||
        (sessionData?.emotions as Record<string, number> | null) ||
        null;
      if (data?.summaryGenerated === false) {
        toast({
          title: "A simple recap was used",
          description:
            "The conversation was saved, but a personalized recap could not be generated.",
          variant: "destructive",
        });
      }

      activeSessionIdRef.current = null;
      setSessionId(null);
      setSessionStart(null);
      setMessages([]);
      trackSessionCompleted(sessionId, duration, messageCount, activeModeRef.current);

      return {
        summary,
        messageCount,
        duration,
        endedAt,
        emotions,
        messages,
      };
    } catch (err) {
      if (!isCurrentSession(requestUserId, requestSessionId)) return null;
      console.error("Failed to end session:", err);
      toast({
        title: "Could not save session insights",
        description: "Your messages remain saved, but the summary and memory may be incomplete.",
        variant: "destructive",
      });
      activeSessionIdRef.current = null;
      setSessionId(null);
      setSessionStart(null);
      setMessages([]);
      trackSessionCompleted(sessionId, duration, messageCount, activeModeRef.current);
      return {
        summary: "You took a moment to reflect today. That matters.",
        messageCount,
        duration,
        endedAt,
        emotions: null,
        messages,
      };
    }
  }, [sessionId, sessionStart, messages, userId, isCurrentSession]);

  const sendMessage = useCallback(
    async (content: string, genzMode: boolean = false): Promise<void> => {
      if (
        !sessionId ||
        !userId ||
        !isCurrentSession(userId, sessionId)
      ) {
        return;
      }
      const requestUserId = userId;
      const requestSessionId = sessionId;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const { error: messageError } = await supabase.from("messages").insert({
          session_id: sessionId,
          user_id: userId,
          role: "user",
          content,
        });
        if (messageError) throw messageError;
        if (!isCurrentSession(requestUserId, requestSessionId)) return;

        const recentExchanges = messages.slice(-10);
        const contextMessages = recentExchanges.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const llmStart = performance.now();
        const { data, error } = await supabase.functions.invoke("chat", {
          body: {
            message: content,
            sessionId,
            contextMessages,
            genzMode,
          },
        });
        if (error) throw error;
        if (!isCurrentSession(requestUserId, requestSessionId)) return;
        const llmLatencyMs = Math.round(performance.now() - llmStart);
        trackVoiceStageLatency("llm", llmLatencyMs, sessionId, activeModeRef.current);

        const assistantContent = typeof data?.text === "string" ? data.text.trim() : "";
        if (!assistantContent) throw new Error("The response was empty");

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantContent,
            memoryTrace: Array.isArray(data?.memoryTrace)
              ? data.memoryTrace.filter((id: unknown): id is string => typeof id === "string")
              : [],
          },
        ]);

        if (assistantContent) {
          const { error: assistantSaveError } = await supabase.from("messages").insert({
            session_id: sessionId,
            user_id: userId,
            role: "assistant",
            content: assistantContent,
            memory_trace: Array.isArray(data?.memoryTrace) ? data.memoryTrace : [],
          });
          if (!isCurrentSession(requestUserId, requestSessionId)) return;
          if (assistantSaveError) {
            console.error("Could not persist assistant reply and memory trace:", assistantSaveError);
            toast({
              title: "Reply could not be saved",
              description: "This response may not appear in history or its memory explanation.",
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        if (!isCurrentSession(requestUserId, requestSessionId)) return;
        console.error("Chat error:", err);
        const functionError = await getFunctionErrorMessage(err);
        if (!isCurrentSession(requestUserId, requestSessionId)) return;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I'm having trouble responding right now. Please try again.",
          },
        ]);
        toast({
          title: "Response interrupted",
          description:
            functionError ||
            "Your message is safe. Please try sending it again.",
          variant: "destructive",
        });
      } finally {
        if (isCurrentSession(requestUserId, requestSessionId)) {
          setIsLoading(false);
        }
      }
    },
    [sessionId, userId, messages, isCurrentSession]
  );

  return {
    sessionId,
    sessionStart,
    messages,
    isLoading,
    startSession,
    endSession,
    sendMessage,
    setMessages,
  };
}
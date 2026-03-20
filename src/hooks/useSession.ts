import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as events from "@/lib/events";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface SessionSummary {
  summary: string;
  messageCount: number;
  duration: number; // seconds
}

export function useSession(userId: string | undefined) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const startSession = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("sessions")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error) {
      console.error("Failed to create session:", error);
      return;
    }
    events.sessionStarted(data.id);
    setSessionId(data.id);
    setSessionStart(new Date());
    setMessages([]);
  }, [userId]);

  const endSession = useCallback(async (): Promise<SessionSummary | null> => {
    if (!sessionId) return null;

    const duration = sessionStart
      ? Math.floor((Date.now() - sessionStart.getTime()) / 1000)
      : 0;
    const messageCount = messages.length;

    try {
      const { data } = await supabase.functions.invoke("end-session", {
        body: { sessionId },
      });

      const { data: sessionData } = await supabase
        .from("sessions")
        .select("summary")
        .eq("id", sessionId)
        .single();

      const summary = sessionData?.summary || "You took a moment to reflect today. That matters.";

      events.sessionEnded(sessionId, duration);
      events.sessionSummaryReceived(sessionId);

      setSessionId(null);
      setSessionStart(null);
      setMessages([]);

      return { summary, messageCount, duration };
    } catch (err) {
      console.error("Failed to end session:", err);
      events.sessionEnded(sessionId, duration);
      setSessionId(null);
      setSessionStart(null);
      setMessages([]);
      return { summary: "You took a moment to reflect today. That matters.", messageCount, duration };
    }
  }, [sessionId, sessionStart, messages.length]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!sessionId || !userId) return;

      events.messageSent(sessionId);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        await supabase.from("messages").insert({
          session_id: sessionId,
          user_id: userId,
          role: "user",
          content,
        });

        const recentExchanges = messages.slice(-10);
        const contextMessages = recentExchanges.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: content,
            sessionId,
            contextMessages,
          }),
        });

        if (!resp.ok || !resp.body) {
          throw new Error("Failed to get response");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) =>
                      i === prev.length - 1
                        ? { ...m, content: assistantContent }
                        : m
                    );
                  }
                  return [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: assistantContent,
                    },
                  ];
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        if (assistantContent) {
          events.responseReceived(sessionId);
          await supabase.from("messages").insert({
            session_id: sessionId,
            user_id: userId,
            role: "assistant",
            content: assistantContent,
          });
        }
      } catch (err) {
        console.error("Chat error:", err);
        events.responseFailed(sessionId);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I'm having trouble responding right now. Please try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, userId, messages]
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

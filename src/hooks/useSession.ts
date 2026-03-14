import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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
    setSessionId(data.id);
    setSessionStart(new Date());
    setMessages([]);
  }, [userId]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;

    // Summarize session via edge function
    try {
      await supabase.functions.invoke("end-session", {
        body: { sessionId },
      });
    } catch (err) {
      console.error("Failed to end session:", err);
    }

    setSessionId(null);
    setSessionStart(null);
    setMessages([]);
  }, [sessionId]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!sessionId || !userId) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Save user message
        await supabase.from("messages").insert({
          session_id: sessionId,
          user_id: userId,
          role: "user",
          content,
        });

        // Get last 5 exchanges for context
        const recentExchanges = messages.slice(-10);
        const contextMessages = recentExchanges.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Stream response from edge function
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

        // Save assistant message
        if (assistantContent) {
          await supabase.from("messages").insert({
            session_id: sessionId,
            user_id: userId,
            role: "assistant",
            content: assistantContent,
          });
        }
      } catch (err) {
        console.error("Chat error:", err);
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

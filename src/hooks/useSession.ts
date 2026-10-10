import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface SessionSummary {
  summary: string;
  messageCount: number;
  duration: number; // seconds
  endedAt: string;
  emotions?: Record<string, number> | null;
  messages?: ChatMessage[];
}

export function useSession(userId: string | undefined) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset all session state when the authenticated user changes
  // (sign in/out, switching accounts) to avoid bleeding state across users.
  useEffect(() => {
    setSessionId(null);
    setSessionStart(null);
    setMessages([]);
    setIsLoading(false);
  }, [userId]);

  const startSession = useCallback(async (mode: "text" | "voice" = "text"): Promise<string | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("sessions")
      .insert({ user_id: userId, mode })
      .select("id")
      .single();
    if (error) {
      console.error("Failed to create session:", error);
      toast({
        title: "Could not start the conversation",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return null;
    }
    setSessionId(data.id);
    setSessionStart(new Date());
    setMessages([]);
    return data.id;
  }, [userId]);

  const endSession = useCallback(async (): Promise<SessionSummary | null> => {
    if (!sessionId) return null;

    const duration = sessionStart
      ? Math.floor((Date.now() - sessionStart.getTime()) / 1000)
      : 0;
    const userMessageCount = messages.filter((m) => m.role === "user").length;
    const messageCount = messages.length;

    // Save the session in history only when the user has 4+ messages
    // (a proper back-and-forth). Otherwise drop it silently - no time limit.
    const endedAt = new Date().toISOString();

    if (userMessageCount < 4) {
      await supabase.from("messages").delete().eq("session_id", sessionId);
      await supabase.from("sessions").delete().eq("id", sessionId);
      setSessionId(null);
      setSessionStart(null);
      setMessages([]);
      return {
        summary: "Session was too short to save - chat a bit more next time to save it.",
        messageCount,
        duration,
        endedAt,
        emotions: null,
        messages: [],
      };
    }

    // Summarize session via edge function
    try {
      const { data } = await supabase.functions.invoke("end-session", {
        body: { sessionId },
      });

      // Fetch the updated session to get summary and emotions
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("summary, emotions")
        .eq("id", sessionId)
        .single();

      const summary = sessionData?.summary || "You took a moment to reflect today. That matters.";
      const emotions = (sessionData?.emotions as Record<string, number> | null) || null;

      setSessionId(null);
      setSessionStart(null);
      setMessages([]);

      return {
        summary,
        messageCount,
        duration,
        endedAt,
        emotions,
        messages,
      };
    } catch (err) {
      console.error("Failed to end session:", err);
      setSessionId(null);
      setSessionStart(null);
      setMessages([]);
      return {
        summary: "You took a moment to reflect today. That matters.",
        messageCount,
        duration,
        endedAt,
        emotions: null,
        messages,
      };
    }
  }, [sessionId, sessionStart, messages]);

  const sendMessage = useCallback(
    async (content: string, genzMode: boolean = false): Promise<void> => {
      if (!sessionId || !userId) return;

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

        const recentExchanges = messages.slice(-10);
        const contextMessages = recentExchanges.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { data, error } = await supabase.functions.invoke("chat", {
          body: {
            message: content,
            sessionId,
            contextMessages,
            genzMode,
          },
        });
        if (error) throw error;
        const assistantContent = typeof data?.text === "string" ? data.text.trim() : "";
        if (!assistantContent) throw new Error("The response was empty");

        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: assistantContent },
        ]);

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
        toast({
          title: "Response interrupted",
          description: "Your message is safe. Please try sending it again.",
          variant: "destructive",
        });
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
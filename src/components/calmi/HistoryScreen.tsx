import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackScreenViewed, trackHistoryOpened } from "@/lib/analytics";

interface PastSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface HistoryScreenProps {
  userId: string;
  onBack: () => void;
  initialSessionId?: string | null;
}

export function HistoryScreen({ userId, onBack, initialSessionId }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<PastSession | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    trackScreenViewed("history");
    const fetchAll = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, started_at, ended_at, summary")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false });

      if (data) {
        const filtered = data.filter((s) => {
          if (!s.ended_at || !s.started_at) return false;
          const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          return duration > 5 * 60 * 1000;
        });
        setSessions(filtered);

        // Auto-open if initialSessionId provided
        if (initialSessionId) {
          const target = filtered.find((s) => s.id === initialSessionId);
          if (target) openSession(target);
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, [userId, initialSessionId]);

  const openSession = async (session: PastSession) => {
    setSelectedSession(session);
    setChatLoading(true);
    trackHistoryOpened(session.id);
    const { data } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    setChatLog(data || []);
    setChatLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDuration = (start: string, end: string) => {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${mins} min`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (selectedSession) {
    return (
      <div className="flex min-h-screen flex-col bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-sm flex-1">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedSession(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-soft transition hover:shadow-active"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{formatDate(selectedSession.started_at)}</p>
              {selectedSession.ended_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(selectedSession.started_at, selectedSession.ended_at)}
                </p>
              )}
            </div>
          </div>

          {selectedSession.summary && (
            <div className="rounded-2xl bg-primary/5 border border-primary/10 px-5 py-4 mb-4">
              <p className="text-xs font-medium text-primary mb-1.5">Summary</p>
              <p className="text-sm text-foreground leading-relaxed">{selectedSession.summary}</p>
            </div>
          )}

          <div className="space-y-2.5">
            {chatLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 rounded-full bg-primary/20 animate-breathe" />
              </div>
            ) : chatLog.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No messages found</p>
            ) : (
              chatLog.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary/10 ml-8"
                      : "bg-surface shadow-soft mr-8"
                  }`}
                >
                  <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.created_at)}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-sm flex-1">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-soft transition hover:shadow-active"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-lg font-medium tracking-tight text-foreground">
            All conversations
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 rounded-full bg-primary/20 animate-breathe" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, i) => (
              <motion.button
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => openSession(session)}
                className="w-full text-left rounded-2xl bg-surface px-5 py-4 shadow-soft hover:shadow-active transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground line-clamp-2 flex-1">
                    {session.summary || "A moment of reflection"}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(session.started_at)}
                  </span>
                  {session.ended_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(session.started_at, session.ended_at)}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

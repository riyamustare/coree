import { motion } from "framer-motion";
import { ArrowLeft, Clock, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PastSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

interface HistoryScreenProps {
  userId: string;
  onBack: () => void;
}

export function HistoryScreen({ userId, onBack }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      }
      setLoading(false);
    };
    fetchAll();
  }, [userId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDuration = (start: string, end: string) => {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${mins} min`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-sm flex-1">
        {/* Header */}
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
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="rounded-2xl bg-surface px-5 py-4 shadow-soft"
              >
                <p className="text-sm text-foreground line-clamp-2">
                  {session.summary || "A moment of reflection"}
                </p>
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

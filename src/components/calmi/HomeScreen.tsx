import { motion } from "framer-motion";
import { MessageSquare, LogOut, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PastSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

interface HomeScreenProps {
  onStartConversation: () => void;
  onSignOut: () => void;
  userId: string;
}

export function HomeScreen({ onStartConversation, onSignOut, userId }: HomeScreenProps) {
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, started_at, ended_at, summary")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(20);

      if (data) {
        // Filter to sessions > 5 minutes
        const filtered = data.filter((s) => {
          if (!s.ended_at || !s.started_at) return false;
          const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          return duration > 5 * 60 * 1000;
        });
        setPastSessions(filtered);
      }
    };
    fetchSessions();
  }, [userId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDuration = (start: string, end: string) => {
    const mins = Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 60000
    );
    return `${mins} min`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-sm flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
          >
            <div className="h-8 w-8 rounded-full bg-primary shadow-[0_0_30px_rgba(34,197,94,0.2)]" />
          </motion.div>

          {/* Greeting */}
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {greeting}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Take a moment whenever you're ready.
          </p>

          {/* Start button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={onStartConversation}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-surface px-8 py-4 shadow-soft transition-all duration-200 hover:shadow-active active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-base font-medium text-foreground">Start a conversation</p>
              <p className="text-xs text-muted-foreground">Text or voice — your choice</p>
            </div>
          </motion.button>
        </motion.div>

        {/* Past sessions */}
        {pastSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10"
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              Past conversations
            </h2>
            <div className="space-y-2">
              {pastSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 + i * 0.05 }}
                  className="rounded-2xl bg-surface px-5 py-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground line-clamp-2 flex-1">
                      {session.summary || "A moment of reflection"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {session.ended_at && formatDuration(session.started_at, session.ended_at)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {formatDate(session.started_at)}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sign out */}
        <div className="mt-8 text-center">
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

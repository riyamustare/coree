import { motion } from "framer-motion";
import { MessageSquare, LogOut, Clock, ChevronRight, BarChart2, MessageCircleHeart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackModal } from "./FeedbackModal";
import { trackScreenViewed, trackHistoryOpened } from "@/lib/analytics";

interface PastSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

interface HomeScreenProps {
  onStartConversation: () => void;
  onSignOut: () => void;
  onViewHistory: () => void;
  onViewInsights: () => void;
  onOpenSession: (sessionId: string) => void;
  userId: string;
}

export function HomeScreen({ onStartConversation, onSignOut, onViewHistory, onViewInsights, onOpenSession, userId }: HomeScreenProps) {
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    trackScreenViewed("home");
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, started_at, ended_at, summary")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(5);

      if (data) {
        setPastSessions(data);
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

  const handleSessionClick = (sessionId: string) => {
    trackHistoryOpened(sessionId);
    onOpenSession(sessionId);
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
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
          >
            <div className="h-8 w-8 rounded-full bg-primary shadow-[0_0_30px_rgba(34,197,94,0.2)]" />
          </motion.div>

          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {greeting}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Take a moment whenever you're ready.
          </p>

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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8 flex gap-3"
        >
          <button
            onClick={onViewInsights}
            className="flex-1 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-soft transition hover:shadow-active"
          >
            <BarChart2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Insights</span>
          </button>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex-1 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-soft transition hover:shadow-active"
          >
            <MessageCircleHeart className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Feedback</span>
          </button>
        </motion.div>

        {/* Past sessions - always show section, min 3 cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-medium text-muted-foreground">
              Past conversations
            </h2>
            {pastSessions.length > 0 && (
              <button
                onClick={onViewHistory}
                className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition"
              >
                See all
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {pastSessions.length === 0 ? (
              // Show 3 placeholder cards
              Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={`placeholder-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 + i * 0.05 }}
                  className="rounded-2xl bg-surface px-5 py-4 shadow-soft opacity-50"
                >
                  <p className="text-sm text-muted-foreground italic">No conversation yet</p>
                  <p className="text-xs text-muted-foreground mt-1.5">—</p>
                </motion.div>
              ))
            ) : (
              // Show actual sessions, pad to min 3
              Array.from({ length: Math.max(3, pastSessions.length) }).map((_, i) => {
                const session = pastSessions[i];
                if (!session) {
                  return (
                    <motion.div
                      key={`placeholder-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.45 + i * 0.05 }}
                      className="rounded-2xl bg-surface px-5 py-4 shadow-soft opacity-50"
                    >
                      <p className="text-sm text-muted-foreground italic">No conversation yet</p>
                      <p className="text-xs text-muted-foreground mt-1.5">—</p>
                    </motion.div>
                  );
                }
                return (
                  <motion.button
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.45 + i * 0.05 }}
                    onClick={() => handleSessionClick(session.id)}
                    className="w-full text-left rounded-2xl bg-surface px-5 py-4 shadow-soft hover:shadow-active transition-shadow"
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
                  </motion.button>
                );
              })
            )}
          </div>
        </motion.div>

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

      <FeedbackModal userId={userId} open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

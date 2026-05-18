import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalmiShell } from "./CalmiShell";
import { trackScreenViewed, trackHistoryOpened } from "@/lib/analytics";

interface PastSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

interface HomeScreenProps {
  onStartConversation: (mode: "text" | "voice") => void;
  onSignOut: () => void;
  onViewHistory: () => void;
  onViewInsights: () => void;
  onOpenSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  onOpenNotes: () => void;
  onGoHome: () => void;
  userId: string;
  genzMode: boolean;
  onGenzToggle: (enabled: boolean) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

export function HomeScreen({ onStartConversation, onSignOut, onViewHistory, onViewInsights, onOpenSession, onOpenSettings, onOpenNotes, onGoHome, userId, genzMode, onGenzToggle, theme, onThemeToggle }: HomeScreenProps) {
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);

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
        .limit(30);

      if (data) {
        const filtered = data.filter((s) => {
          if (!s.ended_at || !s.started_at) return false;
          const duration =
            new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          return duration > 5 * 60 * 1000;
        });
        setPastSessions(filtered.slice(0, 5));
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
    <CalmiShell
      userId={userId}
      genzMode={genzMode}
      onGenzToggle={onGenzToggle}
      onGoHome={onGoHome}
      onViewInsights={onViewInsights}
      onViewHistory={onViewHistory}
      onOpenNotes={onOpenNotes}
      onOpenSettings={onOpenSettings}
      onSignOut={onSignOut}
      theme={theme}
      onThemeToggle={onThemeToggle}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0">
            <img
              src="/logo-icon.svg"
              alt="coree"
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
            {greeting}?
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md space-y-3 px-1"
        >
          <button
            onClick={() => onStartConversation("voice")}
            className="w-full rounded-xl border border-gray-200 bg-white p-4 sm:p-5 text-left hover:border-gray-300 hover:shadow-md transition-all group active:scale-[0.99]"
          >
            <p className="text-sm font-medium text-gray-900 group-hover:text-gray-950">
              voice mode
            </p>
            <p className="text-xs text-gray-500 mt-1">in the mood to talk?</p>
          </button>

          <button
            onClick={() => onStartConversation("text")}
            className="w-full rounded-xl border border-gray-200 bg-white p-4 sm:p-5 text-left hover:border-gray-300 hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-gray-950">
                text mode
              </p>
              <p className="text-xs text-gray-500 mt-1">not in the talking mood?</p>
            </div>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md mt-8 sm:mt-12 px-1"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600">history</h2>
            {pastSessions.length > 0 && (
              <button
                onClick={onViewHistory}
                className="flex items-center gap-1 text-xs font-medium text-[#277BD9] hover:text-[#2e90ff] transition"
              >
                See all
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {pastSessions.length === 0 ? (
              <div className="rounded-lg bg-white border border-gray-200 px-4 py-4 text-center">
                <p className="text-xs text-gray-600">start a conversation to see it here</p>
              </div>
            ) : (
              pastSessions.slice(0, 3).map((session, i) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                  onClick={() => handleSessionClick(session.id)}
                  className="w-full text-left rounded-lg bg-white px-3 py-2 border border-gray-200 hover:border-gray-300 transition-all text-xs"
                >
                  <p className="text-gray-900 line-clamp-1 font-medium">
                    {session.summary || "A moment of reflection"}
                  </p>
                  <p className="text-gray-500 mt-1">{formatDate(session.started_at)}</p>
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </CalmiShell>
  );
}

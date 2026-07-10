import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalmiShell } from "./CalmiShell";
import { WaitlistCard } from "./WaitlistCard";
import { WaitlistModal } from "./WaitlistModal";
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
  onThemeToggle: (event?: import("react").MouseEvent) => void;
  displayName?: string | null;
}

export function HomeScreen({ onStartConversation, onSignOut, onViewHistory, onViewInsights, onOpenSession, onOpenSettings, onOpenNotes, onGoHome, userId, genzMode, onGenzToggle, theme, onThemeToggle, displayName }: HomeScreenProps) {
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const hour = new Date().getHours();
  const firstName = (displayName || "").trim().split(/\s+/)[0] || "";
  const timeGreeting =
    hour < 5 ? "still up" :
    hour < 12 ? "good morning" :
    hour < 17 ? "good afternoon" :
    hour < 21 ? "good evening" : "hey night owl";
  const greeting = firstName ? `${timeGreeting}, ${firstName.toLowerCase()}` : timeGreeting;
  const subGreetings = [
    "what's alive in you right now?",
    "how's your heart today?",
    "what's taking up space in your head?",
    "how are you, really?",
    "what do you want to unpack today?",
  ];
  const subGreeting = subGreetings[new Date().getDate() % subGreetings.length];

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
        // No time filter - the session save threshold now lives in useSession
        // (a session is kept only when the user sent 4+ messages).
        setPastSessions(data.slice(0, 5));
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
          className="flex flex-col items-center gap-2 mb-6 sm:mb-8 text-center"
        >
          <div className="h-12 w-12 rounded-full flex items-center justify-center mb-1">
            <img src="/logo-icon.svg" alt="coree" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground lowercase">
            {greeting}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">
            {subGreeting}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md space-y-3 px-1"
        >
          <button
            onClick={() => onStartConversation("voice")}
            className="card-duo w-full p-4 sm:p-5 text-left"
          >
            <p className="text-sm font-bold text-foreground uppercase tracking-wide">voice mode</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium normal-case">in the mood to talk?</p>
          </button>

          <button
            onClick={() => onStartConversation("text")}
            className="card-duo w-full p-4 sm:p-5 text-left flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-bold text-foreground uppercase tracking-wide">text mode</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium normal-case">not in the talking mood?</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
          </button>

          <WaitlistCard onJoin={() => setWaitlistOpen(true)} variant="home" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md mt-8 sm:mt-12 px-1"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">history</h2>
            {pastSessions.length > 0 && (
              <button
                onClick={onViewHistory}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:opacity-80 transition"
              >
                see all
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {pastSessions.length === 0 ? (
              <div className="card-duo px-4 py-5 text-center">
                <p className="text-xs text-muted-foreground font-medium lowercase">start a conversation - all your sessions will live here</p>
              </div>
            ) : (
              pastSessions.slice(0, 3).map((session, i) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                  onClick={() => handleSessionClick(session.id)}
                  className="card-duo w-full text-left px-4 py-3 text-xs"
                >
                  <p className="text-foreground line-clamp-1 font-bold lowercase">
                    {session.summary || "A moment of reflection"}
                  </p>
                  <p className="text-muted-foreground mt-1 font-medium lowercase">{formatDate(session.started_at)}</p>
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      </div>
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </CalmiShell>
  );
}

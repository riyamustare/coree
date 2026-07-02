import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, MessageCircle, Smile, BookOpen } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import LoadingAnimation from "@/components/LoadingAnimation";
import { CalmiShell } from "./CalmiShell";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface InsightsScreenProps {
  userId: string;
  userCreatedAt?: string | null;
  onGoHome: () => void;
  onViewInsights: () => void;
  onViewHistory: () => void;
  onOpenNotes: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  genzMode: boolean;
  onGenzToggle: (enabled: boolean) => void;
  theme: "light" | "dark";
  onThemeToggle: (event?: import("react").MouseEvent) => void;
}

interface WeekSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  emotions: Record<string, number> | null;
}

interface ChatLogMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

const EMOTION_KEYS = ["happiness", "sadness", "anger", "fear", "surprise", "disgust"];

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function formatWeekLabel(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function formatSessionTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSessionDate(dateStr: string) {
  const date = new Date(dateStr);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", opts).toLowerCase();
}

function generateSessionTitle(summary: string | null): string {
  if (!summary) return "meaningful moment";
  
  // Extract key themes from summary and create a poetic title
  const summaryLower = summary.toLowerCase();
  
  const themes: Record<string, string> = {
    trust: "leaning into trust",
    growth: "seeds of growth",
    clarity: "moments of clarity",
    peace: "finding peace",
    strength: "drawing strength",
    hope: "holding onto hope",
    gratitude: "embracing gratitude",
    courage: "finding courage",
    understanding: "deeper understanding",
    acceptance: "path to acceptance",
    progress: "progress unfolding",
    connection: "meaningful connection",
    reflection: "quiet reflection",
    balance: "seeking balance",
    healing: "gentle healing",
  };
  
  for (const [keyword, title] of Object.entries(themes)) {
    if (summaryLower.includes(keyword)) {
      return title;
    }
  }
  
  // If no theme matches, generate from summary length and mood
  if (summaryLower.includes("thank") || summaryLower.includes("grateful")) {
    return "gratitude and grace";
  }
  if (summaryLower.includes("challenge") || summaryLower.includes("difficult")) {
    return "weathering the storm";
  }
  if (summaryLower.includes("happy") || summaryLower.includes("joy")) {
    return "joy rising";
  }
  
  return "meaningful moment";
}

function generateWeeklySummary(sessions: WeekSession[], journalCount: number): string {
  if (sessions.length === 0) {
    return "No conversations recorded this week yet. Add a few more sessions to unlock a richer weekly summary.";
  }

  const summaries = sessions
    .map((s) => s.summary)
    .filter((text): text is string => Boolean(text));

  if (summaries.length === 0) {
    return `You had ${sessions.length} conversation${sessions.length === 1 ? "" : "s"} this week. If you want a weekly reflection, check back after the next conversation.`;
  }

  if (summaries.length === 1) {
    return summaries[0];
  }

  const preview = summaries.slice(0, 2).join(" \n\n");
  return `This week, you had ${sessions.length} conversations and ${journalCount} journal entr${journalCount === 1 ? "y" : "ies"}. Here are the highlights:\n\n${preview}`;
}

interface EmotionTag {
  name: string;
  emoji: string;
  label: string;
}

const EMOTION_EMOJIS: Record<string, EmotionTag> = {
  happiness: { name: "happiness", emoji: "🥰", label: "grounded" },
  sadness: { name: "sadness", emoji: "😔", label: "reflective" },
  anger: { name: "anger", emoji: "😤", label: "determined" },
  fear: { name: "fear", emoji: "😟", label: "vulnerable" },
  surprise: { name: "surprise", emoji: "😮", label: "aware" },
  disgust: { name: "disgust", emoji: "🙁", label: "mindful" },
};

// Alternative emotion mappings for more nuanced display
const NUANCED_EMOTIONS: Record<string, EmotionTag> = {
  trust: { name: "trust", emoji: "💕", label: "self-trust" },
  growth: { name: "growth", emoji: "🌱", label: "mindset shift" },
  peace: { name: "peace", emoji: "☮️", label: "calm" },
  strength: { name: "strength", emoji: "💪", label: "resilience" },
  reflection: { name: "reflection", emoji: "😌", label: "reflective" },
  grounded: { name: "grounded", emoji: "🥰", label: "grounded" },
};

function getEmotionTags(emotions: Record<string, number> | null): EmotionTag[] {
  if (!emotions) return [];
  
  const tags: EmotionTag[] = [];
  const emotionEntries = Object.entries(emotions)
    .filter(([_, value]) => typeof value === "number" && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  
  emotionEntries.forEach(([emotionName]) => {
    const emotionKey = emotionName.toLowerCase();
    if (EMOTION_EMOJIS[emotionKey]) {
      tags.push(EMOTION_EMOJIS[emotionKey]);
    }
  });
  
  return tags;
}

export function InsightsScreen({ userId, onGoHome, onViewInsights, onViewHistory, onOpenNotes, onOpenSettings, onSignOut, genzMode, onGenzToggle, theme, onThemeToggle }: InsightsScreenProps) {
  // eslint-disable-next-line react/prop-types
}
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<WeekSession[]>([]);
  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatLogMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [journalCount, setJournalCount] = useState(0);

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch sessions and journal count in parallel
      const [sessionsRes, journalRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, started_at, ended_at, summary, emotions")
          .eq("user_id", userId)
          .not("ended_at", "is", null)
          .gte("started_at", start.toISOString())
          .lte("started_at", end.toISOString())
          .order("started_at", { ascending: false }),
        supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),
      ]);

      setJournalCount(journalRes.count || 0);

      if (sessionsRes.data) {
        const sessionData = sessionsRes.data as any[];
        setSessions(sessionData);

        if (sessionData.length > 0) {
          const ids = sessionData.map((s) => s.id);
          const [{ count }, messagesRes] = await Promise.all([
            supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .in("session_id", ids),
            supabase
              .from("messages")
              .select("id, session_id, role, content, created_at")
              .in("session_id", ids)
              .order("created_at", { ascending: true }),
          ]);

          setTotalMessages(count || 0);
          const grouped = (messagesRes.data || []).reduce<Record<string, ChatLogMessage[]>>((acc, message) => {
            if (!acc[message.session_id]) acc[message.session_id] = [];
            acc[message.session_id].push(message as ChatLogMessage);
            return acc;
          }, {});
          setSessionMessages(grouped);
        } else {
          setTotalMessages(0);
          setSessionMessages({});
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [userId, weekOffset, start, end]);

  // Count total activity (sessions + journals) for unlock threshold
  const totalActivity = sessions.length + journalCount;
  const hasEnoughActivity = totalActivity >= 3;
  const activityNeeded = Math.max(0, 3 - totalActivity);

  // Aggregate emotions across sessions
  const moodData = useMemo(() => {
    if (!hasEnoughActivity) return [];
    const totals: Record<string, number[]> = {};
    EMOTION_KEYS.forEach((k) => (totals[k] = []));

    sessions.forEach((s) => {
      if (s.emotions && typeof s.emotions === "object") {
        EMOTION_KEYS.forEach((k) => {
          const val = (s.emotions as any)[k];
          if (typeof val === "number") totals[k].push(val);
        });
      }
    });

    return EMOTION_KEYS.map((k) => ({
      emotion: k,
      value: totals[k].length > 0
        ? Math.round(totals[k].reduce((a, b) => a + b, 0) / totals[k].length)
        : 0,
    }));
  }, [sessions, hasEnoughActivity]);

  const isCurrentWeek = weekOffset === 0;

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
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-medium tracking-tight text-foreground">Insights</h1>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-soft mb-6">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-1 rounded-full hover:bg-secondary transition"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground">
            {formatWeekLabel(start, end)}
          </span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={isCurrentWeek}
            className="p-1 rounded-full hover:bg-secondary transition disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>

        {loading ? (
          <LoadingAnimation />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-1">your week</h2>
              <p className="text-sm text-muted-foreground">
                get a weekly reflection on your thoughts, patterns, and progress
              </p>
              {!hasEnoughActivity && (
                <p className="mt-2 text-sm text-primary font-medium">
                  you're <span className="font-bold">{activityNeeded}</span> {activityNeeded !== 1 ? "entries" : "entry"} away (convos or journal)
                </p>
              )}
            </div>

            {/* Stats */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">stats</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border-color bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">convos</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{sessions.length}</p>
                </div>
                <div className="rounded-2xl border border-border-color bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">messages</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalMessages}</p>
                </div>
                <div className="rounded-2xl border border-border-color bg-surface px-4 py-3">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">journal</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{journalCount}</p>
                </div>
              </div>
            </div>

            {/* Mood radar */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smile className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">mood</h3>
              </div>
              <div className="rounded-2xl border border-border-color bg-surface p-4">
                {hasEnoughActivity && moodData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={moodData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="emotion"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <Radar
                        name="mood"
                        dataKey="value"
                        stroke="hsl(var(--warning))"
                        fill="hsl(var(--warning))"
                        fillOpacity={0.3}
                        dot={{ r: 4, fill: "hsl(var(--warning))" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm text-muted-foreground text-center">
                      {hasEnoughActivity
                        ? "No mood data available yet"
                        : `Complete ${activityNeeded} more ${activityNeeded !== 1 ? "entries" : "entry"} this week to unlock mood insights`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly summary */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">weekly summary</h3>
              </div>
              <div className="rounded-2xl border border-border-color bg-card p-6 shadow-soft">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {generateWeeklySummary(sessions, journalCount)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </CalmiShell>
  );
}

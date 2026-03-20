import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, MessageCircle, Smile } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as events from "@/lib/events";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface InsightsScreenProps {
  userId: string;
  onBack: () => void;
}

interface WeekSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  emotions: Record<string, number> | null;
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

export function InsightsScreen({ userId, onBack }: InsightsScreenProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<WeekSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  useEffect(() => {
    events.screenViewed("insights");
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("sessions")
        .select("id, started_at, ended_at, summary, emotions")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .gte("started_at", start.toISOString())
        .lte("started_at", end.toISOString())
        .order("started_at", { ascending: false });

      if (data) {
        const filtered = (data as any[]).filter((s) => {
          if (!s.ended_at || !s.started_at) return false;
          const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          return duration > 5 * 60 * 1000;
        });
        setSessions(filtered);

        if (filtered.length > 0) {
          const ids = filtered.map((s) => s.id);
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("session_id", ids);
          setTotalMessages(count || 0);
        } else {
          setTotalMessages(0);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [userId, weekOffset, start, end]);

  const hasEnoughConvos = sessions.length >= 3;
  const convosNeeded = Math.max(0, 3 - sessions.length);

  const moodData = useMemo(() => {
    if (!hasEnoughConvos) return [];
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
  }, [sessions, hasEnoughConvos]);

  const isCurrentWeek = weekOffset === 0;

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
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 rounded-full bg-primary/20 animate-breathe" />
          </div>
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
              {!hasEnoughConvos && (
                <p className="mt-2 text-sm text-primary font-medium">
                  you're <span className="font-bold">{convosNeeded}</span> convo{convosNeeded !== 1 ? "s" : ""} away
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">convos completed</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{sessions.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">messages</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalMessages}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smile className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">mood</h3>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                {hasEnoughConvos && moodData.some((d) => d.value > 0) ? (
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
                      {hasEnoughConvos
                        ? "No mood data available yet"
                        : `Complete ${convosNeeded} more convo${convosNeeded !== 1 ? "s" : ""} this week to unlock mood insights`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

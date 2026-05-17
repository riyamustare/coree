import { motion } from "framer-motion";
import { Clock, MessageCircle } from "lucide-react";
import type { SessionSummary } from "@/hooks/useSession";
import ReactMarkdown from "react-markdown";

interface SummaryScreenProps {
  summary: SessionSummary;
  onGoHome: () => void;
  onNewSession: () => void;
}

function formatSessionDate(timestamp: string): string {
  const date = new Date(timestamp);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", opts).toLowerCase();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function generateSessionTitle(summary: string | null): string {
  if (!summary) return "meaningful moment";
  
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

export function SummaryScreen({ summary, onGoHome, onNewSession }: SummaryScreenProps) {
  const emotionTags = getEmotionTags(summary.emotions || null);
  
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] px-4 py-6">
      <div className="mx-auto w-full max-w-xl flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1"
        >
          {/* Session Title and Date */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground leading-tight mb-2">
              {generateSessionTitle(summary.summary)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatSessionDate(summary.endedAt)}
            </p>
          </div>

          {/* Emotion Tags */}
          {emotionTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {emotionTags.map((tag) => (
                <div
                  key={tag.name}
                  className="inline-flex items-center gap-1 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200"
                >
                  <span className="text-base">{tag.emoji}</span>
                  <span className="text-sm text-foreground">{tag.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Session Summary */}
          <div className="mb-8">
            <div className="text-base leading-relaxed text-foreground prose prose-sm max-w-none">
              <ReactMarkdown>{summary.summary}</ReactMarkdown>
            </div>
          </div>

          {/* Message History Header */}
          <div className="flex items-center gap-2 mb-4 mt-8 pt-6 border-t border-gray-200">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">message history</h3>
          </div>

          {/* Messages */}
          {summary.messages && summary.messages.length > 0 && (
            <div className="space-y-3 mb-8">
              {summary.messages.map((msg, idx) => {
                const isUserMessage = msg.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        isUserMessage
                          ? "bg-blue-50 border border-blue-100"
                          : "bg-gray-50 border border-gray-100"
                      } rounded-lg px-4 py-3`}
                    >
                      <p className="text-sm text-foreground leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex w-full items-center justify-center gap-3 pt-4 border-t border-gray-200"
        >
          <button
            onClick={onNewSession}
            className="flex-1 rounded-2xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start another conversation
          </button>
          <button
            onClick={onGoHome}
            className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Go home
          </button>
        </motion.div>
      </div>
    </div>
  );
}

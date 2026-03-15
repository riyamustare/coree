import { motion } from "framer-motion";
import { Clock, MessageCircle, ArrowRight } from "lucide-react";
import type { SessionSummary } from "@/hooks/useSession";
import ReactMarkdown from "react-markdown";

interface SummaryScreenProps {
  summary: SessionSummary;
  onGoHome: () => void;
  onNewSession: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return "less than a minute";
  const m = Math.floor(seconds / 60);
  return m === 1 ? "1 minute" : `${m} minutes`;
}

export function SummaryScreen({ summary, onGoHome, onNewSession }: SummaryScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
          >
            <div className="h-6 w-6 rounded-full bg-primary" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-medium tracking-tight text-foreground"
          >
            Session complete
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-1 text-sm text-muted-foreground"
          >
            Thanks for taking this time for yourself.
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex justify-center gap-6 mb-6"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDuration(summary.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{summary.messageCount} messages</span>
          </div>
        </motion.div>

        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-surface p-6 shadow-soft"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Session Insights
          </p>
          <div className="text-base leading-relaxed text-foreground prose prose-sm max-w-none">
            <ReactMarkdown>{summary.summary}</ReactMarkdown>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-6 flex flex-col gap-3"
        >
          <button
            onClick={onNewSession}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start another conversation
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onGoHome}
            className="rounded-2xl py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          >
            Go home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

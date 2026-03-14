import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface MessageBlockProps {
  role: "user" | "assistant";
  content: string;
  isThinking?: boolean;
  isOld?: boolean;
}

const transition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };

export function MessageBlock({ role, content, isThinking, isOld }: MessageBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isOld ? 0.4 : 1, y: 0 }}
      transition={transition}
      className={`px-6 py-5 rounded-2xl ${
        role === "assistant"
          ? "bg-surface shadow-soft"
          : "bg-transparent"
      } ${isThinking ? "animate-breathe" : ""}`}
    >
      {role === "assistant" ? (
        <div className="prose prose-sm max-w-none text-surface-foreground leading-relaxed text-lg">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-lg leading-relaxed text-foreground">{content}</p>
      )}
      {role === "user" && (
        <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">You</p>
      )}
    </motion.div>
  );
}

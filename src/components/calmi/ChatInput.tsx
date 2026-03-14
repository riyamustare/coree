import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative bg-surface shadow-soft rounded-2xl"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Share what's on your mind..."
        disabled={disabled}
        rows={1}
        className="w-full resize-none bg-transparent px-5 py-4 pr-14 text-lg leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 rounded-2xl"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

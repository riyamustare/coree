import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, MicOff } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

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

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Web Speech API not supported");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setValue(transcript);
    };
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

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
        placeholder={isRecording ? "Listening..." : "Share what's on your mind..."}
        disabled={disabled || isRecording}
        rows={1}
        className="w-full resize-none bg-transparent px-5 py-4 pr-24 text-lg leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 rounded-2xl"
      />
      <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
        <button
          onClick={toggleRecording}
          disabled={disabled || isTranscribing}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
            isRecording
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label={isRecording ? "Stop recording" : "Record voice"}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled || isRecording}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

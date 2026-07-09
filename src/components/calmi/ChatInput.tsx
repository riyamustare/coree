import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, MicOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

  const startRecording = useCallback(async () => {
    // Pre-check mic permission so we can surface a helpful message
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release — SpeechRecognition manages its own stream
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      console.error("Microphone permission denied:", err);
      toast({
        title: "Microphone blocked",
        description:
          "Allow mic access in your browser (click the lock icon in the address bar) and try again.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Try Chrome or Safari for voice input.",
        variant: "destructive",
      });
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
    recognition.onerror = (e: any) => {
      console.error("SpeechRecognition error:", e?.error || e);
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast({
          title: "Microphone blocked",
          description: "Allow mic access in your browser and try again.",
          variant: "destructive",
        });
      }
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    try {
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      console.error("SpeechRecognition start error:", err);
      setIsRecording(false);
    }
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
      className="relative bg-card shadow-sm rounded-2xl border border-border"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : "type your message..."}
          disabled={disabled || isRecording}
          rows={1}
          className="flex-1 resize-none bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 rounded-lg"
        />

        {/* Voice/Send Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={disabled}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
              isRecording
                ? "bg-red-100 text-red-600"
                : "text-muted-foreground hover:text-muted-foreground hover:bg-muted"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label={isRecording ? "Stop recording" : "Record voice"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled || isRecording}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-all duration-200 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

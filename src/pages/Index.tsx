import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import { useVoice } from "@/hooks/useVoice";
import { AuthScreen } from "@/components/calmi/AuthScreen";
import { SessionHeader } from "@/components/calmi/SessionHeader";
import { MessageBlock } from "@/components/calmi/MessageBlock";
import { ChatInput } from "@/components/calmi/ChatInput";
import { VoiceVisualizer } from "@/components/calmi/VoiceVisualizer";
import { Mic, MicOff } from "lucide-react";

const GREETING = "How are you feeling right now?";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    sessionId,
    sessionStart,
    messages,
    isLoading,
    startSession,
    endSession,
    sendMessage,
  } = useSession(user?.id);
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useVoice();
  const [mode, setMode] = useState<"text" | "voice">("text");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Auto-start session when user arrives
  useEffect(() => {
    if (user && !sessionId) {
      startSession();
    }
  }, [user, sessionId, startSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleEndSession = useCallback(async () => {
    stopSpeaking();
    setShowSummary(true);
    await endSession();
    setTimeout(() => {
      setShowSummary(false);
      startSession();
    }, 3000);
  }, [endSession, startSession, stopSpeaking]);

  const handleSendText = useCallback(
    async (content: string) => {
      await sendMessage(content);
    },
    [sendMessage]
  );

  const handleVoiceToggle = useCallback(async () => {
    if (isListening) {
      stopListening();
      // The startListening promise resolves with transcript on stop
    } else {
      const transcript = await startListening();
      if (transcript) {
        await sendMessage(transcript);
        // After getting assistant response, speak it
        // We'll watch for the last assistant message
      }
    }
  }, [isListening, startListening, stopListening, sendMessage]);

  // Auto-speak assistant responses in voice mode
  useEffect(() => {
    if (mode !== "voice" || isLoading || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && !isSpeaking) {
      speak(last.content);
    }
  }, [messages, mode, isLoading, isSpeaking, speak]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full bg-primary/20 animate-breathe" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-chat flex-1 flex-col px-4">
        {/* Header */}
        <SessionHeader
          mode={mode}
          onModeChange={setMode}
          onEndSession={handleEndSession}
          sessionStart={sessionStart}
        />

        {/* Summary overlay */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-primary" />
                </div>
                <p className="text-xl font-medium text-foreground tracking-tight">
                  Thanks for sharing today.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Take care of yourself.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto calmi-scroll py-4 space-y-3"
        >
          {/* Greeting */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="px-6 py-5 rounded-2xl bg-surface shadow-soft"
            >
              <p className="text-2xl font-medium leading-snug tracking-tight text-foreground">
                {GREETING}
              </p>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <MessageBlock
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isThinking={isLoading && i === messages.length - 1 && msg.role === "assistant"}
              isOld={i < messages.length - 6}
            />
          ))}

          {/* Thinking indicator */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 py-5 rounded-2xl bg-surface shadow-soft animate-breathe"
            >
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary/40" />
                <div className="h-2 w-2 rounded-full bg-primary/30" />
                <div className="h-2 w-2 rounded-full bg-primary/20" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input area */}
        <div className="pb-6 pt-2">
          <AnimatePresence mode="wait">
            {mode === "text" ? (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ChatInput onSend={handleSendText} disabled={isLoading} />
              </motion.div>
            ) : (
              <motion.div
                key="voice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <VoiceVisualizer isActive={isListening || isSpeaking} isSpeaking={isSpeaking} />
                <div className="flex justify-center">
                  <button
                    onClick={handleVoiceToggle}
                    disabled={isLoading || isSpeaking}
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 ${
                      isListening
                        ? "bg-primary text-primary-foreground shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        : "bg-surface shadow-soft text-foreground hover:shadow-active"
                    } disabled:opacity-50`}
                  >
                    {isListening ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Index;

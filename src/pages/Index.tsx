import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSession, type SessionSummary } from "@/hooks/useSession";
import { useVoice } from "@/hooks/useVoice";
import { AuthScreen } from "@/components/calmi/AuthScreen";
import { HomeScreen } from "@/components/calmi/HomeScreen";
import { SummaryScreen } from "@/components/calmi/SummaryScreen";
import { SessionHeader } from "@/components/calmi/SessionHeader";
import { MessageBlock } from "@/components/calmi/MessageBlock";
import { ChatInput } from "@/components/calmi/ChatInput";
import { VoiceVisualizer } from "@/components/calmi/VoiceVisualizer";
import { Mic, MicOff } from "lucide-react";

type AppScreen = "home" | "chat" | "summary";

const GREETING = "How are you feeling right now?";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
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

  const [screen, setScreen] = useState<AppScreen>("home");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [summaryData, setSummaryData] = useState<SessionSummary | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenMessageIdRef = useRef<string | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartConversation = useCallback(async () => {
    await startSession();
    setScreen("chat");
  }, [startSession]);

  const handleEndSession = useCallback(async () => {
    stopSpeaking();
    const result = await endSession();
    setSummaryData(result);
    setScreen("summary");
  }, [endSession, stopSpeaking]);

  const handleGoHome = useCallback(() => {
    setSummaryData(null);
    setScreen("home");
  }, []);

  const handleNewSession = useCallback(async () => {
    setSummaryData(null);
    await startSession();
    setScreen("chat");
  }, [startSession]);

  const handleSendText = useCallback(
    async (content: string) => {
      await sendMessage(content);
    },
    [sendMessage]
  );

  const handleVoiceToggle = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      const transcript = await startListening();
      if (transcript) {
        await sendMessage(transcript);
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

  // Loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full bg-primary/20 animate-breathe" />
      </div>
    );
  }

  // Auth
  if (!user) {
    return <AuthScreen />;
  }

  // Summary
  if (screen === "summary" && summaryData) {
    return (
      <SummaryScreen
        summary={summaryData}
        onGoHome={handleGoHome}
        onNewSession={handleNewSession}
      />
    );
  }

  // Home
  if (screen === "home") {
    return <HomeScreen onStartConversation={handleStartConversation} onSignOut={signOut} />;
  }

  // Chat
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-chat flex-1 flex-col px-4">
        <SessionHeader
          mode={mode}
          onModeChange={setMode}
          onEndSession={handleEndSession}
          sessionStart={sessionStart}
        />

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto calmi-scroll py-4 space-y-3"
        >
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

        {/* Input */}
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

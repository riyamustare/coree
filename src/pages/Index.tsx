import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSession, type SessionSummary } from "@/hooks/useSession";
import { useVoice } from "@/hooks/useVoice";
import { useProfile } from "@/hooks/useProfile";
import { LandingPage } from "@/components/calmi/LandingPage";
import { AuthScreen } from "@/components/calmi/AuthScreen";
import { HomeScreen } from "@/components/calmi/HomeScreen";
import { OnboardingScreen } from "@/components/calmi/OnboardingScreen";
import { SummaryScreen } from "@/components/calmi/SummaryScreen";
import { HistoryScreen } from "@/components/calmi/HistoryScreen";
import { InsightsScreen } from "@/components/calmi/InsightsScreen";
import { SettingsScreen } from "@/components/calmi/SettingsScreen";
import { NotesScreen } from "@/components/calmi/NotesScreen";
import { SessionHeader } from "@/components/calmi/SessionHeader";
import { MessageBlock } from "@/components/calmi/MessageBlock";
import { ChatInput } from "@/components/calmi/ChatInput";
import { VoiceVisualizer } from "@/components/calmi/VoiceVisualizer";
import { Mic, MicOff } from "lucide-react";
import {
  setUserProperties,
  resetUserProperties,
  trackSignOut,
  trackSessionStarted,
  trackSessionEnded,
  trackMessageSent,
  trackResponseReceived,
  trackModeChanged,
  trackVoiceListenStart,
  trackVoiceListenStop,
  trackTtsPlayed,
  trackScreenViewed,
} from "@/lib/analytics";

type AppScreen = "landing" | "auth" | "home" | "onboarding" | "chat" | "summary" | "history" | "insights" | "ending" | "settings" | "notes";

const GREETING = "How are you feeling right now?";

const ENDING_MESSAGES = [
  "You did great today ✨",
  "Wrapping up your session…",
  "Summarising your thoughts…",
];

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, completeOnboarding, setGenzMode, setTheme } = useProfile(user?.id);
  const {
    sessionId,
    sessionStart,
    messages,
    isLoading,
    startSession,
    endSession,
    sendMessage,
  } = useSession(user?.id);
  const { isListening, isSpeaking, liveTranscript, startListening, stopListening, speak, stopSpeaking } = useVoice();

  const [screen, setScreen] = useState<AppScreen>("landing");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [summaryData, setSummaryData] = useState<SessionSummary | null>(null);
  const [endingText, setEndingText] = useState(ENDING_MESSAGES[0]);
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenMessageIdRef = useRef<string | null>(null);

  // Dark mode: apply class to document
  useEffect(() => {
    if (profile?.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [profile?.theme]);

  // Set user properties for analytics
  useEffect(() => {
    if (user) {
      setUserProperties({ user_id: user.id });
    } else {
      resetUserProperties();
    }
  }, [user]);

  useEffect(() => {
    if (sessionId) {
      setUserProperties({ session_id: sessionId });
    }
  }, [sessionId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (screen !== "auth") setScreen("landing");
      return;
    }
    if (profileLoading) return;
    if (profile && !profile.onboarding_completed) {
      setScreen("onboarding");
    } else if (screen === "landing" || screen === "auth") {
      setScreen("home");
    }
  }, [user, authLoading, profile, profileLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (screen !== "ending") return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % ENDING_MESSAGES.length;
      setEndingText(ENDING_MESSAGES[i]);
    }, 1500);
    return () => clearInterval(interval);
  }, [screen]);

  const handleOnboardingComplete = useCallback(async (intent: string) => {
    await completeOnboarding(intent);
    setScreen("home");
  }, [completeOnboarding]);

  const handleStartConversation = useCallback(async (selectedMode: "text" | "voice" = "text") => {
    setMode(selectedMode);
    trackModeChanged(selectedMode);
    await startSession();
    trackSessionStarted(sessionId || "pending");
    setScreen("chat");
    trackScreenViewed("chat");
  }, [startSession, sessionId]);

  const handleEndSession = useCallback(async () => {
    stopSpeaking();
    setScreen("ending");
    const result = await endSession();
    if (result) {
      trackSessionEnded(sessionId || "", result.duration, result.messageCount);
    }
    setSummaryData(result);
    setScreen("summary");
    trackScreenViewed("summary");
  }, [endSession, stopSpeaking, sessionId]);

  const handleGoHome = useCallback(() => {
    setSummaryData(null);
    setScreen("home");
  }, []);

  const handleNewSession = useCallback(async () => {
    setSummaryData(null);
    await startSession();
    setScreen("chat");
  }, [startSession]);

  const handleSignOut = useCallback(async () => {
    trackSignOut();
    await signOut();
  }, [signOut]);

  const handleModeChange = useCallback((newMode: "text" | "voice") => {
    setMode(newMode);
    trackModeChanged(newMode);
  }, []);

  const handleOpenSession = useCallback((sid: string) => {
    setHistorySessionId(sid);
    setScreen("history");
  }, []);

  const handleThemeChange = useCallback((theme: "light" | "dark") => {
    setTheme(theme);
  }, [setTheme]);

  const handleSendText = useCallback(
    async (content: string) => {
      trackMessageSent(sessionId || "", "text");
      await sendMessage(content, profile?.genz_mode || false);
      trackResponseReceived(sessionId || "");
    },
    [sendMessage, sessionId, profile?.genz_mode]
  );

  const handleVoiceToggleFixed = useCallback(async () => {
    if (isListening) {
      trackVoiceListenStop();
      const text = await stopListening();
    } else {
      trackVoiceListenStart();
      const transcript = await startListening();
      if (transcript && transcript.trim()) {
        trackMessageSent(sessionId || "", "voice");
        await sendMessage(transcript.trim(), profile?.genz_mode || false);
        trackResponseReceived(sessionId || "");
      }
    }
  }, [isListening, startListening, stopListening, sendMessage, sessionId, profile?.genz_mode]);

  // In voice mode: speak assistant response, then auto-listen
  useEffect(() => {
    if (mode !== "voice" || isLoading || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && last.id !== spokenMessageIdRef.current) {
      spokenMessageIdRef.current = last.id;
      trackTtsPlayed();
      speak(last.content);
    }
  }, [messages, mode, isLoading, speak]);

  // Mic stays off by default — user must tap to start listening

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full bg-primary/20 animate-breathe" />
      </div>
    );
  }

  if (screen === "landing" && !user) {
    return (
      <LandingPage
        onGetStarted={() => setScreen("auth")}
        onLogin={() => setScreen("auth")}
      />
    );
  }

  if (screen === "auth" && !user) {
    return <AuthScreen onBack={() => setScreen("landing")} />;
  }

  if (screen === "onboarding") {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  if (screen === "ending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="h-12 w-12 rounded-full bg-primary/20"
        />
        <AnimatePresence mode="wait">
          <motion.p
            key={endingText}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-medium text-foreground"
          >
            {endingText}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  if (screen === "summary" && summaryData) {
    return (
      <SummaryScreen
        summary={summaryData}
        onGoHome={handleGoHome}
        onNewSession={handleNewSession}
      />
    );
  }

  if (screen === "history" && user) {
    return (
      <HistoryScreen
        userId={user.id}
        onBack={() => { setHistorySessionId(null); setScreen("home"); }}
        initialSessionId={historySessionId}
      />
    );
  }

  if (screen === "insights" && user) {
    return <InsightsScreen userId={user.id} onBack={() => setScreen("home")} />;
  }

  if (screen === "settings" && user) {
    return (
      <SettingsScreen
        userId={user.id}
        userEmail={user.email || ""}
        theme={(profile?.theme as "light" | "dark") || "light"}
        onThemeChange={handleThemeChange}
        onBack={() => setScreen("home")}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === "notes" && user) {
    return <NotesScreen userId={user.id} onBack={() => setScreen("home")} />;
  }

  if (screen === "home" && user) {
    return (
      <HomeScreen
        onStartConversation={handleStartConversation}
        onSignOut={handleSignOut}
        onViewHistory={() => { setHistorySessionId(null); setScreen("history"); }}
        onViewInsights={() => setScreen("insights")}
        onOpenSession={handleOpenSession}
        onOpenSettings={() => setScreen("settings")}
        onOpenNotes={() => setScreen("notes")}
        userId={user.id}
        genzMode={profile?.genz_mode || false}
        onGenzToggle={(enabled) => setGenzMode(enabled)}
      />
    );
  }

  // Chat
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="mx-auto flex w-full max-w-chat flex-col h-full px-4">
        <div className="flex-shrink-0">
          <SessionHeader
            mode={mode}
            onModeChange={handleModeChange}
            onEndSession={handleEndSession}
            sessionStart={sessionStart}
            showModeToggle={false}
          />
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto calmi-scroll py-4 space-y-3"
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

        <div className="flex-shrink-0 pb-6 pt-2">
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
                <VoiceVisualizer
                  isActive={isListening || isSpeaking}
                  isSpeaking={isSpeaking}
                  transcription={isListening ? liveTranscript : undefined}
                />
                <div className="flex justify-center">
                  <button
                    onClick={handleVoiceToggleFixed}
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

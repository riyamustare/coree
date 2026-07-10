import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSession, type SessionSummary } from "@/hooks/useSession";
import { useVoice } from "@/hooks/useVoice";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/calmi/PaywallModal";
import { LandingPage } from "@/components/calmi/LandingPage";
import { AuthScreen } from "@/components/calmi/AuthScreen";
import { HomeScreen } from "@/components/calmi/HomeScreen";
import { OnboardingScreen } from "@/components/calmi/OnboardingScreen";
import { SummaryScreen } from "@/components/calmi/SummaryScreen";
import { HistoryScreen } from "@/components/calmi/HistoryScreen";
import { InsightsScreen } from "@/components/calmi/InsightsScreen";
import { SettingsScreen } from "@/components/calmi/SettingsScreen.jsx";
import { NotesScreen } from "@/components/calmi/NotesScreen";
import { SessionHeader } from "@/components/calmi/SessionHeader";
import { MessageBlock } from "@/components/calmi/MessageBlock";
import { ChatInput } from "@/components/calmi/ChatInput";
import { VoiceVisualizer } from "@/components/calmi/VoiceVisualizer";
import LoadingAnimation from "@/components/LoadingAnimation";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Mic, MicOff } from "lucide-react";
import { toggleThemeWithTransition } from "@/lib/themeTransition";
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
  trackCtaClick,
  trackPageViewed,
} from "@/lib/analytics";

type AppScreen = "landing" | "auth" | "home" | "onboarding" | "chat" | "summary" | "history" | "insights" | "ending" | "settings" | "notes";

const GREETING = "How are you feeling right now?";
const INITIAL_AI_MESSAGE = "Hey there! How's it going? What's on your mind today?";

const ENDING_MESSAGES = [
  "You did great today ✨",
  "Wrapping up your session…",
  "Summarising your thoughts…",
];

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, completeOnboarding, setGenzMode, setTheme } = useProfile(user?.id);
  const subscription = useSubscription(user?.id);
  const [showPaywall, setShowPaywall] = useState(false);
  const {
    sessionId,
    sessionStart,
    messages,
    isLoading,
    startSession,
    endSession,
    sendMessage,
    setMessages,
  } = useSession(user?.id);
  const { isListening, isSpeaking, liveTranscript, startListening, stopListening, speak, stopSpeaking } = useVoice();

  const [screen, setScreen] = useState<AppScreen>("landing");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [summaryData, setSummaryData] = useState<SessionSummary | null>(null);
  const [endingText, setEndingText] = useState(ENDING_MESSAGES[0]);
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenMessageIdRef = useRef<string | null>(null);
  const transcriptPromiseRef = useRef<Promise<string | null> | null>(null);

  // Dark mode: apply class to document. Dark is the default when no profile
  // is loaded (landing/auth) or when the profile says dark.
  useEffect(() => {
    const isDark = !profile || profile.theme !== "light";
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [profile]);

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

  // ─── URL ↔ screen sync ───
  const SCREEN_TO_PATH: Record<AppScreen, string> = {
    landing: "/",
    auth: "/auth",
    home: "/home",
    onboarding: "/onboarding",
    chat: "/chat",
    summary: "/chat",
    ending: "/chat",
    history: "/history",
    insights: "/insights",
    settings: "/settings",
    notes: "/journal",
  };
  const PATH_TO_SCREEN: Record<string, AppScreen> = {
    "/": "landing",
    "/auth": "auth",
    "/home": "home",
    "/onboarding": "onboarding",
    "/chat": "chat",
    "/history": "history",
    "/insights": "insights",
    "/settings": "settings",
    "/journal": "notes",
  };

  // When URL changes (back/forward), reflect into screen state
  useEffect(() => {
    const next = PATH_TO_SCREEN[location.pathname];
    if (next && next !== screen) {
      // Only auto-switch if user is allowed on that screen
      if (!user && (next !== "landing" && next !== "auth")) return;
      setScreen(next);
    }
    // Track every route change as a page view
    trackPageViewed(location.pathname);
    trackScreenViewed(location.pathname);
  }, [location.pathname]);

  // When screen changes, push URL (avoid loops)
  useEffect(() => {
    const target = SCREEN_TO_PATH[screen];
    if (target && target !== location.pathname) {
      navigate(target, { replace: false });
    }
  }, [screen]);

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

  const startConversation = useCallback(async (selectedMode: "text" | "voice" = "text") => {
    setMode(selectedMode);
    trackModeChanged(selectedMode);
    await startSession(selectedMode);
    trackSessionStarted(sessionId || "pending");
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: INITIAL_AI_MESSAGE,
      },
    ]);
    setScreen("chat");
    trackScreenViewed("chat");
  }, [startSession, sessionId, setMessages]);

  const handleStartConversation = useCallback(async (selectedMode: "text" | "voice" = "text") => {
    trackCtaClick("start_conversation", "home");
    if (selectedMode === "voice" && !subscription.loading && !subscription.canStartVoice) {
      trackCtaClick("paywall_shown", "start_conversation");
      setShowPaywall(true);
      return;
    }
    await startConversation(selectedMode);
  }, [startConversation, subscription.loading, subscription.canStartVoice]);

  const handleEndSession = useCallback(async () => {
    trackCtaClick("end_session_confirm", "chat", {
      message_count: messages.length,
      mode,
    });
    setShowEndConfirm(false);
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
    await startConversation(mode);
  }, [startConversation, mode]);

  const handleSignOut = useCallback(async () => {
    trackSignOut();
    await signOut();
  }, [signOut]);

  const handleModeChange = useCallback((newMode: "text" | "voice") => {
    trackCtaClick("mode_change", "chat", { mode: newMode });
    setMode(newMode);
    trackModeChanged(newMode);
  }, []);

  const handleOpenSession = useCallback((sid: string) => {
    setHistorySessionId(sid);
    setScreen("history");
  }, []);

  const handleThemeChange = useCallback(
    (theme: "light" | "dark", event?: React.MouseEvent) => {
      toggleThemeWithTransition(event ?? null, () => setTheme(theme));
    },
    [setTheme]
  );

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
      trackCtaClick("mic_stop", "chat", { session_id: sessionId || "" });
      // stop listening which will resolve the promise returned by startListening
      await stopListening();
      const transcriptPromise = transcriptPromiseRef.current;
      let transcript: string | null = null;
      if (transcriptPromise) {
        try {
          transcript = await transcriptPromise;
        } catch (err) {
          transcript = null;
        }
        transcriptPromiseRef.current = null;
      }

      if (transcript && transcript.trim()) {
        trackMessageSent(sessionId || "", "voice");
        await sendMessage(transcript.trim(), profile?.genz_mode || false);
        trackResponseReceived(sessionId || "");
      }
    } else {
      trackVoiceListenStart();
      trackCtaClick("mic_start", "chat", { session_id: sessionId || "" });
      // startListening returns a promise that resolves when stopListening calls resolve
      transcriptPromiseRef.current = startListening();
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

  // Mic stays off by default - user must tap to start listening

  const renderScreen = () => {
    if (authLoading || (user && profileLoading)) {
      return <LoadingAnimation />;
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
      const nameFromMeta =
        (user?.user_metadata as any)?.full_name ||
        (user?.user_metadata as any)?.name ||
        (user?.user_metadata as any)?.first_name ||
        "";
      const displayName = profile?.display_name || nameFromMeta || "";
      return <OnboardingScreen onComplete={handleOnboardingComplete} displayName={displayName} />;
    }

    if (screen === "ending") {
      return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
        <LoadingAnimation />
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-xl text-center p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating your session insights</h2>
          <p className="text-sm text-gray-600">Hang tight - we're summarizing your conversation and extracting useful insights. This may take a moment.</p>
          <div className="mt-4 inline-flex items-center gap-3 justify-center">
            <span className="text-2xl">✋</span>
            <span className="text-sm text-muted-foreground">Preparing insights…</span>
          </div>
        </motion.div>
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
        onGoHome={handleGoHome}
        onViewInsights={() => setScreen("insights")}
        onViewHistory={() => { setHistorySessionId(null); setScreen("history"); }}
        onOpenNotes={() => setScreen("notes")}
        onOpenSettings={() => setScreen("settings")}
        onSignOut={handleSignOut}
        genzMode={profile?.genz_mode || false}
        onGenzToggle={(enabled) => setGenzMode(enabled)}
        theme={(profile?.theme as "light" | "dark") || "light"}
        onThemeToggle={(e) => handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)}
        initialSessionId={historySessionId}
      />
      );
    }

    if (screen === "insights" && user) {
      return (
      <InsightsScreen
        userId={user.id}
        userCreatedAt={user.created_at}
        onGoHome={handleGoHome}
        onViewInsights={() => setScreen("insights")}
        onViewHistory={() => { setHistorySessionId(null); setScreen("history"); }}
        onOpenNotes={() => setScreen("notes")}
        onOpenSettings={() => setScreen("settings")}
        onSignOut={handleSignOut}
        genzMode={profile?.genz_mode || false}
        onGenzToggle={(enabled) => setGenzMode(enabled)}
        theme={(profile?.theme as "light" | "dark") || "light"}
        onThemeToggle={(e) => handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)}
      />
      );
    }

    if (screen === "settings" && user) {
      return (
      <SettingsScreen
        userId={user.id}
        userEmail={user.email || ""}
        onGoHome={handleGoHome}
        onViewInsights={() => setScreen("insights")}
        onViewHistory={() => { setHistorySessionId(null); setScreen("history"); }}
        onOpenNotes={() => setScreen("notes")}
        onOpenSettings={() => setScreen("settings")}
        onSignOut={handleSignOut}
        genzMode={profile?.genz_mode || false}
        onGenzToggle={(enabled) => setGenzMode(enabled)}
        isPro={subscription.isPro}
        currentPeriodEnd={subscription.currentPeriodEnd}
        onUpgrade={() => setShowPaywall(true)}
      />
      );
    }

    if (screen === "notes" && user) {
      return (
      <NotesScreen
        userId={user.id}
        onGoHome={handleGoHome}
        onViewInsights={() => setScreen("insights")}
        onViewHistory={() => { setHistorySessionId(null); setScreen("history"); }}
        onOpenNotes={() => setScreen("notes")}
        onOpenSettings={() => setScreen("settings")}
        onSignOut={handleSignOut}
        genzMode={profile?.genz_mode || false}
        onGenzToggle={(enabled) => setGenzMode(enabled)}
        theme={(profile?.theme as "light" | "dark") || "light"}
        onThemeToggle={(e) => handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)}
      />
      );
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
        displayName={profile?.display_name}
        genzMode={profile?.genz_mode || false}
        onGenzToggle={(enabled) => setGenzMode(enabled)}
        onGoHome={handleGoHome}
        theme={(profile?.theme as "light" | "dark") || "light"}
        onThemeToggle={(e) => handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)}
      />
      );
    }

    // Chat
    return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="max-w-2xl mx-auto w-full flex justify-end items-center">
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            disabled={isLoading || messages.length === 1}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            end session
          </button>
        </div>
      </div>

      {/* Messages Area - Centered */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col"
      >
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              
              className={`mb-6 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Assistant Message */}
              {msg.role === "assistant" && (
                <div className="flex items-start gap-3 max-w-[80%]">
                  <div className="w-8 h-8 flex-shrink-0 mt-1">
                    <img src="/logo-icon.svg" alt="coree" className="w-full h-full object-contain" />
                  </div>
                  <div className="bg-card text-card-foreground rounded-lg px-4 py-3 shadow-sm border border-border">
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              )}

              {/* User Message */}
              {msg.role === "user" && (
                <div className="max-w-[80%]">
                  <div className="bg-primary text-primary-foreground rounded-xl px-4 py-2 shadow-sm">
                    <p className="text-base whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Loading state (inline loader in assistant avatar spot) */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-3 max-w-[80%] w-full">
                <div className="w-12 h-12 flex-shrink-0 -mt-1 -ml-2">
                  <DotLottieReact
                    src="https://lottie.host/83995e80-755a-4818-9fd1-b24763ccca9e/69WYSTeTY9.lottie"
                    loop
                    autoplay
                    className="w-full h-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="px-6 pb-6">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="max-w-2xl mx-auto"
        >
          {mode === "text" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChatInput onSend={handleSendText} disabled={isLoading} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {isLoading && (
                <VoiceVisualizer
                  isActive={isSpeaking}
                  isSpeaking={isSpeaking}
                  transcription={undefined}
                />
              )}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleVoiceToggleFixed}
                  disabled={isLoading || isSpeaking}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 ${
                    isListening
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-card shadow-sm text-muted-foreground hover:shadow-md border border-border"
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
        </form>
      </div>

      {/* End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full shadow-lg border border-border"
          >
              <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-foreground">end the session?</h2>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-muted-foreground mb-6">are you 100% sure you want to end the session?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-6 py-2 border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium"
              >
                continue
              </button>
              <button
                onClick={handleEndSession}
                disabled={isLoading}
                className="px-6 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl disabled:opacity-50 transition-colors font-medium"
              >
                end session
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    );
  };

  return (
    <>
      {renderScreen()}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        userEmail={user?.email}
        userName={(user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name}
        onSuccess={async () => {
          setShowPaywall(false);
          await subscription.refresh();
        }}
      />
    </>
  );
};

export default Index;

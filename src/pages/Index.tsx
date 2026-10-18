import {
  lazy,
  Suspense,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSession, type SessionSummary } from "@/hooks/useSession";
import { useVoice } from "@/hooks/useVoice";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/calmi/PaywallModal";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChatInput } from "@/components/calmi/ChatInput";
import { VoiceVisualizer } from "@/components/calmi/VoiceVisualizer";
import LoadingAnimation from "@/components/LoadingAnimation";
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
  trackModeUsage,
  trackVoiceListenStart,
  trackVoiceListenStop,
  trackTtsPlayed,
  trackScreenViewed,
  trackCtaClick,
  trackPageViewed,
} from "@/lib/analytics";

const LandingPage = lazy(() =>
  import("@/components/calmi/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const AuthScreen = lazy(() =>
  import("@/components/calmi/AuthScreen").then((module) => ({
    default: module.AuthScreen,
  })),
);
const HomeScreen = lazy(() =>
  import("@/components/calmi/HomeScreen").then((module) => ({
    default: module.HomeScreen,
  })),
);
const OnboardingScreen = lazy(() =>
  import("@/components/calmi/OnboardingScreen").then((module) => ({
    default: module.OnboardingScreen,
  })),
);
const SummaryScreen = lazy(() =>
  import("@/components/calmi/SummaryScreen").then((module) => ({
    default: module.SummaryScreen,
  })),
);
const HistoryScreen = lazy(() =>
  import("@/components/calmi/HistoryScreen").then((module) => ({
    default: module.HistoryScreen,
  })),
);
const InsightsScreen = lazy(() =>
  import("@/components/calmi/InsightsScreen").then((module) => ({
    default: module.InsightsScreen,
  })),
);
const MemoryScreen = lazy(() =>
  import("@/components/calmi/MemoryScreen").then((module) => ({
    default: module.MemoryScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import("@/components/calmi/SettingsScreen.tsx").then((module) => ({
    default: module.SettingsScreen,
  })),
);
const NotesScreen = lazy(() =>
  import("@/components/calmi/NotesScreen").then((module) => ({
    default: module.NotesScreen,
  })),
);
const NotFound = lazy(() => import("./NotFound"));
const DotLottieReact = lazy(() =>
  import("@lottiefiles/dotlottie-react").then((module) => ({
    default: module.DotLottieReact,
  })),
);

type AppScreen =
  | "landing"
  | "auth"
  | "home"
  | "onboarding"
  | "chat"
  | "summary"
  | "history"
  | "insights"
  | "memory"
  | "ending"
  | "settings"
  | "notes";

const SCREEN_TO_PATH: Record<AppScreen, string> = {
  landing: "/",
  auth: "/auth",
  home: "/home",
  onboarding: "/onboarding",
  chat: "/chat",
  summary: "/summary",
  ending: "/ending",
  history: "/history",
  insights: "/insights",
  memory: "/memory",
  settings: "/settings",
  notes: "/journal",
};

const PATH_TO_SCREEN: Record<string, AppScreen> = {
  "/": "landing",
  "/auth": "auth",
  "/home": "home",
  "/onboarding": "onboarding",
  "/chat": "chat",
  "/summary": "summary",
  "/ending": "ending",
  "/history": "history",
  "/insights": "insights",
  "/memory": "memory",
  "/settings": "settings",
  "/journal": "notes",
};

const GREETING = "How are you feeling right now?";
const INITIAL_AI_MESSAGE =
  "Hey there! How's it going? What's on your mind today?";

const ENDING_MESSAGES = [
  "You did great today ✨",
  "Wrapping up your session…",
  "Summarising your thoughts…",
];

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const userId = user?.id;
  const {
    profile,
    loading: profileLoading,
    completeOnboarding,
    setGenzMode,
    setTheme,
  } = useProfile(user?.id);
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
  const {
    isListening,
    isSpeaking,
    liveTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoice();

  const [screen, setScreen] = useState<AppScreen>(
    () => PATH_TO_SCREEN[location.pathname] ?? "landing",
  );
  const currentPathRef = useRef(location.pathname);
  currentPathRef.current = location.pathname;
  const goToScreen = useCallback(
    (next: AppScreen) => {
      setScreen(next);
      const target = SCREEN_TO_PATH[next];
      if (target !== currentPathRef.current) {
        navigate(target, { replace: next === "summary" });
      }
    },
    [navigate],
  );
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
    if (userId) {
      setUserProperties({ user_id: userId });
    } else {
      resetUserProperties();
    }
  }, [userId]);

  useEffect(() => {
    if (sessionId) {
      setUserProperties({ session_id: sessionId });
    }
  }, [sessionId]);

  // ─── URL ↔ screen sync ───
  // When URL changes (back/forward), reflect into screen state
  useEffect(() => {
    const next = PATH_TO_SCREEN[location.pathname];
    if (!next) return;
    // Only auto-switch if user is allowed on that screen
    if (!userId && next !== "landing" && next !== "auth") return;
    setScreen((current) => (current === next ? current : next));
    // Track every route change as a page view
    trackPageViewed(location.pathname);
    trackScreenViewed(location.pathname);
  }, [location.pathname, userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      if (screen !== "auth" && screen !== "landing") goToScreen("landing");
      return;
    }
    if (profileLoading) return;
    if (profile && !profile.onboarding_completed && screen !== "onboarding") {
      goToScreen("onboarding");
    } else if (screen === "landing" || screen === "auth") {
      goToScreen("home");
    }
  }, [userId, authLoading, profile, profileLoading, screen, goToScreen]);

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

  const handleOnboardingComplete = useCallback(
    async (intent: string) => {
      await completeOnboarding(intent);
      goToScreen("home");
    },
    [completeOnboarding, goToScreen],
  );

  const startConversation = useCallback(
    async (selectedMode: "text" | "voice" = "text") => {
      if (!user) return;
      setMode(selectedMode);
      trackModeChanged(selectedMode);
      const newSessionId = await startSession(selectedMode);
      if (!newSessionId) return;
      trackSessionStarted(newSessionId, selectedMode);
      trackModeUsage(selectedMode, "session", newSessionId);
      let openingMessage = INITIAL_AI_MESSAGE;
      let openingTrace: string[] = [];
      try {
        const { data, error } = await supabase.functions.invoke("memory", {
          body: { action: "check-in" },
        });
        if (error) throw error;
        if (typeof data?.message === "string" && data.message.trim()) {
          openingMessage = data.message.trim();
          openingTrace = Array.isArray(data.memoryTrace)
            ? data.memoryTrace.filter(
                (id: unknown): id is string => typeof id === "string",
              )
            : [];
        }
      } catch (error) {
        console.error("Check-in unavailable; using standard greeting:", error);
      }
      const { error: openingSaveError } = await supabase
        .from("messages")
        .insert({
          session_id: newSessionId,
          user_id: user.id,
          role: "assistant",
          content: openingMessage,
          memory_trace: openingTrace,
        });
      if (openingSaveError) {
        console.error(
          "Could not persist the session opening:",
          openingSaveError,
        );
        toast({
          title: "Opening message not saved",
          description:
            "Your session is open, but this greeting may not appear in history.",
          variant: "destructive",
        });
      }
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: openingMessage,
          memoryTrace: openingTrace,
        },
      ]);
      goToScreen("chat");
      trackScreenViewed("chat");
    },
    [startSession, setMessages, user, goToScreen],
  );

  const handleStartConversation = useCallback(
    async (selectedMode: "text" | "voice" = "text") => {
      trackCtaClick("start_conversation", "home");
      if (
        PAYMENTS_ENABLED &&
        selectedMode === "voice" &&
        !subscription.loading &&
        !subscription.canStartVoice
      ) {
        trackCtaClick("paywall_shown", "start_conversation");
        setShowPaywall(true);
        return;
      }
      await startConversation(selectedMode);
    },
    [startConversation, subscription.loading, subscription.canStartVoice],
  );

  const handleEndSession = useCallback(async () => {
    trackCtaClick("end_session_confirm", "chat", {
      message_count: messages.length,
      mode,
    });
    setShowEndConfirm(false);
    stopSpeaking();
    goToScreen("ending");
    const result = await endSession();
    if (result) {
      trackSessionEnded(
        sessionId || "",
        result.duration,
        result.messageCount,
        mode,
      );
    }
    setSummaryData(result);
    goToScreen("summary");
    trackScreenViewed("summary");
  }, [endSession, messages.length, mode, stopSpeaking, sessionId, goToScreen]);

  const handleGoHome = useCallback(() => {
    setSummaryData(null);
    goToScreen("home");
  }, [goToScreen]);

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

  const handleOpenSession = useCallback(
    (sid: string) => {
      setHistorySessionId(sid);
      goToScreen("history");
    },
    [goToScreen],
  );

  const handleThemeChange = useCallback(
    (theme: "light" | "dark", event?: React.MouseEvent) => {
      toggleThemeWithTransition(event ?? null, () => setTheme(theme));
    },
    [setTheme],
  );

  const handleSendText = useCallback(
    async (content: string) => {
      trackMessageSent(sessionId || "", "text");
      await sendMessage(content, profile?.genz_mode || false);
      trackResponseReceived(sessionId || "");
    },
    [sendMessage, sessionId, profile?.genz_mode],
  );

  const handleVoiceToggleFixed = useCallback(async () => {
    if (isListening) {
      trackVoiceListenStop(sessionId || undefined);
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
      trackVoiceListenStart(sessionId || undefined);
      trackCtaClick("mic_start", "chat", { session_id: sessionId || "" });
      // startListening returns a promise that resolves when stopListening calls resolve
      transcriptPromiseRef.current = startListening(sessionId || undefined);
    }
  }, [
    isListening,
    startListening,
    stopListening,
    sendMessage,
    sessionId,
    profile?.genz_mode,
  ]);

  // In voice mode: speak assistant response, then auto-listen
  useEffect(() => {
    if (mode !== "voice" || isLoading || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && last.id !== spokenMessageIdRef.current) {
      spokenMessageIdRef.current = last.id;
      trackTtsPlayed(sessionId || undefined, undefined);
      speak(last.content, sessionId || undefined);
    }
  }, [messages, mode, isLoading, sessionId, speak]);

  // Mic stays off by default - user must tap to start listening

  const userMetadata = user?.user_metadata as
    Record<string, unknown> | undefined;
  const getMetadataName = (...keys: string[]) => {
    for (const key of keys) {
      const value = userMetadata?.[key];
      if (typeof value === "string") return value;
    }
    return "";
  };

  const renderScreen = () => {
    if (!PATH_TO_SCREEN[location.pathname]) {
      return <NotFound />;
    }

    if (authLoading || (user && profileLoading)) {
      return <LoadingAnimation />;
    }

    if (screen === "landing" && !user) {
      return (
        <LandingPage
          onGetStarted={() => goToScreen("auth")}
          onLogin={() => goToScreen("auth")}
        />
      );
    }

    if (screen === "auth" && !user) {
      return <AuthScreen onBack={() => goToScreen("landing")} />;
    }

    if (screen === "onboarding") {
      const nameFromMeta = getMetadataName("full_name", "name", "first_name");
      const displayName = profile?.display_name || nameFromMeta || "";
      return (
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
          displayName={displayName}
        />
      );
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Generating your session insights
            </h2>
            <p className="text-sm text-gray-600">
              Hang tight - we're summarizing your conversation and extracting
              useful insights. This may take a moment.
            </p>
            <div className="mt-4 inline-flex items-center gap-3 justify-center">
              <span className="text-2xl">✋</span>
              <span className="text-sm text-muted-foreground">
                Preparing insights…
              </span>
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
          onViewInsights={() => goToScreen("insights")}
          onViewHistory={() => {
            setHistorySessionId(null);
            goToScreen("history");
          }}
          onOpenNotes={() => goToScreen("notes")}
          onOpenSettings={() => goToScreen("settings")}
          onSignOut={handleSignOut}
          genzMode={profile?.genz_mode || false}
          onGenzToggle={(enabled) => setGenzMode(enabled)}
          theme={(profile?.theme as "light" | "dark") || "light"}
          onThemeToggle={(e) =>
            handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)
          }
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
          onViewInsights={() => goToScreen("insights")}
          onViewHistory={() => {
            setHistorySessionId(null);
            goToScreen("history");
          }}
          onOpenNotes={() => goToScreen("notes")}
          onOpenSettings={() => goToScreen("settings")}
          onSignOut={handleSignOut}
          genzMode={profile?.genz_mode || false}
          onGenzToggle={(enabled) => setGenzMode(enabled)}
          theme={(profile?.theme as "light" | "dark") || "light"}
          onThemeToggle={(e) =>
            handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)
          }
        />
      );
    }

    if (screen === "memory" && user) {
      return (
        <MemoryScreen
          key={user.id}
          userId={user.id}
          onGoHome={handleGoHome}
          onViewInsights={() => goToScreen("insights")}
          onViewHistory={() => {
            setHistorySessionId(null);
            goToScreen("history");
          }}
          onOpenNotes={() => goToScreen("notes")}
          onOpenSettings={() => goToScreen("settings")}
          onSignOut={handleSignOut}
          genzMode={profile?.genz_mode || false}
          onGenzToggle={(enabled) => setGenzMode(enabled)}
          theme={(profile?.theme as "light" | "dark") || "light"}
          onThemeToggle={(e) =>
            handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)
          }
        />
      );
    }

    if (screen === "settings" && user) {
      return (
        <SettingsScreen
          userId={user.id}
          userEmail={user.email || ""}
          onGoHome={handleGoHome}
          onViewInsights={() => goToScreen("insights")}
          onViewHistory={() => {
            setHistorySessionId(null);
            goToScreen("history");
          }}
          onOpenNotes={() => goToScreen("notes")}
          onOpenSettings={() => goToScreen("settings")}
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
          onViewInsights={() => goToScreen("insights")}
          onViewHistory={() => {
            setHistorySessionId(null);
            goToScreen("history");
          }}
          onOpenNotes={() => goToScreen("notes")}
          onOpenSettings={() => goToScreen("settings")}
          onSignOut={handleSignOut}
          genzMode={profile?.genz_mode || false}
          onGenzToggle={(enabled) => setGenzMode(enabled)}
          theme={(profile?.theme as "light" | "dark") || "light"}
          onThemeToggle={(e) =>
            handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)
          }
        />
      );
    }

    if (screen === "home" && user) {
      return (
        <HomeScreen
          onStartConversation={handleStartConversation}
          onSignOut={handleSignOut}
          onViewHistory={() => {
            setHistorySessionId(null);
            goToScreen("history");
          }}
          onViewInsights={() => goToScreen("insights")}
          onOpenSession={handleOpenSession}
          onOpenSettings={() => goToScreen("settings")}
          onOpenNotes={() => goToScreen("notes")}
          userId={user.id}
          displayName={profile?.display_name}
          genzMode={profile?.genz_mode || false}
          onGenzToggle={(enabled) => setGenzMode(enabled)}
          onGoHome={handleGoHome}
          theme={(profile?.theme as "light" | "dark") || "light"}
          onThemeToggle={(e) =>
            handleThemeChange(profile?.theme === "light" ? "dark" : "light", e)
          }
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
                      <img
                        src="/logo-icon.svg"
                        alt="core"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="bg-card text-card-foreground rounded-lg px-4 py-3 shadow-sm border border-border">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* User Message */}
                {msg.role === "user" && (
                  <div className="max-w-[80%]">
                    <div className="bg-primary text-primary-foreground rounded-xl px-4 py-2 shadow-sm">
                      <p className="text-base whitespace-pre-wrap">
                        {msg.content}
                      </p>
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
                <h2 className="text-lg font-semibold text-foreground">
                  end the session?
                </h2>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-muted-foreground mb-6">
                are you 100% sure you want to end the session?
              </p>
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
      <Suspense fallback={<LoadingAnimation />}>
        {renderScreen()}
        {PAYMENTS_ENABLED && (
          <PaywallModal
            open={showPaywall}
            onClose={() => setShowPaywall(false)}
            userEmail={user?.email}
            userName={getMetadataName("full_name", "name") || undefined}
            onSuccess={async () => {
              setShowPaywall(false);
              await subscription.refresh();
            }}
          />
        )}
      </Suspense>
    </>
  );
};

export default Index;

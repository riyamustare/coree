/**
 * Lightweight event tracking utility.
 * Logs structured events to console for now — swap with any analytics provider later.
 * Event names are short (4-5 words max), lowercase, underscore-separated.
 */

type EventProperties = Record<string, string | number | boolean | null | undefined>;

function track(event: string, properties?: EventProperties) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...properties,
  };
  console.log(`[event] ${event}`, payload);
}

// ── Auth Events ──
export const authSignUpStarted = () => track("auth_signup_started");
export const authSignUpSuccess = () => track("auth_signup_success");
export const authLoginStarted = () => track("auth_login_started");
export const authLoginSuccess = () => track("auth_login_success");
export const authLoginFailed = (reason: string) => track("auth_login_failed", { reason });
export const authSignedOut = () => track("auth_signed_out");

// ── Onboarding Events ──
export const onboardingStarted = () => track("onboarding_started");
export const onboardingIntentSelected = (intent: string) => track("onboarding_intent_selected", { intent });
export const onboardingCompleted = () => track("onboarding_completed");

// ── Session Events ──
export const sessionStarted = (sessionId: string) => track("session_started", { sessionId });
export const sessionEnded = (sessionId: string, durationSec: number) => track("session_ended", { sessionId, durationSec });
export const sessionSummaryReceived = (sessionId: string) => track("session_summary_received", { sessionId });

// ── Chat Events ──
export const messageSent = (sessionId: string) => track("message_sent", { sessionId });
export const responseReceived = (sessionId: string) => track("response_received", { sessionId });
export const responseFailed = (sessionId: string) => track("response_failed", { sessionId });

// ── Mode Events ──
export const modeSwitchedToText = () => track("mode_switched_text");
export const modeSwitchedToVoice = () => track("mode_switched_voice");

// ── Voice Events ──
export const voiceListenStarted = () => track("voice_listen_started");
export const voiceListenStopped = () => track("voice_listen_stopped");
export const voiceTtsStarted = () => track("voice_tts_started");
export const voiceTtsCompleted = () => track("voice_tts_completed");
export const voiceTtsFailed = () => track("voice_tts_failed");

// ── Navigation Events ──
export const screenViewed = (screen: string) => track("screen_viewed", { screen });
export const landingGetStarted = () => track("landing_get_started");
export const landingSignIn = () => track("landing_sign_in");
export const historyCardOpened = (sessionId: string) => track("history_card_opened", { sessionId });
export const insightsViewed = () => track("insights_viewed");

// ── Feedback Events ──
export const feedbackOpened = () => track("feedback_opened");
export const feedbackSubmitted = () => track("feedback_submitted");

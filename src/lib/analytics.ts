/**
 * Lightweight analytics event tracker.
 * Logs structured events that can be piped to Amplitude, Mixpanel, etc.
 * Currently logs to console; replace `dispatch` with your analytics SDK call.
 */

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

interface UserProperties {
  user_id?: string;
  session_id?: string;
  [key: string]: string | number | boolean | null | undefined;
}

let _userProps: UserProperties = {};

/** Set persistent user properties attached to every event */
export function setUserProperties(props: UserProperties) {
  _userProps = { ..._userProps, ...props };
}

/** Clear user properties (on sign out) */
export function resetUserProperties() {
  _userProps = {};
}

function dispatch(eventName: string, properties: EventProperties) {
  const payload = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ..._userProps,
    ...properties,
  };
  // Replace with analytics SDK call (e.g. amplitude.track(eventName, payload))
  console.debug("[analytics]", eventName, payload);
  // Forward to Google Analytics (gtag) when available
  try {
    const gtag = (window as Window & {
      gtag?: (command: string, name: string, parameters: EventProperties) => void;
    }).gtag;
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        ..._userProps,
        ...properties,
      });
    }
  } catch {
    /* no-op */
  }
}

// ─── Auth Events ───
export function trackSignUp() {
  dispatch("user_signed_up", {});
}
export function trackSignIn() {
  dispatch("user_signed_in", {});
}
export function trackSignOut() {
  dispatch("user_signed_out", {});
}

// ─── Onboarding Events ───
export function trackOnboardingStarted() {
  dispatch("onboarding_started", {});
}
export function trackOnboardingCompleted(intent: string) {
  dispatch("onboarding_completed", { intent });
}

// ─── Session Events ───
export function trackSessionStarted(sessionId: string, mode: "text" | "voice" = "text") {
  dispatch("session_started", { session_id: sessionId, mode });
}
export function trackSessionEnded(sessionId: string, durationSec: number, messageCount: number, mode: "text" | "voice" = "text") {
  dispatch("session_ended", { session_id: sessionId, duration_sec: durationSec, message_count: messageCount, mode });
}
export function trackSessionCompleted(sessionId: string, durationSec: number, messageCount: number, mode: "text" | "voice" = "text") {
  dispatch("session_completed", { session_id: sessionId, duration_sec: durationSec, message_count: messageCount, mode });
}
export function trackDay7Return(daysSinceLastSession: number, sessionId?: string) {
  dispatch("day_7_return", { days_since_last_session: daysSinceLastSession, session_id: sessionId ?? null });
}

// ─── Chat Events ───
export function trackMessageSent(sessionId: string, mode: "text" | "voice") {
  dispatch("message_sent", { session_id: sessionId, mode });
}
export function trackResponseReceived(sessionId: string, latencyMs?: number) {
  dispatch("response_received", { session_id: sessionId, latency_ms: latencyMs ?? null });
}

// ─── Mode Events ───
export function trackModeChanged(mode: "text" | "voice") {
  dispatch("mode_changed", { mode });
}
export function trackModeUsage(mode: "text" | "voice", source: "session" | "message" = "session", sessionId?: string) {
  dispatch("mode_usage", { mode, source, session_id: sessionId ?? null });
}

// ─── Voice Events ───
export function trackVoiceListenStart(sessionId?: string) {
  dispatch("voice_listen_started", { session_id: sessionId ?? null });
}
export function trackVoiceListenStop(sessionId?: string) {
  dispatch("voice_listen_stopped", { session_id: sessionId ?? null });
}
export function trackVoiceStageLatency(stage: "asr" | "llm" | "tts", latencyMs: number, sessionId?: string, mode?: "text" | "voice") {
  dispatch("voice_stage_latency", { stage, latency_ms: latencyMs, session_id: sessionId ?? null, mode: mode ?? null });
}
export function trackTtsPlayed(sessionId?: string, latencyMs?: number) {
  dispatch("tts_played", { session_id: sessionId ?? null, latency_ms: latencyMs ?? null });
}

// ─── Navigation Events ───
export function trackScreenViewed(screen: string) {
  dispatch("screen_viewed", { screen });
}
export function trackHistoryOpened(sessionId: string) {
  dispatch("history_opened", { session_id: sessionId });
}

// ─── Feedback Events ───
export function trackFeedbackSubmitted() {
  dispatch("feedback_submitted", {});
}

// ─── Generic UX Events ───
/** Track a navigation click (sidebar, header, tab, in-app link) */
export function trackNavClick(destination: string, source: string = "sidebar") {
  dispatch("nav_clicked", { destination, source });
}

/** Track a CTA / button click for funnel analysis */
export function trackCtaClick(
  cta: string,
  location: string,
  extra: EventProperties = {}
) {
  dispatch("cta_clicked", { cta, location, ...extra });
}

/** Track a low-level UI click with contextual properties */
export function trackClick(
  element: string,
  location: string,
  extra: EventProperties = {}
) {
  dispatch("ui_clicked", { element, location, ...extra });
}

/** Track a marketing/landing page view (route-level) */
export function trackPageViewed(page: string, variant?: string) {
  dispatch("page_viewed", { page, variant: variant ?? null });
}

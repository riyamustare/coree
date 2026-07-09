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
    const w = window as any;
    if (typeof w !== "undefined" && typeof w.gtag === "function") {
      w.gtag("event", eventName, {
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
export function trackSessionStarted(sessionId: string) {
  dispatch("session_started", { session_id: sessionId });
}
export function trackSessionEnded(sessionId: string, durationSec: number, messageCount: number) {
  dispatch("session_ended", { session_id: sessionId, duration_sec: durationSec, message_count: messageCount });
}

// ─── Chat Events ───
export function trackMessageSent(sessionId: string, mode: "text" | "voice") {
  dispatch("message_sent", { session_id: sessionId, mode });
}
export function trackResponseReceived(sessionId: string) {
  dispatch("response_received", { session_id: sessionId });
}

// ─── Mode Events ───
export function trackModeChanged(mode: "text" | "voice") {
  dispatch("mode_changed", { mode });
}

// ─── Voice Events ───
export function trackVoiceListenStart() {
  dispatch("voice_listen_started", {});
}
export function trackVoiceListenStop() {
  dispatch("voice_listen_stopped", {});
}
export function trackTtsPlayed() {
  dispatch("tts_played", {});
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
export function trackCtaClick(cta: string, location: string) {
  dispatch("cta_clicked", { cta, location });
}

/** Track a marketing/landing page view (route-level) */
export function trackPageViewed(page: string, variant?: string) {
  dispatch("page_viewed", { page, variant: variant ?? null });
}

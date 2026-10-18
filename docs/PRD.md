# Core — Product Requirements Document

A simple, plain-language overview of what Core is, who it's for, and how every part of the product works.

---

## 1. What is Core?

Core is a warm, AI-powered companion for emotional check-ins. Users can talk or type to it like a wise friend — for 10 to 30 minutes at a time — to vent, reflect, or process what they're feeling. It is **not** a therapist, doesn't diagnose, and isn't a replacement for professional care.

**Persona:** caring, brief, curious. Replies are at most 2 sentences (~100 tokens) and usually end with an open question.

**Scope:** emotional support only. If a user is in crisis, Core responds with empathy and gently suggests reaching out to a professional.

---

## 2. Who it's for

- People who want a low-friction space to talk through feelings between (or instead of) journaling.
- Users who prefer voice over typing.
- People curious about emotional patterns over time (mood trends, weekly insights).

---

## 3. Core flows

### 3.1 First-time user
1. Lands on **Landing Page** → signs up (email/password).
2. Goes through **Onboarding**: picks a name and a short "what brings you here" intent.
3. Lands on **Home Screen**.

### 3.2 Returning user
1. Auto-signed in → **Home Screen**.
2. Sees a greeting (good morning/afternoon/evening + name), recent past conversations, and entry points to Journal, Insights, History, Settings.

### 3.3 A conversation
1. Tap **Start a conversation** → enters Chat Screen.
2. Chooses **text** or **voice** mode (toggle in header). Mic is **always off by default** — user must tap to start recording.
3. User sends messages → AI replies (streamed in text, spoken via TTS in voice mode).
4. Tap **End** → loading state ("Summarising your session…") → Summary Screen.

### 3.4 After a session
- Summary Screen shows what was discussed and the dominant emotions.
- Long-term memories are extracted in the background for future sessions.

---

## 4. Features

### 4.1 Chat (text + voice)
- **Text mode:** standard input, streamed responses (token-by-token).
- **Voice mode:** browser-native speech-to-text (Web Speech API), responses played via ElevenLabs TTS.
- **Mic behavior:** always off until user taps it. No auto-listen.
- **Layout:** header (logo, timer, mode toggle, End) is fixed at top; input/mic is fixed at bottom; messages scroll between them (WhatsApp-style).
- **Loading state on End:** prevents double-tap and reassures the user the summary is being generated.

### 4.2 Long-term memory
- In FalkorDB mode, the memory agent extracts explicit entities, facts, procedures, and goals into a graph dedicated to the authenticated user. Supabase Postgres remains the source of truth for identity, sessions, and messages; the `memories` table is retained as a fallback.
- Before each reply, the companion agent recalls relevant graph nodes and injects them as a compact “What I remember” block. Facts retain source episodes and changed values supersede prior facts without deleting history.
- Assistant messages store the IDs used in `memory_trace`; the UI explains the source episodes and lets users inspect, forget, or delete saved graph memory.
- After a session, a user-scoped handoff gives the check-in agent context for the next session's opening message.
- **Prompt context per turn:** system prompt + retrieved memories + last 5 dialogue exchanges + last 3 session summaries with dominant emotions.

### 4.3 Past Conversations (Home)
- Shows the **5 most recent saved conversations** pulled from the same source as the History page.
- Each card is clickable and opens that conversation in the History view.
- Only conversations that meet the save criteria appear (see §5).

### 4.4 History
- Full list of all saved conversations.
- Tap a session to read the full transcript and summary.

### 4.5 Insights
- Shows totals: conversations, messages, journal entries.
- **Mood radar / weekly insights** unlock once total activity (sessions + journals) ≥ 3.
- Insights factor in **both** conversations and journal entries.

### 4.6 Journal (Notes)
- Private text or voice entries — a place to "type or speak your heart out".
- Voice input uses the same speech-to-text pipeline as chat.
- Full CRUD (create, edit, delete).
- Counts toward Insights activity.

### 4.7 Gen-Z mode
- Toggle on Home Screen.
- When on, the LLM persona is overridden to use Gen-Z slang (e.g., "no cap", "vibe check") while keeping the same emotional-support scope and brevity.

### 4.8 Settings
- **Privacy:** account info.
- **Usage analytics:** session and message counts.
- **Appearance:** Light / Dark mode toggle (persisted in `profiles.theme`).
- **Danger Zone:** reset history, delete account.

### 4.9 Feedback
- Modal accessible from Home for users to send free-text feedback.

---

## 5. Conversation save logic

Not every started conversation is saved. This keeps History and Insights meaningful.

**A conversation is saved only if:**
- Duration is **≥ 1 minute**, AND
- It contains **more than 1 user message**.

Sessions that fail this check are silently deleted (both the session row and its messages) when the user ends the chat.

**On Home Screen "Past Conversations":**
- Source = same query as History page.
- Additional filter: only sessions with **duration > 5 minutes** are shown (matches History page filter).
- Limit: most recent **5**.

---

## 6. AI behavior rules

- **Model:** Gemini 2.5 Flash Lite (via Lovable AI Gateway) — fastest/cheapest, ideal for short replies.
- **Max length:** 2 sentences, ~100 tokens.
- **Style:** brief, crisp, varied. Always end with an open question (unless closing the session).
- **Scope rule:** therapy-style emotional support only. Never diagnose or prescribe.
- **Crisis rule:** respond with empathy first, then gently suggest professional help.
- **Personalization:** uses the user's name, onboarding intent, retrieved memories, and recent emotional history.

---

## 7. Data model (plain English)

| Table       | What it stores                                                                 |
|-------------|--------------------------------------------------------------------------------|
| `profiles`  | Name, onboarding intent, gen-z toggle, theme (light/dark), onboarding status.  |
| `sessions`  | One row per conversation: start/end time, summary, dominant emotions (JSON).   |
| `messages`  | Every message in every saved session (role: user/assistant, content, time).    |
| `memories`  | Legacy Postgres summary fallback; FalkorDB stores structured long-term memory. |
| `notes`     | Journal entries (title, content, timestamps).                                  |
| `feedback`  | Free-text user feedback.                                                       |

All tables have row-level security: users can only see and modify their own rows.

---

## 8. Voice & latency rules

- **STT:** Web Speech API in the browser (zero server round-trip) for chat. The `/speech-to-text` edge function (Whisper) is used as a fallback and for journal voice input.
- **TTS:** ElevenLabs `eleven_turbo_v2_5`, voice "Laura". Streaming audio for low latency.
- **Mic:** always starts off; user controls it explicitly.
- **Chat streaming:** SSE — tokens render as they arrive so the user sees a response immediately.

---

## 9. Analytics

Every meaningful user and backend action emits an event with `user_id` and `session_id` properties. The full catalog (event names, descriptions, properties) lives in [`docs/EVENTS.md`](./EVENTS.md). Events are currently logged to `console.debug` and can be wired into Amplitude / Mixpanel / PostHog by swapping the `dispatch()` function in `src/lib/analytics.ts`.

---

## 10. Out of scope (for now)

- Group sessions / shared conversations.
- Live human therapist handoff.
- Mobile native apps.
- Diagnostic tools, medication tracking, or any clinical features.

---

## 11. Success signals

- Users return for multiple sessions in a week (retention).
- Average session duration in the 5–20 minute range.
- Journal + conversation activity grows together (both surfaces used).
- Insights unlock rate (% of users hitting the 3-activity threshold).

---

_Last updated to reflect current product behavior. For event-level analytics see `docs/EVENTS.md`. For system architecture see `README.md`._
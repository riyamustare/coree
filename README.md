# Calmi — AI Therapy Companion

A warm, emotionally attuned AI companion for mental wellness conversations. Built with React, Supabase, and ElevenLabs.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │ Landing   │  │ Auth     │  │ Onboarding│             │
│  │ Page      │  │ Screen   │  │ Screen    │             │
│  └──────────┘  └──────────┘  └───────────┘             │
│                                                         │
│  ┌──────────────────────────────────────────┐           │
│  │         Chat Screen (Text / Voice)       │           │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐ │           │
│  │  │Session  │  │Message   │  │Chat     │ │           │
│  │  │Header   │  │Block     │  │Input    │ │           │
│  │  └─────────┘  └──────────┘  └─────────┘ │           │
│  │  ┌──────────────────────────────┐       │           │
│  │  │ VoiceVisualizer + Mic Button │       │           │
│  │  └──────────────────────────────┘       │           │
│  └──────────────────────────────────────────┘           │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │ Summary  │  │ History  │  │ Insights  │             │
│  │ Screen   │  │ Screen   │  │ Screen    │             │
│  └──────────┘  └──────────┘  └───────────┘             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (Lovable Cloud)                    │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │           Edge Functions                 │            │
│  │                                         │            │
│  │  /chat          → Streaming LLM (Gemini)│            │
│  │  /end-session   → Summary + Emotions    │            │
│  │  /text-to-speech→ ElevenLabs TTS        │            │
│  │  /speech-to-text→ Whisper STT           │            │
│  └─────────────────────────────────────────┘            │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │           Database (Postgres)            │            │
│  │                                         │            │
│  │  profiles   → user prefs, onboarding    │            │
│  │  sessions   → session metadata, summary │            │
│  │             emotions (JSONB)            │            │
│  │  messages   → full chat logs per session│            │
│  │  memories   → extracted insights w/     │            │
│  │             embeddings for RAG          │            │
│  │  feedback   → user feedback             │            │
│  └─────────────────────────────────────────┘            │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │           Auth (Email/Password)          │            │
│  └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              External APIs                              │
│                                                         │
│  • Lovable AI Gateway (Gemini 2.5 Flash Lite)           │
│    – Chat completions (streaming SSE)                   │
│    – Session summarization & emotion extraction         │
│    – Memory extraction                                  │
│                                                         │
│  • ElevenLabs (eleven_turbo_v2_5)                       │
│    – Text-to-Speech with streaming audio                │
│    – Voice: Laura (FGY2WhTYpPnrIDTdsKH5)               │
│                                                         │
│  • Web Speech API (browser-native)                      │
│    – Speech-to-Text (zero latency, no server round-trip)│
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Text Mode
1. User types message → `sendMessage()` stores in DB → streams to `/chat` edge function
2. LLM response streamed back via SSE → rendered token-by-token in `MessageBlock`

### Voice Mode
1. User speaks → Web Speech API transcribes in real-time (browser-native, zero latency)
2. Final transcript sent to `/chat` edge function (same as text)
3. Assistant response sent to `/text-to-speech` → ElevenLabs streaming audio
4. After TTS playback ends, auto-listen triggers after 400ms for hands-free conversation

### Session End
1. `/end-session` edge function receives session ID
2. Fetches all messages, generates summary + emotion analysis via LLM
3. Extracts memories for future session context (RAG)
4. Returns summary to client → shown on Summary Screen

## Key Design Decisions

- **Gemini 2.5 Flash Lite** for chat: fastest + cheapest model, ideal for short therapeutic responses
- **Streaming SSE** for chat: tokens appear as they're generated, reducing perceived latency
- **Browser-native STT**: eliminates server round-trip for speech recognition
- **ElevenLabs Turbo v2.5**: optimized for low-latency streaming TTS
- **2-sentence max responses**: enforced via system prompt + `max_tokens: 100`
- **Memory system**: extracts key insights from sessions for cross-session continuity

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui
- **Backend**: Supabase (Lovable Cloud) — Postgres, Auth, Edge Functions (Deno)
- **AI**: Lovable AI Gateway (Gemini), ElevenLabs TTS
- **Voice**: Web Speech API (STT), ElevenLabs (TTS)

## Development

```sh
npm i
npm run dev
```

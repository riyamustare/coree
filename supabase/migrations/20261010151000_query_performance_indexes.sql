CREATE INDEX IF NOT EXISTS idx_sessions_user_started_at
  ON public.sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.messages (user_id);

CREATE INDEX IF NOT EXISTS idx_messages_session_created_at
  ON public.messages (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated_at
  ON public.notes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_user_id
  ON public.memories (user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id
  ON public.feedback (user_id);

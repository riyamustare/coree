ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS memory_trace JSONB NOT NULL DEFAULT '[]'::jsonb;

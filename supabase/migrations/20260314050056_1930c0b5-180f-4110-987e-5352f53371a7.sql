
-- Drop the failed objects and recreate with vector in public schema
DROP INDEX IF EXISTS idx_memories_embedding;
DROP FUNCTION IF EXISTS public.match_memories;
DROP TABLE IF EXISTS public.memories;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.sessions;
DROP EXTENSION IF EXISTS vector;

-- Enable pgvector in public schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_messages_session_id ON public.messages(session_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Create memories table with vector column
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding public.vector(768),
  source_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories" ON public.memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own memories" ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create HNSW index for vector similarity search (better for small datasets)
CREATE INDEX idx_memories_embedding ON public.memories USING hnsw (embedding public.vector_cosine_ops);

-- Create function for similarity search
CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding public.vector(768),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    memories.id,
    memories.content,
    1 - (memories.embedding <=> query_embedding) AS similarity
  FROM memories
  WHERE memories.user_id = match_user_id
    AND 1 - (memories.embedding <=> query_embedding) > match_threshold
  ORDER BY memories.embedding <=> query_embedding
  LIMIT match_count;
$$;

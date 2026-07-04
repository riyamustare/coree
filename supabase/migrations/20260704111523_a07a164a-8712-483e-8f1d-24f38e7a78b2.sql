CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  looking_for text NOT NULL,
  city text NOT NULL DEFAULT 'Bangalore',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 120
    AND char_length(phone) BETWEEN 5 AND 32
    AND char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(looking_for) BETWEEN 1 AND 500
    AND char_length(city) BETWEEN 1 AND 80
  );

CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at DESC);
CREATE UNIQUE INDEX waitlist_email_lower_idx ON public.waitlist (lower(email));
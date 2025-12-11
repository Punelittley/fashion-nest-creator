-- Create table for dynamic prefixes
CREATE TABLE public.squid_prefixes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  price bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squid_prefixes ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role can do everything on squid_prefixes" 
ON public.squid_prefixes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add last_rob_time column to players
ALTER TABLE public.squid_players 
ADD COLUMN IF NOT EXISTS last_rob_time timestamp with time zone DEFAULT NULL;

-- Insert default prefixes
INSERT INTO public.squid_prefixes (name, price) VALUES 
  ('absolute', 2000000),
  ('emperror', 3000000)
ON CONFLICT (name) DO NOTHING;
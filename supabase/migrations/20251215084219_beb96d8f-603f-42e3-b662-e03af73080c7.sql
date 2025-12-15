-- Create bot settings table to track bot state
CREATE TABLE public.squid_bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default bot enabled state
INSERT INTO public.squid_bot_settings (key, value) VALUES ('bot_enabled', 'true');

-- Enable RLS
ALTER TABLE public.squid_bot_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage bot settings"
ON public.squid_bot_settings
FOR ALL
USING (true)
WITH CHECK (true);
-- Add casino_downgrade field to squid_players for reduced winning chances
ALTER TABLE public.squid_players 
ADD COLUMN IF NOT EXISTS casino_downgrade boolean DEFAULT false;
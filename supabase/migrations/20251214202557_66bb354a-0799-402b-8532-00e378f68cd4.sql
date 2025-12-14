-- Add premium status and expiration to players
ALTER TABLE public.squid_players 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_expires_at timestamp with time zone DEFAULT NULL;
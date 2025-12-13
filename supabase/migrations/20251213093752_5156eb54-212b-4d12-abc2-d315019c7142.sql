-- Add referral and gift columns to squid_players
ALTER TABLE public.squid_players
  ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES public.squid_players(id),
  ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_count integer NOT NULL DEFAULT 0;
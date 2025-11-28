-- Add casino admin mode flag to squid_players
ALTER TABLE public.squid_players ADD COLUMN casino_admin_mode BOOLEAN DEFAULT false;
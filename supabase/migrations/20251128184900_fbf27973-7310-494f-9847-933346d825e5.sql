-- Change balance column type from integer to bigint to support larger values
ALTER TABLE public.squid_players 
ALTER COLUMN balance TYPE bigint;

ALTER TABLE public.squid_players 
ALTER COLUMN total_wins TYPE bigint;

ALTER TABLE public.squid_players 
ALTER COLUMN total_losses TYPE bigint;

-- Update casino history tables to use bigint as well
ALTER TABLE public.squid_casino_history
ALTER COLUMN bet_amount TYPE bigint;

ALTER TABLE public.squid_casino_history
ALTER COLUMN win_amount TYPE bigint;

-- Update game sessions to use bigint
ALTER TABLE public.squid_game_sessions
ALTER COLUMN bet_amount TYPE bigint;

-- Update promo codes to use bigint
ALTER TABLE public.squid_promo_codes
ALTER COLUMN reward_amount TYPE bigint;

-- Update player items to use bigint
ALTER TABLE public.squid_player_items
ALTER COLUMN sell_price TYPE bigint;
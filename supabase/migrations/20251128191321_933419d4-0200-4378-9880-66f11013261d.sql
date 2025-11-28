-- Add owned_prefixes column to store all purchased prefixes
ALTER TABLE public.squid_players 
ADD COLUMN owned_prefixes text[] DEFAULT '{}';

-- Update existing players to include their current prefix in owned_prefixes if they have one
UPDATE public.squid_players 
SET owned_prefixes = ARRAY[prefix]
WHERE prefix IS NOT NULL;
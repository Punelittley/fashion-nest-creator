-- Create table for player items/inventory
CREATE TABLE public.squid_player_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.squid_players(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_rarity TEXT NOT NULL,
  sell_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squid_player_items ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can do everything on squid_player_items"
  ON public.squid_player_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster player item lookups
CREATE INDEX idx_squid_player_items_player_id ON public.squid_player_items(player_id);

-- Add last_si_claim to squid_players for cooldown tracking
ALTER TABLE public.squid_players ADD COLUMN last_si_claim TIMESTAMP WITH TIME ZONE DEFAULT NULL;
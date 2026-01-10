-- Create table for item marketplace (player selling items)
CREATE TABLE public.squid_item_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.squid_players(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_rarity TEXT NOT NULL,
  item_icon TEXT,
  item_source TEXT DEFAULT 'case', -- 'case' for web cases, 'si' for bot /si command
  price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squid_item_marketplace ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read marketplace
CREATE POLICY "Anyone can view marketplace items"
ON public.squid_item_marketplace
FOR SELECT
USING (true);

-- Allow players to manage their own listings
CREATE POLICY "Players can manage own listings"
ON public.squid_item_marketplace
FOR ALL
USING (true);

-- Add source column to case inventory to track where items came from
ALTER TABLE public.squid_case_inventory 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'case';

-- Add item_icon to squid_player_items for bot items
ALTER TABLE public.squid_player_items 
ADD COLUMN IF NOT EXISTS item_icon TEXT;
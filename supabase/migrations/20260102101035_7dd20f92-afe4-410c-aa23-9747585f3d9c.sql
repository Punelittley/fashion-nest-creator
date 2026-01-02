-- Create table for case inventory items (separate from squid_player_items for bot)
CREATE TABLE IF NOT EXISTS public.squid_case_inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.squid_players(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_rarity TEXT NOT NULL,
    item_value BIGINT NOT NULL,
    item_image TEXT,
    case_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squid_case_inventory ENABLE ROW LEVEL SECURITY;

-- Policy for players to view their own inventory
CREATE POLICY "Players can view own case inventory" ON public.squid_case_inventory
    FOR SELECT USING (true);

-- Policy for service role to insert
CREATE POLICY "Service role can insert case inventory" ON public.squid_case_inventory
    FOR INSERT WITH CHECK (true);

-- Policy for service role to delete
CREATE POLICY "Service role can delete case inventory" ON public.squid_case_inventory
    FOR DELETE USING (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_squid_case_inventory_player ON public.squid_case_inventory(player_id);
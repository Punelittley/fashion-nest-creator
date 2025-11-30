-- Create table for player businesses
CREATE TABLE IF NOT EXISTS public.squid_player_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.squid_players(id) ON DELETE CASCADE,
  business_type text NOT NULL CHECK (business_type IN ('mask_factory', 'vip_casino')),
  upgrade_level integer NOT NULL DEFAULT 0 CHECK (upgrade_level >= 0 AND upgrade_level <= 3),
  last_collection timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squid_player_businesses ENABLE ROW LEVEL SECURITY;

-- Service role policy
CREATE POLICY "Service role can do everything on businesses"
  ON public.squid_player_businesses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_squid_player_businesses_player_id ON public.squid_player_businesses(player_id);
CREATE UNIQUE INDEX idx_squid_player_businesses_unique ON public.squid_player_businesses(player_id, business_type);
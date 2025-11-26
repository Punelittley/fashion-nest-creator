-- Add last_daily_claim column to squid_players
ALTER TABLE squid_players ADD COLUMN IF NOT EXISTS last_daily_claim timestamp with time zone;

-- Create promo codes table
CREATE TABLE IF NOT EXISTS squid_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  reward_amount integer NOT NULL,
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create promo code redemptions table to track who used which codes
CREATE TABLE IF NOT EXISTS squid_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES squid_players(id) ON DELETE CASCADE,
  promo_code_id uuid REFERENCES squid_promo_codes(id) ON DELETE CASCADE,
  redeemed_at timestamp with time zone DEFAULT now(),
  UNIQUE(player_id, promo_code_id)
);

-- Create admin table
CREATE TABLE IF NOT EXISTS squid_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE squid_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE squid_promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE squid_admins ENABLE ROW LEVEL SECURITY;

-- RLS policies for service role
CREATE POLICY "Service role can do everything on promo_codes" ON squid_promo_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on promo_redemptions" ON squid_promo_redemptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on admins" ON squid_admins FOR ALL USING (true) WITH CHECK (true);
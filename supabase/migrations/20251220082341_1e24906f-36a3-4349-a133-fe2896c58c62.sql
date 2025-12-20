-- Create table for real-time jackpot sessions
CREATE TABLE IF NOT EXISTS public.squid_jackpot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_amount INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'waiting' NOT NULL, -- waiting, spinning, finished
    winner_id UUID REFERENCES public.squid_players(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- Create table for jackpot bets
CREATE TABLE IF NOT EXISTS public.squid_jackpot_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.squid_jackpot_sessions(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.squid_players(id) NOT NULL,
    bet_amount INTEGER NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add last_bp_claim column to squid_players for /bp command
ALTER TABLE public.squid_players 
ADD COLUMN IF NOT EXISTS last_bp_claim TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.squid_jackpot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squid_jackpot_bets ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anonymous users to read jackpot sessions (for real-time updates)
CREATE POLICY "Anyone can view jackpot sessions" 
ON public.squid_jackpot_sessions FOR SELECT USING (true);

CREATE POLICY "Anyone can insert jackpot sessions" 
ON public.squid_jackpot_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update jackpot sessions" 
ON public.squid_jackpot_sessions FOR UPDATE USING (true);

CREATE POLICY "Anyone can view jackpot bets" 
ON public.squid_jackpot_bets FOR SELECT USING (true);

CREATE POLICY "Anyone can insert jackpot bets" 
ON public.squid_jackpot_bets FOR INSERT WITH CHECK (true);

-- Enable realtime for jackpot tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.squid_jackpot_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squid_jackpot_bets;
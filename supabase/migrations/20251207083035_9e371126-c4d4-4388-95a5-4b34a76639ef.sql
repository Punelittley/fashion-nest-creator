
CREATE TABLE public.squid_clans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES public.squid_players(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.squid_clan_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clan_id uuid NOT NULL REFERENCES public.squid_clans(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.squid_players(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(player_id)
);

ALTER TABLE public.squid_clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squid_clan_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on squid_clans" ON public.squid_clans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on squid_clan_members" ON public.squid_clan_members FOR ALL USING (true) WITH CHECK (true);

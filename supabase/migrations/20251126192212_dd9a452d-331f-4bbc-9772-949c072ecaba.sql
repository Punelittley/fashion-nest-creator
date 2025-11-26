-- Создаем таблицу игроков
CREATE TABLE IF NOT EXISTS public.squid_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  balance INTEGER DEFAULT 1000,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Создаем таблицу игровых сессий
CREATE TABLE IF NOT EXISTS public.squid_game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES public.squid_players(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES public.squid_players(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'dalgona', 'glass_bridge', 'marbles', 'squid_final'
  bet_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'active', 'finished'
  winner_id UUID REFERENCES public.squid_players(id),
  game_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Создаем таблицу истории казино
CREATE TABLE IF NOT EXISTS public.squid_casino_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.squid_players(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'slots', 'roulette', 'crash'
  bet_amount INTEGER NOT NULL,
  win_amount INTEGER DEFAULT 0,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_squid_players_telegram_id ON public.squid_players(telegram_id);
CREATE INDEX IF NOT EXISTS idx_squid_game_sessions_status ON public.squid_game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_squid_game_sessions_player1 ON public.squid_game_sessions(player1_id);
CREATE INDEX IF NOT EXISTS idx_squid_game_sessions_player2 ON public.squid_game_sessions(player2_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_squid_player_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER squid_players_updated_at
BEFORE UPDATE ON public.squid_players
FOR EACH ROW
EXECUTE FUNCTION update_squid_player_updated_at();

-- RLS политики
ALTER TABLE public.squid_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squid_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squid_casino_history ENABLE ROW LEVEL SECURITY;

-- Разрешаем сервисной роли все операции
CREATE POLICY "Service role can do everything on squid_players"
ON public.squid_players FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can do everything on squid_game_sessions"
ON public.squid_game_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can do everything on squid_casino_history"
ON public.squid_casino_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
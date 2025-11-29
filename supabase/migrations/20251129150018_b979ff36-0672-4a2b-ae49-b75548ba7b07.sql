-- Create table to track which players are active in which chats
CREATE TABLE IF NOT EXISTS public.squid_player_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.squid_players(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(player_id, chat_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_squid_player_chats_player_id ON public.squid_player_chats(player_id);
CREATE INDEX IF NOT EXISTS idx_squid_player_chats_chat_id ON public.squid_player_chats(chat_id);

-- Enable RLS
ALTER TABLE public.squid_player_chats ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role can do everything on squid_player_chats"
ON public.squid_player_chats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
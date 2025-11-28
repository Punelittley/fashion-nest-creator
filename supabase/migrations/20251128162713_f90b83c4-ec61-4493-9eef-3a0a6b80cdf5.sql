-- Create table for storing bot chats/groups
CREATE TABLE IF NOT EXISTS public.squid_bot_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL UNIQUE,
  chat_type TEXT NOT NULL, -- 'private', 'group', 'supergroup', 'channel'
  chat_title TEXT,
  chat_username TEXT,
  member_count INTEGER,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squid_bot_chats ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage everything
CREATE POLICY "Service role can do everything on squid_bot_chats"
ON public.squid_bot_chats
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_squid_bot_chats_chat_id ON public.squid_bot_chats(chat_id);
CREATE INDEX idx_squid_bot_chats_last_activity ON public.squid_bot_chats(last_activity DESC);
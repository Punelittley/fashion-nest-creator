-- Create support_chats table
CREATE TABLE public.support_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_chat_id BIGINT UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.support_chats(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'support')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_chats
CREATE POLICY "Users can view their own chats"
ON public.support_chats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats"
ON public.support_chats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all chats"
ON public.support_chats
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all chats"
ON public.support_chats
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages in their chats"
ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_chats
    WHERE support_chats.id = support_messages.chat_id
    AND support_chats.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their chats"
ON public.support_messages
FOR INSERT
WITH CHECK (
  sender_type = 'user' AND
  EXISTS (
    SELECT 1 FROM public.support_chats
    WHERE support_chats.id = support_messages.chat_id
    AND support_chats.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all messages"
ON public.support_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (sender_type = 'support');

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Create trigger for updated_at
CREATE TRIGGER update_support_chats_updated_at
BEFORE UPDATE ON public.support_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
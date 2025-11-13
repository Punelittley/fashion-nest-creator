-- Enable full replica identity for support_messages
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
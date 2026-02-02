-- Create table for tracking processed Telegram update IDs to prevent duplicate command execution
CREATE TABLE IF NOT EXISTS public.squid_processed_updates (
  update_id BIGINT PRIMARY KEY,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for cleanup of old entries
CREATE INDEX idx_squid_processed_updates_time ON public.squid_processed_updates(processed_at);

-- No RLS needed - this is internal tracking only accessed by service role
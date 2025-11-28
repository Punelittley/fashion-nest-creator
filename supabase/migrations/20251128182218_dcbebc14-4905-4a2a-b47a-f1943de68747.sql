-- Add prefix field to squid_players table
ALTER TABLE squid_players ADD COLUMN IF NOT EXISTS prefix TEXT DEFAULT NULL;
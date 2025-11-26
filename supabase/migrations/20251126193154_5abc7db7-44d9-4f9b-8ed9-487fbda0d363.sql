-- Create helper functions for squid game bot

-- Function to increment balance
CREATE OR REPLACE FUNCTION increment_balance(player_row squid_players, amount integer)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(player_row.balance, 0) + amount;
$$;

-- Function to increment integer values
CREATE OR REPLACE FUNCTION increment(current_value integer, value integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(current_value, 0) + value;
$$;
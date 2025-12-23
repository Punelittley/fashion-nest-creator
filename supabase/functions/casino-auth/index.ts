import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "auth";

    const body = await req.json();

    if (action === "auth") {
      const { telegram_id, username, first_name } = body;

      if (!telegram_id) {
        return new Response(
          JSON.stringify({ error: "telegram_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Casino auth: telegram_id=${telegram_id}, username=${username}`);

      // Try to get existing player
      let { data: player, error } = await supabaseClient
        .from("squid_players")
        .select("*, casino_admin_mode, casino_downgrade")
        .eq("telegram_id", telegram_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching player:", error);
        return new Response(
          JSON.stringify({ error: "Database error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If player doesn't exist, create new one
      if (!player) {
        console.log("Creating new player...");
        const { data: newPlayer, error: insertError } = await supabaseClient
          .from("squid_players")
          .insert({
            telegram_id,
            username: username || null,
            first_name: first_name || "Игрок",
            balance: 1000,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating player:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to create player" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        player = newPlayer;
        console.log("New player created:", player.id);
      } else {
        // Update username/first_name if changed
        if (username !== player.username || first_name !== player.first_name) {
          await supabaseClient
            .from("squid_players")
            .update({ 
              username: username || player.username,
              first_name: first_name || player.first_name 
            })
            .eq("id", player.id);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          player: {
            id: player.id,
            telegram_id: player.telegram_id,
            username: player.username,
            first_name: player.first_name,
            balance: player.balance,
            is_premium: player.is_premium,
            prefix: player.prefix,
            casino_admin_mode: player.casino_admin_mode,
            casino_downgrade: player.casino_downgrade,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "balance") {
      const { player_id, balance, win_amount, bet_amount, game_type } = body;

      if (!player_id) {
        return new Response(
          JSON.stringify({ error: "player_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Casino balance update: player_id=${player_id}, balance=${balance}`);

      // Update balance
      const { error: updateError } = await supabaseClient
        .from("squid_players")
        .update({ balance })
        .eq("id", player_id);

      if (updateError) {
        console.error("Error updating balance:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log casino history if game info provided
      if (game_type && bet_amount !== undefined) {
        await supabaseClient.from("squid_casino_history").insert({
          player_id,
          game_type,
          bet_amount,
          win_amount: win_amount || 0,
          result: { balance_after: balance },
        });
      }

      return new Response(
        JSON.stringify({ success: true, balance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_balance") {
      const { player_id } = body;

      if (!player_id) {
        return new Response(
          JSON.stringify({ error: "player_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: player, error } = await supabaseClient
        .from("squid_players")
        .select("balance")
        .eq("id", player_id)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: "Player not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, balance: player.balance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // JACKPOT ACTIONS
    if (action === "jackpot_get_session") {
      // Get or create active jackpot session
      let { data: session } = await supabaseClient
        .from("squid_jackpot_sessions")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        // Create new session
        const { data: newSession, error: createError } = await supabaseClient
          .from("squid_jackpot_sessions")
          .insert({ pool_amount: 0, status: "waiting" })
          .select()
          .single();

        if (createError) {
          console.error("Error creating jackpot session:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create session" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        session = newSession;
      }

      // Get bets for this session
      const { data: bets } = await supabaseClient
        .from("squid_jackpot_bets")
        .select("*, squid_players(first_name, username)")
        .eq("session_id", session.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          session,
          bets: bets || []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "jackpot_join") {
      const { player_id, bet_amount, session_id } = body;

      if (!player_id || !bet_amount || !session_id) {
        return new Response(
          JSON.stringify({ error: "player_id, bet_amount, and session_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check player balance
      const { data: player } = await supabaseClient
        .from("squid_players")
        .select("balance, first_name, username")
        .eq("id", player_id)
        .single();

      if (!player || player.balance < bet_amount) {
        return new Response(
          JSON.stringify({ error: "Insufficient balance" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check session is still waiting
      const { data: session } = await supabaseClient
        .from("squid_jackpot_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("status", "waiting")
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found or already spinning" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct balance
      await supabaseClient
        .from("squid_players")
        .update({ balance: player.balance - bet_amount })
        .eq("id", player_id);

      // Generate random color for player
      const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e91e63', '#00bcd4'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      // Check if player already has a bet in this session
      const { data: existingBet } = await supabaseClient
        .from("squid_jackpot_bets")
        .select("*")
        .eq("session_id", session_id)
        .eq("player_id", player_id)
        .maybeSingle();

      if (existingBet) {
        // Update existing bet
        await supabaseClient
          .from("squid_jackpot_bets")
          .update({ bet_amount: existingBet.bet_amount + bet_amount })
          .eq("id", existingBet.id);
      } else {
        // Create new bet
        await supabaseClient
          .from("squid_jackpot_bets")
          .insert({
            session_id,
            player_id,
            bet_amount,
            color
          });
      }

      // Update session pool
      await supabaseClient
        .from("squid_jackpot_sessions")
        .update({ pool_amount: session.pool_amount + bet_amount })
        .eq("id", session_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          new_balance: player.balance - bet_amount
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "jackpot_spin") {
      const { session_id } = body;

      // Get session and bets
      const { data: session } = await supabaseClient
        .from("squid_jackpot_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("status", "waiting")
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found or already spinning" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: bets } = await supabaseClient
        .from("squid_jackpot_bets")
        .select("*, squid_players(id, first_name, username, casino_admin_mode)")
        .eq("session_id", session_id);

      if (!bets || bets.length < 2) {
        return new Response(
          JSON.stringify({ error: "Need at least 2 players" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark session as spinning
      await supabaseClient
        .from("squid_jackpot_sessions")
        .update({ status: "spinning" })
        .eq("id", session_id);

      // Calculate total pool
      const totalPool = bets.reduce((sum, b) => sum + b.bet_amount, 0);

      // Check if any player has casino_admin_mode enabled
      const adminBetIndex = bets.findIndex(b => b.squid_players?.casino_admin_mode === true);
      
      let winner;
      if (adminBetIndex !== -1) {
        // Admin always wins
        winner = bets[adminBetIndex];
      } else {
        // Pick weighted random winner
        const random = Math.random() * totalPool;
        let cumulative = 0;
        winner = bets[0];

        for (const bet of bets) {
          cumulative += bet.bet_amount;
          if (random <= cumulative) {
            winner = bet;
            break;
          }
        }
      }

      // Award winner
      const { data: winnerPlayer } = await supabaseClient
        .from("squid_players")
        .select("balance")
        .eq("id", winner.player_id)
        .single();

      await supabaseClient
        .from("squid_players")
        .update({ balance: (winnerPlayer?.balance || 0) + totalPool })
        .eq("id", winner.player_id);

      // Finish session
      await supabaseClient
        .from("squid_jackpot_sessions")
        .update({ 
          status: "finished", 
          winner_id: winner.player_id,
          finished_at: new Date().toISOString()
        })
        .eq("id", session_id);

      // Log history for all participants
      for (const bet of bets) {
        await supabaseClient.from("squid_casino_history").insert({
          player_id: bet.player_id,
          game_type: "web_jackpot",
          bet_amount: bet.bet_amount,
          win_amount: bet.player_id === winner.player_id ? totalPool : 0,
          result: { session_id, winner_id: winner.player_id },
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          winner: {
            player_id: winner.player_id,
            name: winner.squid_players?.first_name || winner.squid_players?.username || 'Игрок',
            color: winner.color,
            bet: winner.bet_amount
          },
          pool: totalPool
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // JACKPOT CANCEL
    if (action === "jackpot_cancel") {
      const { player_id, session_id } = body;

      if (!player_id || !session_id) {
        return new Response(
          JSON.stringify({ error: "player_id and session_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get session and check status
      const { data: session } = await supabaseClient
        .from("squid_jackpot_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("status", "waiting")
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found or already spinning" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all bets for this session
      const { data: allBets } = await supabaseClient
        .from("squid_jackpot_bets")
        .select("*")
        .eq("session_id", session_id);

      // Check if more than one player
      if (allBets && allBets.length > 1) {
        return new Response(
          JSON.stringify({ error: "Нельзя отменить ставку - уже есть другие участники!" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get player's bet
      const { data: playerBet } = await supabaseClient
        .from("squid_jackpot_bets")
        .select("*")
        .eq("session_id", session_id)
        .eq("player_id", player_id)
        .single();

      if (!playerBet) {
        return new Response(
          JSON.stringify({ error: "У вас нет ставки в этой сессии" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Refund player
      const { data: player } = await supabaseClient
        .from("squid_players")
        .select("balance")
        .eq("id", player_id)
        .single();

      const newBalance = (player?.balance || 0) + playerBet.bet_amount;

      await supabaseClient
        .from("squid_players")
        .update({ balance: newBalance })
        .eq("id", player_id);

      // Delete bet
      await supabaseClient
        .from("squid_jackpot_bets")
        .delete()
        .eq("id", playerBet.id);

      // Update session pool
      await supabaseClient
        .from("squid_jackpot_sessions")
        .update({ pool_amount: session.pool_amount - playerBet.bet_amount })
        .eq("id", session_id);

      console.log(`Jackpot bet cancelled: player ${player_id}, refunded ${playerBet.bet_amount}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          new_balance: newBalance
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

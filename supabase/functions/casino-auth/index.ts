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
        .select("*")
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

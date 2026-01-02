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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, telegram_id, username, first_name, is_premium } = body;

    if (action === "load") {
      // Get or create player
      let { data: player } = await supabase
        .from("squid_players")
        .select("*")
        .eq("telegram_id", telegram_id)
        .single();

      if (!player) {
        const { data: newPlayer } = await supabase
          .from("squid_players")
          .insert({ telegram_id, username, first_name, is_premium, balance: 10000 })
          .select()
          .single();
        player = newPlayer;
      }

      // Get inventory
      const { data: inventory } = await supabase
        .from("squid_case_inventory")
        .select("*")
        .eq("player_id", player.id)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ success: true, player, inventory: inventory || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "open_case") {
      const { case_id, case_price, item_name, item_rarity, item_value, case_name } = body;

      // Get player
      const { data: player } = await supabase
        .from("squid_players")
        .select("*")
        .eq("telegram_id", telegram_id)
        .single();

      if (!player) {
        return new Response(JSON.stringify({ success: false, error: "Player not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add item to inventory
      await supabase.from("squid_case_inventory").insert({
        player_id: player.id,
        item_name,
        item_rarity,
        item_value,
        case_name,
      });

      // Get updated inventory
      const { data: inventory } = await supabase
        .from("squid_case_inventory")
        .select("*")
        .eq("player_id", player.id)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ success: true, balance: player.balance, inventory: inventory || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sell_item") {
      const { item_id, item_value } = body;

      const { data: player } = await supabase
        .from("squid_players")
        .select("*")
        .eq("telegram_id", telegram_id)
        .single();

      if (!player) {
        return new Response(JSON.stringify({ success: false, error: "Player not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete item and update balance
      await supabase.from("squid_case_inventory").delete().eq("id", item_id);
      await supabase.from("squid_players").update({ balance: player.balance + item_value }).eq("id", player.id);

      const { data: inventory } = await supabase
        .from("squid_case_inventory")
        .select("*")
        .eq("player_id", player.id)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ success: true, balance: player.balance + item_value, inventory: inventory || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sell_all") {
      const { data: player } = await supabase
        .from("squid_players")
        .select("*")
        .eq("telegram_id", telegram_id)
        .single();

      if (!player) {
        return new Response(JSON.stringify({ success: false, error: "Player not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get total value
      const { data: items } = await supabase
        .from("squid_case_inventory")
        .select("item_value")
        .eq("player_id", player.id);

      const totalValue = (items || []).reduce((sum: number, i: any) => sum + i.item_value, 0);

      // Delete all and update balance
      await supabase.from("squid_case_inventory").delete().eq("player_id", player.id);
      await supabase.from("squid_players").update({ balance: player.balance + totalValue }).eq("id", player.id);

      return new Response(JSON.stringify({ success: true, balance: player.balance + totalValue, inventory: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

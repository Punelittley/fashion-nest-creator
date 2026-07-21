import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('SQUID_GAME_BOT_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'SQUID_GAME_BOT_TOKEN not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: 'SUPABASE_URL not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const api = `https://api.telegram.org/bot${token}`;
    const webhookUrl = `${supabaseUrl}/functions/v1/squid-game-bot`;

    // Delete and re-set webhook to clear Telegram-side errors
    const deleteHook = await fetch(`${api}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then(r => r.json());

    const setHook = await fetch(`${api}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message', 'callback_query'],
        max_connections: 40,
      }),
    }).then(r => r.json());

    const hookInfo = await fetch(`${api}/getWebhookInfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then(r => r.json());

    const me = await fetch(`${api}/getMe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then(r => r.json());

    return new Response(JSON.stringify({ deleteWebhook: deleteHook, setWebhook: setHook, webhookInfo: hookInfo, me }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    const [meRes, hookInfoRes, setHookRes] = await Promise.all([
      fetch(`${api}/getMe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
      fetch(`${api}/getWebhookInfo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
      fetch(`${api}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'edited_message', 'callback_query'] }),
      }),
    ]);

    const me = await meRes.json();
    const hookInfo = await hookInfoRes.json();
    const setHook = await setHookRes.json();

    return new Response(JSON.stringify({ me, webhook_before: hookInfo, setWebhook: setHook }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

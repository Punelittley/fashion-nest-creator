import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_SUPPORT_CHAT_ID = Deno.env.get('TELEGRAM_SUPPORT_CHAT_ID');
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Setup webhook endpoint
    if (action === 'setup') {
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-support`;
      
      console.log('Setting up webhook:', webhookUrl);
      
      const setupResponse = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message'],
        }),
      });
      
      const result = await setupResponse.json();
      console.log('Webhook setup result:', result);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle webhook from Telegram
    if (req.method === 'POST' && !action) {
      const update = await req.json();
      console.log('Telegram webhook update:', update);

      if (update.message && update.message.text) {
        const telegramChatId = update.message.chat.id;
        const messageText = update.message.text;

        // Handle /start command
        if (messageText === '/start') {
          await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: `✅ Бот готов к работе!\n\nВсе сообщения от пользователей будут приходить сюда.\n\nДля ответа пользователю, отвечайте в формате:\n[Chat: ID] Ваш ответ`,
            }),
          });
          
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if message is from the support chat
        if (telegramChatId.toString() !== TELEGRAM_SUPPORT_CHAT_ID) {
          console.log('Message from non-support chat, ignoring');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Parse chat ID from message format: [Chat: uuid] message text
        const chatIdMatch = messageText.match(/^\[Chat:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i);
        
        if (!chatIdMatch) {
          console.log('Message does not contain chat ID, ignoring');
          await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: '⚠️ Формат ответа: [Chat: ID] Ваш текст',
            }),
          });
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const chatId = chatIdMatch[1];
        const replyMessage = messageText.substring(chatIdMatch[0].length).trim();

        if (!replyMessage) {
          console.log('Empty reply message');
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save message to database
        const { error: messageError } = await supabaseClient
          .from('support_messages')
          .insert({
            chat_id: chatId,
            sender_type: 'support',
            message: replyMessage,
          });

        if (messageError) {
          console.error('Error saving message:', messageError);
          await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: `❌ Ошибка сохранения: ${messageError.message}`,
            }),
          });
        } else {
          await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: '✅ Ответ отправлен',
            }),
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle sending message to Telegram
    if (action === 'send') {
      const { chatId, message } = await req.json();

      if (!TELEGRAM_SUPPORT_CHAT_ID) {
        throw new Error('TELEGRAM_SUPPORT_CHAT_ID not configured');
      }

      // Send message to support Telegram chat with chat ID prefix
      const formattedMessage = `[Chat: ${chatId}]\n${message}`;
      
      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_SUPPORT_CHAT_ID,
          text: formattedMessage,
        }),
      });

      const result = await response.json();
      console.log('Message sent to Telegram:', result);

      if (!result.ok) {
        throw new Error('Failed to send Telegram message');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in telegram-support function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
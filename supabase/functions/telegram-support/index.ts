import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
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

    // Handle webhook from Telegram
    if (req.method === 'POST' && !action) {
      const update = await req.json();
      console.log('Telegram webhook update:', update);

      if (update.message && update.message.text) {
        const telegramChatId = update.message.chat.id;
        const messageText = update.message.text;

        // Проверяем, является ли сообщение UUID (ID чата для привязки)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(messageText.trim())) {
          const chatIdToLink = messageText.trim();
          
          console.log(`Attempting to link chat ${chatIdToLink} to Telegram ${telegramChatId}`);
          
          // Привязываем telegram_chat_id к чату
          const { error: linkError } = await supabaseClient
            .from('support_chats')
            .update({ telegram_chat_id: telegramChatId })
            .eq('id', chatIdToLink);

          if (linkError) {
            console.error('Error linking chat:', linkError);
            const errorResponse = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramChatId,
                text: '❌ Не удалось привязать чат. Проверьте правильность ID.',
              }),
            });
            console.log('Error message send result:', await errorResponse.text());
            
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log(`Chat ${chatIdToLink} linked successfully, sending confirmation`);
          
          const confirmResponse = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: '✅ Чат успешно привязан! Теперь вы будете получать сообщения от пользователя и сможете отвечать прямо здесь.',
            }),
          });
          
          const confirmResult = await confirmResponse.text();
          console.log('Confirmation message send result:', confirmResult);
          
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find the support chat by telegram_chat_id
        const { data: chat, error: chatError } = await supabaseClient
          .from('support_chats')
          .select('id, user_id')
          .eq('telegram_chat_id', telegramChatId)
          .single();

        if (chatError || !chat) {
          console.log('Chat not found for telegram_chat_id:', telegramChatId, 'Error:', chatError);
          // Send message to telegram that this chat is not linked
          const notLinkedResponse = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: '❌ Этот чат не привязан. Отправьте ID чата с сайта для привязки.',
            }),
          });
          
          const notLinkedResult = await notLinkedResponse.text();
          console.log('Not linked message send result:', notLinkedResult);
          
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save message to database
        const { error: messageError } = await supabaseClient
          .from('support_messages')
          .insert({
            chat_id: chat.id,
            sender_type: 'support',
            message: messageText,
          });

        if (messageError) {
          console.error('Error saving message:', messageError);
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

      // Get or create telegram chat
      const { data: chat, error: chatError } = await supabaseClient
        .from('support_chats')
        .select('telegram_chat_id')
        .eq('id', chatId)
        .single();

      if (chatError) {
        throw new Error('Chat not found');
      }

      let telegramChatId = chat.telegram_chat_id;

      // If telegram_chat_id doesn't exist, we need admin to link it
      if (!telegramChatId) {
        // For now, return success - admin will need to link chat manually
        console.log('Telegram chat not linked yet for chat:', chatId);
        return new Response(JSON.stringify({ 
          success: true,
          needsLink: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send message to Telegram
      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: `👤 Пользователь: ${message}`,
        }),
      });

      const result = await response.json();

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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const TELEGRAM_BOT_TOKEN = Deno.env.get('SQUID_GAME_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  message?: {
    chat: { 
      id: number;
      type?: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name?: string };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    // Handle rate limit errors
    if (!result.ok && result.error_code === 429) {
      const retryAfter = result.parameters?.retry_after || 1;
      console.log(`Rate limited, waiting ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      // Retry the request
      return await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  
  try {
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    // Handle rate limit errors
    if (!result.ok && result.error_code === 429) {
      const retryAfter = result.parameters?.retry_after || 1;
      console.log(`Rate limited, waiting ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      // Retry the request
      return await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error editing message:', error);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const update: TelegramUpdate = await req.json();
    console.log('Received update:', JSON.stringify(update));

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { id: callbackId, from, message, data } = update.callback_query;
      const chatId = message?.chat.id;
      
      if (!chatId || !from || !data) {
        return new Response('OK', { headers: corsHeaders });
      }

      // Check if callback data contains user_id verification
      if (data.includes('_u')) {
        const parts = data.split('_u');
        const userIdStr = parts[parts.length - 1].split('_')[0]; // Get last _u occurrence
        const userId = parseInt(userIdStr);
        
        console.log(`Button check: data=${data}, extracted userId=${userId}, from.id=${from.id}`);
        
        if (userId !== from.id) {
          console.log(`Access denied: ${userId} !== ${from.id}`);
          await answerCallbackQuery(callbackId, '❌ Это не твоя кнопка!');
          return new Response('OK', { headers: corsHeaders });
        }
      }

      // Ensure player exists
      await supabaseClient.from('squid_players').upsert({
        telegram_id: from.id,
        username: from.username,
        first_name: from.first_name,
      }, { onConflict: 'telegram_id' });

      await answerCallbackQuery(callbackId);

      if (data === 'play_dalgona') {
        await editMessage(chatId, message!.message_id, '🍬 <b>Игра Dalgona</b>\n\nВыбери форму, которую нужно вырезать:', {
          inline_keyboard: [
            [{ text: '⭐ Звезда', callback_data: `dalgona_select_star_u${from.id}` }],
            [{ text: '☂️ Зонтик', callback_data: `dalgona_select_umbrella_u${from.id}` }],
            [{ text: '🔺 Треугольник', callback_data: `dalgona_select_triangle_u${from.id}` }],
            [{ text: '🖼️ Мона Лиза', callback_data: `dalgona_select_monalisa_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      } else if (data === 'play_glass_bridge') {
        const { data: playerData } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
          .eq('telegram_id', from.id)
          .single();

        const betAmount = 200;
        if ((playerData?.balance || 0) < betAmount) {
          await answerCallbackQuery(callbackId, 'Недостаточно монет! Нужно 200 монет для игры.');
          return new Response('OK', { headers: corsHeaders });
        }

        // Deduct bet amount
        await supabaseClient.from('squid_players')
          .update({ balance: (playerData?.balance || 0) - betAmount })
          .eq('telegram_id', from.id);

        // Start new glass bridge game (60% chance to survive each step)
        const glassPattern = Array.from({ length: 18 }, () => Math.random() < 0.6 ? 'L' : 'R');
        await supabaseClient.from('squid_game_sessions').insert({
          player1_id: playerData?.id,
          game_type: 'glass_bridge',
          bet_amount: betAmount,
          status: 'active',
          game_data: { pattern: glassPattern, step: 0, lives: 1, accumulatedReward: 0 }
        });

        await sendMessage(chatId, '🌉 <b>Стеклянный мост</b>\n\n💰 Ставка: 200 монет\n\nПеред тобой 18 пар стёкол. Одно из них безопасное, другое разобьётся!\n\nВыбирай: Левое (L) или Правое (R)?', {
          inline_keyboard: [
            [{ text: '⬅️ Левое (L)', callback_data: 'glass_L' }, { text: 'Правое (R) ➡️', callback_data: 'glass_R' }],
            [{ text: '💰 Забрать деньги', callback_data: 'glass_cashout' }]
          ]
        });
      } else if (data === 'glass_cashout') {
        const { data: playerData } = await supabaseClient
          .from('squid_players')
          .select('id')
          .eq('telegram_id', from.id)
          .single();

        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*')
          .eq('player1_id', playerData?.id)
          .eq('game_type', 'glass_bridge')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!session) {
          await sendMessage(chatId, '❌ Игра не найдена.');
          return new Response('OK', { headers: corsHeaders });
        }

        const gameData = session.game_data as any;
        const accumulatedReward = gameData.accumulatedReward || 0;

        await supabaseClient.from('squid_game_sessions')
          .update({ status: 'finished', finished_at: new Date().toISOString() })
          .eq('id', session.id);

        if (accumulatedReward > 0) {
          const { data: currentPlayer } = await supabaseClient
            .from('squid_players')
            .select('balance')
            .eq('id', playerData?.id)
            .single();

          await supabaseClient.from('squid_players')
            .update({ balance: (currentPlayer?.balance || 0) + accumulatedReward })
            .eq('id', playerData?.id);

          await supabaseClient.from('squid_casino_history').insert({
            player_id: playerData?.id,
            game_type: 'glass_bridge',
            bet_amount: session.bet_amount,
            win_amount: accumulatedReward,
            result: { completed: false, step: gameData.step, cashout: true }
          });

          await sendMessage(chatId, `💰 <b>Выигрыш забран!</b>\n\nТы прошёл ${gameData.step}/18 стёкол\nПолучено: ${accumulatedReward} монет`, {
            inline_keyboard: [
              [{ text: '🎮 Играть ещё', callback_data: 'play_glass_bridge' }],
              [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]
            ]
          });
        } else {
          await sendMessage(chatId, '❌ У тебя пока нет выигрыша. Пройди хотя бы одну плиту!', {
            inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
          });
        }
      } else if (data.startsWith('glass_')) {
        const choice = data.replace('glass_', '');
        
        const { data: playerData } = await supabaseClient
          .from('squid_players')
          .select('id')
          .eq('telegram_id', from.id)
          .single();

        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*')
          .eq('player1_id', playerData?.id)
          .eq('game_type', 'glass_bridge')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!session) {
          await sendMessage(chatId, '❌ Игра не найдена. Начни новую!');
          return new Response('OK', { headers: corsHeaders });
        }

        const gameData = session.game_data as any;
        const correctChoice = gameData.pattern[gameData.step];

        if (choice === correctChoice) {
          gameData.step += 1;
          
          // Calculate progressive reward: 400 + (step - 1) * 300
          const stepReward = 400 + ((gameData.step - 1) * 300);
          gameData.accumulatedReward = (gameData.accumulatedReward || 0) + stepReward;

          if (gameData.step >= 18) {
            // Won the game - automatically cashout
            const totalReward = gameData.accumulatedReward;
            const { data: currentPlayer } = await supabaseClient
              .from('squid_players')
              .select('balance, total_wins')
              .eq('id', playerData?.id)
              .single();

            await supabaseClient.from('squid_players')
              .update({ 
                balance: (currentPlayer?.balance || 0) + totalReward,
                total_wins: (currentPlayer?.total_wins || 0) + 1
              })
              .eq('id', playerData?.id);

            await supabaseClient.from('squid_game_sessions')
              .update({ status: 'finished', winner_id: playerData?.id, finished_at: new Date().toISOString() })
              .eq('id', session.id);

            await supabaseClient.from('squid_casino_history').insert({
              player_id: playerData?.id,
              game_type: 'glass_bridge',
              bet_amount: session.bet_amount,
              win_amount: totalReward,
              result: { completed: true, steps: 18 }
            });

            await sendMessage(chatId, `🎉 <b>НЕВЕРОЯТНО!</b>\n\nТы прошёл все 18 стёкол!\n💰 Общий выигрыш: ${totalReward} монет`, {
              inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
            });
          } else {
            await supabaseClient.from('squid_game_sessions')
              .update({ game_data: gameData })
              .eq('id', session.id);

            await sendMessage(chatId, `✅ Правильно! Шаг ${gameData.step}/18\n💵 +${stepReward} монет\n💰 Накоплено: ${gameData.accumulatedReward} монет\n\nСледующее стекло?`, {
              inline_keyboard: [
                [{ text: '⬅️ Левое (L)', callback_data: 'glass_L' }, { text: 'Правое (R) ➡️', callback_data: 'glass_R' }],
                [{ text: '💰 Забрать деньги', callback_data: 'glass_cashout' }]
              ]
            });
          }
        } else {
          // Lost - lose everything
          await supabaseClient.from('squid_game_sessions')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('id', session.id);

          await supabaseClient.from('squid_players')
            .update({ total_losses: (await supabaseClient.from('squid_players').select('total_losses').eq('id', playerData?.id).single()).data?.total_losses + 1 || 1 })
            .eq('id', playerData?.id);

          await supabaseClient.from('squid_casino_history').insert({
            player_id: playerData?.id,
            game_type: 'glass_bridge',
            bet_amount: session.bet_amount,
            win_amount: 0,
            result: { completed: false, step: gameData.step }
          });

          const lostReward = gameData.accumulatedReward || 0;
          const lostText = lostReward > 0 ? `\n💸 Потеряно: ${lostReward} монет` : '';
          await sendMessage(chatId, `💥 Стекло разбилось!\n\nТы прошёл ${gameData.step}/18 стёкол${lostText}`, {
            inline_keyboard: [
              [{ text: '🎮 Играть ещё', callback_data: 'play_glass_bridge' }],
              [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]
            ]
          });
        }
      } else if (data === 'play_squid_pvp') {
        await sendMessage(chatId, `🦑 <b>Игра в Кальмара (PvP)</b>\n\nЧтобы пригласить игрока, отправь:\n<code>/challenge [Telegram_ID] [ставка]</code>\n\nНапример:\n<code>/challenge 123456789 100</code>\n\nИли жди приглашения от других игроков!`, {
          inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
        });
      } else if (data.startsWith('decline_challenge_')) {
        const sessionId = data.split('_u')[0].replace('decline_challenge_', '');
        
        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*, player1:squid_players!player1_id(telegram_id, first_name)')
          .eq('id', sessionId)
          .eq('status', 'waiting')
          .single();

        if (!session) {
          await answerCallbackQuery(callbackId, 'Игра уже началась или отменена');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_game_sessions')
          .update({ status: 'cancelled' })
          .eq('id', sessionId);

        const player1Chat = (session.player1 as any).telegram_id;
        await sendMessage(player1Chat, `❌ ${from.first_name} отказался от вызова.`);
        await editMessage(chatId, message.message_id, `❌ Вы отказались от вызова.`);
      } else if (data.startsWith('accept_challenge_')) {
        const sessionId = data.split('_u')[0].replace('accept_challenge_', '');
        
        const { data: playerData } = await supabaseClient
          .from('squid_players')
          .select('id, balance, first_name')
          .eq('telegram_id', from.id)
          .single();

        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*, player1:squid_players!player1_id(telegram_id, first_name)')
          .eq('id', sessionId)
          .eq('status', 'waiting')
          .single();

        if (!session) {
          await answerCallbackQuery(callbackId, 'Игра уже началась или отменена');
          return new Response('OK', { headers: corsHeaders });
        }

        if ((playerData?.balance || 0) < session.bet_amount) {
          await answerCallbackQuery(callbackId, 'Недостаточно монет!');
          return new Response('OK', { headers: corsHeaders });
        }

        // Deduct bets from both players
        const { data: player1Data } = await supabaseClient
          .from('squid_players')
          .select('balance')
          .eq('id', session.player1_id)
          .single();

        await supabaseClient.from('squid_players')
          .update({ balance: (playerData?.balance || 0) - session.bet_amount })
          .eq('id', playerData.id);

        await supabaseClient.from('squid_players')
          .update({ balance: (player1Data?.balance || 0) - session.bet_amount })
          .eq('id', session.player1_id);

        // Initialize game with 3 lives each
        const gameData = {
          player1_hp: 3,
          player2_hp: 3,
          player1_name: (session.player1 as any).first_name,
          player2_name: playerData.first_name
        };

        await supabaseClient.from('squid_game_sessions')
          .update({ 
            player2_id: playerData?.id, 
            status: 'active',
            game_data: gameData
          })
          .eq('id', sessionId);

        // Send game interface to both players
        const player1Chat = (session.player1 as any).telegram_id;
        const battleStatus = `⚔️ <b>БОЙ В КАЛЬМАРА</b>\n\n👤 ${gameData.player1_name}: ❤️❤️❤️\n👤 ${gameData.player2_name}: ❤️❤️❤️\n\n💰 Ставка: ${session.bet_amount} монет`;

        await sendMessage(player1Chat, battleStatus, {
          inline_keyboard: [[{ text: '🎯 Ударить', callback_data: `pvp_attack_${sessionId}_u${player1Chat}` }]]
        });

        await editMessage(chatId, message.message_id, battleStatus, {
          inline_keyboard: [[{ text: '🎯 Ударить', callback_data: `pvp_attack_${sessionId}_u${from.id}` }]]
        });

        await answerCallbackQuery(callbackId, 'Бой начался! Атакуй первым!');
      } else if (data.startsWith('pvp_attack_')) {
        const sessionId = data.split('_u')[0].replace('pvp_attack_', '');
        
        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*, player1:squid_players!player1_id(telegram_id, first_name), player2:squid_players!player2_id(telegram_id, first_name)')
          .eq('id', sessionId)
          .eq('status', 'active')
          .single();

        if (!session) {
          await answerCallbackQuery(callbackId, 'Игра уже завершена');
          return new Response('OK', { headers: corsHeaders });
        }

        const gameData = session.game_data as any;
        const isPlayer1 = from.id === (session.player1 as any).telegram_id;
        const player1Chat = (session.player1 as any).telegram_id;
        const player2Chat = (session.player2 as any).telegram_id;

        // Random hit or miss (60% hit, 40% miss)
        const isHit = Math.random() < 0.6;
        
        if (isHit) {
          // Reduce opponent's HP
          if (isPlayer1) {
            gameData.player2_hp -= 1;
          } else {
            gameData.player1_hp -= 1;
          }
        }

        const actionText = isHit ? '✅ попал!' : '❌ промазал!';
        const hearts1 = '❤️'.repeat(Math.max(0, gameData.player1_hp)) + '💔'.repeat(Math.max(0, 3 - gameData.player1_hp));
        const hearts2 = '❤️'.repeat(Math.max(0, gameData.player2_hp)) + '💔'.repeat(Math.max(0, 3 - gameData.player2_hp));

        // Check if game is over
        if (gameData.player1_hp <= 0 || gameData.player2_hp <= 0) {
          const winnerId = gameData.player1_hp > 0 ? session.player1_id : session.player2_id;
          const winnerChat = gameData.player1_hp > 0 ? player1Chat : player2Chat;
          const loserChat = gameData.player1_hp > 0 ? player2Chat : player1Chat;
          const winnerName = gameData.player1_hp > 0 ? gameData.player1_name : gameData.player2_name;

          await supabaseClient.from('squid_game_sessions')
            .update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() })
            .eq('id', sessionId);

          // Winner gets double bet
          const { data: winner } = await supabaseClient
            .from('squid_players')
            .select('balance, total_wins')
            .eq('id', winnerId)
            .single();

          await supabaseClient.from('squid_players')
            .update({ 
              balance: (winner?.balance || 0) + (session.bet_amount * 2),
              total_wins: (winner?.total_wins || 0) + 1
            })
            .eq('id', winnerId);

          const loserId = winnerId === session.player1_id ? session.player2_id : session.player1_id;
          const { data: loser } = await supabaseClient
            .from('squid_players')
            .select('total_losses')
            .eq('id', loserId)
            .single();

          await supabaseClient.from('squid_players')
            .update({ total_losses: (loser?.total_losses || 0) + 1 })
            .eq('id', loserId);

          const finalStatus = `⚔️ <b>ИГРА ОКОНЧЕНА!</b>\n\n👤 ${gameData.player1_name}: ${hearts1}\n👤 ${gameData.player2_name}: ${hearts2}\n\n${isPlayer1 ? gameData.player1_name : gameData.player2_name} ${actionText}`;

          await sendMessage(winnerChat, `${finalStatus}\n\n🎉 <b>ПОБЕДА!</b>\n💰 Выигрыш: ${session.bet_amount * 2} монет`, {
            inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
          });

          await sendMessage(loserChat, `${finalStatus}\n\n💀 <b>ПОРАЖЕНИЕ</b>\n💸 Потеря: ${session.bet_amount} монет`, {
            inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
          });
        } else {
          // Game continues
          await supabaseClient.from('squid_game_sessions')
            .update({ game_data: gameData })
            .eq('id', sessionId);

          const battleStatus = `⚔️ <b>БОЙ В КАЛЬМАРА</b>\n\n👤 ${gameData.player1_name}: ${hearts1}\n👤 ${gameData.player2_name}: ${hearts2}\n\n${isPlayer1 ? gameData.player1_name : gameData.player2_name} ${actionText}`;

          // Update both players' messages
          await sendMessage(player1Chat, battleStatus, {
            inline_keyboard: [[{ text: '🎯 Ударить', callback_data: `pvp_attack_${sessionId}_u${player1Chat}` }]]
          });

          await sendMessage(player2Chat, battleStatus, {
            inline_keyboard: [[{ text: '🎯 Ударить', callback_data: `pvp_attack_${sessionId}_u${player2Chat}` }]]
          });

          await answerCallbackQuery(callbackId, actionText);
        }
      } else if (data.startsWith('shop_prefixes_u')) {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance, prefix, owned_prefixes')
          .eq('telegram_id', from.id)
          .single();

        const prefixes = [
          { name: 'absolute', price: 2000000, emoji: '👑' },
          { name: 'emperror', price: 3000000, emoji: '⚔️' }
        ];

        const ownedPrefixes = player?.owned_prefixes || [];
        
        let shopText = '🛍️ <b>Магазин префиксов</b>\n\n💰 Твой баланс: ' + (player?.balance || 0) + ' монет\n\n';
        
        prefixes.forEach(prefix => {
          const isOwned = ownedPrefixes.includes(prefix.name);
          const isActive = player?.prefix === prefix.name;
          
          if (isOwned) {
            shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${isActive ? '✅ Активен' : '✅ Куплен'}\n`;
          } else {
            shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${prefix.price.toLocaleString()} монет\n`;
          }
        });

        const keyboard = [];
        
        prefixes.forEach(prefix => {
          const isOwned = ownedPrefixes.includes(prefix.name);
          const isActive = player?.prefix === prefix.name;
          
          if (isOwned && !isActive) {
            keyboard.push([{ text: `${prefix.emoji} Включить ${prefix.name}`, callback_data: `activate_prefix_${prefix.name}_u${from.id}` }]);
          } else if (!isOwned) {
            keyboard.push([{ text: `${prefix.emoji} Купить ${prefix.name} (${(prefix.price / 1000000).toFixed(1)}M)`, callback_data: `buy_prefix_${prefix.name}_u${from.id}` }]);
          }
        });
        
        keyboard.push([{ text: '⬅️ Назад в профиль', callback_data: 'profile' }]);

        await editMessage(chatId, message!.message_id, shopText, {
          inline_keyboard: keyboard
        });
      } else if (data.startsWith('activate_prefix_')) {
        const prefixName = data.split('_u')[0].replace('activate_prefix_', '');
        
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, owned_prefixes')
          .eq('telegram_id', from.id)
          .single();

        const ownedPrefixes = player?.owned_prefixes || [];
        
        if (!ownedPrefixes.includes(prefixName)) {
          await answerCallbackQuery(callbackId, 'У тебя нет этого префикса!');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_players')
          .update({ prefix: prefixName })
          .eq('id', player.id);

        await answerCallbackQuery(callbackId, `✅ Префикс ${prefixName} включен!`);
        
        // Refresh shop
        const { data: updatedPlayer } = await supabaseClient
          .from('squid_players')
          .select('balance, prefix, owned_prefixes')
          .eq('telegram_id', from.id)
          .single();

        const prefixes = [
          { name: 'absolute', price: 2000000, emoji: '👑' },
          { name: 'emperror', price: 3000000, emoji: '⚔️' }
        ];

        const updatedOwnedPrefixes = updatedPlayer?.owned_prefixes || [];
        
        let shopText = '🛍️ <b>Магазин префиксов</b>\n\n💰 Твой баланс: ' + (updatedPlayer?.balance || 0) + ' монет\n\n';
        
        prefixes.forEach(prefix => {
          const isOwned = updatedOwnedPrefixes.includes(prefix.name);
          const isActive = updatedPlayer?.prefix === prefix.name;
          
          if (isOwned) {
            shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${isActive ? '✅ Активен' : '✅ Куплен'}\n`;
          } else {
            shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${prefix.price.toLocaleString()} монет\n`;
          }
        });

        const keyboard = [];
        
        prefixes.forEach(prefix => {
          const isOwned = updatedOwnedPrefixes.includes(prefix.name);
          const isActive = updatedPlayer?.prefix === prefix.name;
          
          if (isOwned && !isActive) {
            keyboard.push([{ text: `${prefix.emoji} Включить ${prefix.name}`, callback_data: `activate_prefix_${prefix.name}_u${from.id}` }]);
          } else if (!isOwned) {
            keyboard.push([{ text: `${prefix.emoji} Купить ${prefix.name} (${(prefix.price / 1000000).toFixed(1)}M)`, callback_data: `buy_prefix_${prefix.name}_u${from.id}` }]);
          }
        });
        
        keyboard.push([{ text: '⬅️ Назад в профиль', callback_data: 'profile' }]);

        await editMessage(chatId, message!.message_id, shopText, {
          inline_keyboard: keyboard
        });
      } else if (data.startsWith('buy_prefix_')) {
        const prefixName = data.split('_u')[0].replace('buy_prefix_', '');
        
        const prefixPrices: Record<string, number> = {
          absolute: 2000000,
          emperror: 3000000
        };

        const price = prefixPrices[prefixName];
        if (!price) {
          await answerCallbackQuery(callbackId, 'Неизвестный префикс');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance, prefix, owned_prefixes')
          .eq('telegram_id', from.id)
          .single();

        if ((player?.balance || 0) < price) {
          await answerCallbackQuery(callbackId, 'Недостаточно монет!');
          return new Response('OK', { headers: corsHeaders });
        }

        const ownedPrefixes = player?.owned_prefixes || [];
        
        if (ownedPrefixes.includes(prefixName)) {
          await answerCallbackQuery(callbackId, 'У тебя уже есть этот префикс!');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_players')
          .update({ 
            balance: (player?.balance || 0) - price,
            prefix: prefixName,
            owned_prefixes: [...ownedPrefixes, prefixName]
          })
          .eq('id', player.id);

        await answerCallbackQuery(callbackId, `✅ Префикс ${prefixName} куплен и активирован!`);
        
        // Refresh shop
        const { data: updatedPlayer } = await supabaseClient
          .from('squid_players')
          .select('balance, prefix, owned_prefixes')
          .eq('telegram_id', from.id)
          .single();

        const prefixes = [
          { name: 'absolute', price: 2000000, emoji: '👑' },
          { name: 'emperror', price: 3000000, emoji: '⚔️' }
        ];

        const updatedOwnedPrefixes = updatedPlayer?.owned_prefixes || [];
        
        let shopText = '🛍️ <b>Магазин префиксов</b>\n\n💰 Твой баланс: ' + (updatedPlayer?.balance || 0) + ' монет\n\n';
        
        prefixes.forEach(prefix => {
          const isOwned = updatedOwnedPrefixes.includes(prefix.name);
          const isActive = updatedPlayer?.prefix === prefix.name;
          
          if (isOwned) {
            shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${isActive ? '✅ Активен' : '✅ Куплен'}\n`;
          } else {
            shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${prefix.price.toLocaleString()} монет\n`;
          }
        });

        const keyboard = [];
        
        prefixes.forEach(prefix => {
          const isOwned = updatedOwnedPrefixes.includes(prefix.name);
          const isActive = updatedPlayer?.prefix === prefix.name;
          
          if (isOwned && !isActive) {
            keyboard.push([{ text: `${prefix.emoji} Включить ${prefix.name}`, callback_data: `activate_prefix_${prefix.name}_u${from.id}` }]);
          } else if (!isOwned) {
            keyboard.push([{ text: `${prefix.emoji} Купить ${prefix.name} (${(prefix.price / 1000000).toFixed(1)}M)`, callback_data: `buy_prefix_${prefix.name}_u${from.id}` }]);
          }
        });
        
        keyboard.push([{ text: '⬅️ Назад в профиль', callback_data: 'profile' }]);

        await editMessage(chatId, message!.message_id, shopText, {
          inline_keyboard: keyboard
        });
      } else if (data.startsWith('remove_prefix_u')) {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, prefix')
          .eq('telegram_id', from.id)
          .single();

        if (!player?.prefix) {
          await answerCallbackQuery(callbackId, 'У тебя нет префикса');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_players')
          .update({ prefix: null })
          .eq('id', player.id);

        await answerCallbackQuery(callbackId, 'Префикс убран');
        
        // Refresh profile
        const { data: updatedPlayer } = await supabaseClient
          .from('squid_players')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        await editMessage(chatId, message!.message_id, 
          `👤 <b>Твой профиль</b>\n\n💰 Баланс: ${updatedPlayer?.balance || 0} монет\n🏆 Побед: ${updatedPlayer?.total_wins || 0}\n💀 Поражений: ${updatedPlayer?.total_losses || 0}\n✨ Префикс: Нет префикса`,
          { 
            inline_keyboard: [
              [{ text: '🛍️ Магазин префиксов', callback_data: `shop_prefixes_u${from.id}` }],
              [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]
            ]
          }
        );
      } else if (data.startsWith('dalgona_select_')) {
        const shapePart = data.replace('dalgona_select_', '').split('_u')[0];
        
        const shapeConfig: Record<string, { name: string, bet: number, reward: number, chance: number }> = {
          star: { name: '⭐ Звезда', bet: 100, reward: 400, chance: 0.7 },
          umbrella: { name: '☂️ Зонтик', bet: 300, reward: 1000, chance: 0.4 },
          triangle: { name: '🔺 Треугольник', bet: 120, reward: 300, chance: 0.75 },
          monalisa: { name: '🖼️ Мона Лиза', bet: 500, reward: 5000, chance: 0.03 }
        };

        const config = shapeConfig[shapePart];
        if (!config) return new Response('OK', { headers: corsHeaders });

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance')
          .eq('telegram_id', from.id)
          .single();

        if ((player?.balance || 0) < config.bet) {
          await answerCallbackQuery(callbackId, 'Недостаточно монет!');
          return new Response('OK', { headers: corsHeaders });
        }

        await sendMessage(chatId, 
          `🍬 <b>${config.name}</b>\n\n💰 Ставка: ${config.bet} монет\n🎁 Выигрыш: ${config.reward} монет\n📊 Шанс успеха: ${Math.round(config.chance * 100)}%\n\nПодтверждаешь?`,
          {
            inline_keyboard: [
              [{ text: '✅ Вырезать', callback_data: `dalgona_confirm_${shapePart}_u${from.id}` }],
              [{ text: '❌ Отмена', callback_data: 'play_dalgona' }]
            ]
          }
        );
      } else if (data.startsWith('dalgona_confirm_')) {
        const shapePart = data.replace('dalgona_confirm_', '').split('_u')[0];
        
        const shapeConfig: Record<string, { name: string, bet: number, reward: number, chance: number }> = {
          star: { name: '⭐ Звезда', bet: 100, reward: 400, chance: 0.7 },
          umbrella: { name: '☂️ Зонтик', bet: 300, reward: 1000, chance: 0.4 },
          triangle: { name: '🔺 Треугольник', bet: 120, reward: 300, chance: 0.75 },
          monalisa: { name: '🖼️ Мона Лиза', bet: 500, reward: 5000, chance: 0.03 }
        };

        const config = shapeConfig[shapePart];
        if (!config) return new Response('OK', { headers: corsHeaders });

        const { data: currentPlayer } = await supabaseClient
          .from('squid_players')
          .select('balance, casino_admin_mode')
          .eq('telegram_id', from.id)
          .single();

        if ((currentPlayer?.balance || 0) < config.bet) {
          await answerCallbackQuery(callbackId, 'Недостаточно монет!');
          return new Response('OK', { headers: corsHeaders });
        }

        // Deduct bet
        await supabaseClient.from('squid_players')
          .update({ balance: (currentPlayer?.balance || 0) - config.bet })
          .eq('telegram_id', from.id);

        // Admin casino mode - always win
        const success = currentPlayer?.casino_admin_mode ? true : Math.random() < config.chance;
        const winAmount = success ? config.reward : 0;

        if (success) {
          await supabaseClient.from('squid_players')
            .update({ balance: (currentPlayer?.balance || 0) - config.bet + winAmount })
            .eq('telegram_id', from.id);

          await supabaseClient.from('squid_casino_history').insert({
            player_id: (await supabaseClient.from('squid_players').select('id').eq('telegram_id', from.id).single()).data?.id,
            game_type: 'dalgona',
            bet_amount: config.bet,
            win_amount: winAmount,
            result: { shape: shapePart, success: true }
          });

          await sendMessage(chatId, `✅ Отлично! Ты вырезал ${config.name} и получил ${winAmount} монет! 💰`, {
            inline_keyboard: [[{ text: '🎮 Играть ещё', callback_data: 'play_dalgona' }], [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
          });
        } else {
          await supabaseClient.from('squid_casino_history').insert({
            player_id: (await supabaseClient.from('squid_players').select('id').eq('telegram_id', from.id).single()).data?.id,
            game_type: 'dalgona',
            bet_amount: config.bet,
            win_amount: 0,
            result: { shape: shapePart, success: false }
          });

          await sendMessage(chatId, `❌ Печенье сломалось! Ты потерял ${config.bet} монет.`, {
            inline_keyboard: [[{ text: '🎮 Играть ещё', callback_data: 'play_dalgona' }], [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
          });
        }
      } else if (data === 'main_menu') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance')
          .eq('telegram_id', from.id)
          .single();

        await editMessage(chatId, message!.message_id, `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n\nВыбери игру:`, {
          inline_keyboard: [
            [{ text: '🍬 Dalgona Challenge', callback_data: 'play_dalgona' }],
            [{ text: '🌉 Стеклянный мост', callback_data: 'play_glass_bridge' }],
            [{ text: '🦑 Игра в Кальмара (PvP)', callback_data: 'play_squid_pvp' }],
            [{ text: '👤 Мой профиль', callback_data: 'profile' }]
          ]
        });
      } else if (data === 'profile') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        const prefixText = player?.prefix ? `${player.prefix}` : 'Нет префикса';
        const displayName = player?.prefix 
          ? `[${player.prefix}] ${player?.first_name || from.first_name || 'Игрок'}`
          : player?.first_name || from.first_name || 'Игрок';
        
        await editMessage(chatId, message!.message_id, 
          `👤 <b>Профиль: ${displayName}</b>\n\n💰 Баланс: ${player?.balance || 0} монет\n🏆 Побед: ${player?.total_wins || 0}\n💀 Поражений: ${player?.total_losses || 0}\n✨ Префикс: ${prefixText}`,
          { 
            inline_keyboard: [
              [{ text: '🛍️ Магазин префиксов', callback_data: `shop_prefixes_u${from.id}` }],
              player?.prefix ? [{ text: '❌ Убрать префикс', callback_data: `remove_prefix_u${from.id}` }] : [],
              [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]
            ].filter(row => row.length > 0)
          }
        );
      } else if (data.startsWith('admin_set_prefix_absolute_')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, 'Нет доступа');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace('admin_set_prefix_absolute_', ''));
        
        await supabaseClient.from('squid_players')
          .update({ prefix: 'absolute' })
          .eq('telegram_id', targetId);

        await answerCallbackQuery(callbackId, '✅ Префикс установлен!');
        await editMessage(chatId, message!.message_id, `✅ Префикс "absolute" установлен игроку ${targetId}`);
      } else if (data.startsWith('admin_set_prefix_emperror_')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, 'Нет доступа');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace('admin_set_prefix_emperror_', ''));
        
        await supabaseClient.from('squid_players')
          .update({ prefix: 'emperror' })
          .eq('telegram_id', targetId);

        await answerCallbackQuery(callbackId, '✅ Префикс установлен!');
        await editMessage(chatId, message!.message_id, `✅ Префикс "emperror" установлен игроку ${targetId}`);
      } else if (data.startsWith('admin_remove_prefix_')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, 'Нет доступа');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace('admin_remove_prefix_', ''));
        
        await supabaseClient.from('squid_players')
          .update({ prefix: null })
          .eq('telegram_id', targetId);

        await answerCallbackQuery(callbackId, '✅ Префикс убран!');
        await editMessage(chatId, message!.message_id, `✅ Префикс убран у игрока ${targetId}`);
      } else if (data.startsWith('admin_reset_stats_')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, 'Нет доступа');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace('admin_reset_stats_', ''));
        
        await supabaseClient.from('squid_players')
          .update({ 
            total_wins: 0,
            total_losses: 0
          })
          .eq('telegram_id', targetId);

        await answerCallbackQuery(callbackId, '✅ Статистика обнулена!');
        await editMessage(chatId, message!.message_id, `✅ Статистика обнулена у игрока ${targetId}`);
      } else if (data === 'play_casino') {
        await sendMessage(chatId, '🎰 <b>Казино</b>\n\nДобро пожаловать в казино!', {
          inline_keyboard: [
            [{ text: '🎡 Рулетка', callback_data: `casino_roulette_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      } else if (data.startsWith('casino_roulette_u')) {
        await editMessage(chatId, message!.message_id, '🎡 <b>Рулетка</b>\n\nВыбери ставку (100-10000 монет) и цвет:', {
          inline_keyboard: [
            [{ text: '🔴 Красное (x2)', callback_data: `roulette_bet_red_u${from.id}` }],
            [{ text: '⚫ Черное (x2)', callback_data: `roulette_bet_black_u${from.id}` }],
            [{ text: '🟢 Зеленое (x14)', callback_data: `roulette_bet_green_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'play_casino' }]
          ]
        });
      } else if (data.startsWith('roulette_bet_')) {
        const color = data.includes('red') ? 'red' : data.includes('black') ? 'black' : 'green';
        
        await editMessage(chatId, message!.message_id, `Выбран цвет: ${color === 'red' ? '🔴 Красное' : color === 'black' ? '⚫ Черное' : '🟢 Зеленое'}\n\nВыбери размер ставки:`, {
          inline_keyboard: [
            [{ text: '100 монет', callback_data: `roulette_play_${color}_100_u${from.id}` }],
            [{ text: '500 монет', callback_data: `roulette_play_${color}_500_u${from.id}` }],
            [{ text: '1000 монет', callback_data: `roulette_play_${color}_1000_u${from.id}` }],
            [{ text: '5000 монет', callback_data: `roulette_play_${color}_5000_u${from.id}` }],
            [{ text: '10000 монет', callback_data: `roulette_play_${color}_10000_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: `casino_roulette_u${from.id}` }]
          ]
        });
      } else if (data.startsWith('roulette_play_')) {
        const parts = data.split('_');
        const color = parts[2];
        const betAmount = parseInt(parts[3]);

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance, casino_admin_mode')
          .eq('telegram_id', from.id)
          .single();

        if (!player || player.balance < betAmount) {
          await answerCallbackQuery(callbackId, 'Недостаточно монет!');
          return new Response('OK', { headers: corsHeaders });
        }

        // Deduct bet
        await supabaseClient.from('squid_players')
          .update({ balance: player.balance - betAmount })
          .eq('id', player.id);

        // Spin roulette (18 red, 18 black, 1 green)
        let resultColor: string;
        let winMultiplier = 0;

        // Admin casino mode - always win
        if (player.casino_admin_mode) {
          resultColor = color;
          winMultiplier = color === 'green' ? 14 : 2;
        } else {
          const result = Math.random();
          
          if (result < 18/37) {
            resultColor = 'red';
          } else if (result < 36/37) {
            resultColor = 'black';
          } else {
            resultColor = 'green';
          }

          if (resultColor === color) {
            winMultiplier = color === 'green' ? 14 : 2;
          }
        }

        const winAmount = betAmount * winMultiplier;
        const profit = winAmount - betAmount;

        if (winAmount > 0) {
          await supabaseClient.from('squid_players')
            .update({ balance: player.balance - betAmount + winAmount })
            .eq('id', player.id);
        }

        await supabaseClient.from('squid_casino_history').insert({
          player_id: player.id,
          game_type: 'roulette',
          bet_amount: betAmount,
          win_amount: winAmount,
          result: { color: resultColor, bet: color }
        });

        const resultEmoji = resultColor === 'red' ? '🔴' : resultColor === 'black' ? '⚫' : '🟢';
        const resultText = winAmount > 0 
          ? `🎉 <b>ВЫИГРЫШ!</b>\n\nРезультат: ${resultEmoji} ${resultColor}\n💰 Выигрыш: ${profit} монет\n💵 Новый баланс: ${player.balance - betAmount + winAmount} монет`
          : `😔 Проигрыш\n\nРезультат: ${resultEmoji} ${resultColor}\n💸 Потеря: ${betAmount} монет\n💵 Новый баланс: ${player.balance - betAmount} монет`;

        await editMessage(chatId, message!.message_id, resultText, {
          inline_keyboard: [
            [{ text: '🎡 Играть еще', callback_data: `casino_roulette_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      }

      return new Response('OK', { headers: corsHeaders });
    }

    // Handle text messages
    if (update.message?.text) {
      const { chat, from, text } = update.message;
      
      if (!from) {
        return new Response('OK', { headers: corsHeaders });
      }

      // Create or update player
      const { data: player } = await supabaseClient.from('squid_players')
        .upsert({
          telegram_id: from.id,
          username: from.username,
          first_name: from.first_name,
        }, { onConflict: 'telegram_id' })
        .select()
        .single();

      // Store chat information
      await supabaseClient.from('squid_bot_chats').upsert({
        chat_id: chat.id,
        chat_type: chat.type || 'private',
        chat_title: chat.title || null,
        chat_username: chat.username || null,
        last_activity: new Date().toISOString()
      }, { onConflict: 'chat_id' });

      // Track player activity in this chat
      if (player) {
        await supabaseClient.from('squid_player_chats').upsert({
          player_id: player.id,
          chat_id: chat.id,
          last_message_at: new Date().toISOString()
        }, { onConflict: 'player_id,chat_id' });
      }

      if (text === '/start') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance, telegram_id')
          .eq('telegram_id', from.id)
          .single();

        await sendMessage(chat.id, 
          `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n🆔 Твой ID: ${player?.telegram_id}\n\n<b>📋 Команды:</b>\n/help - список всех команд\n/top - топ богатых игроков\n/daily - ежедневный бонус\n/promo [код] - активировать промокод\n/pay [ID] [сумма] - перевести монеты\n\nВыбери игру:`,
          {
            inline_keyboard: [
              [{ text: '🍬 Dalgona Challenge', callback_data: 'play_dalgona' }],
              [{ text: '🌉 Стеклянный мост', callback_data: 'play_glass_bridge' }],
              [{ text: '🦑 Игра в Кальмара (PvP)', callback_data: 'play_squid_pvp' }],
              [{ text: '👤 Мой профиль', callback_data: 'profile' }]
            ]
          }
        );
      } else if (text === '/help') {
        await sendMessage(chat.id, 
          `📋 <b>Список команд Squid Game Bot</b>\n\n<b>🎮 Основные команды:</b>\n/start - главное меню бота\n/help - список всех команд\n/profile - твой профиль с балансом и статистикой\n/top - топ 10 игроков этой беседы\n/topworld - топ 10 игроков мира\n\n<b>💰 Экономика:</b>\n/daily - ежедневный бонус 1200 монет (раз в 24 часа)\n/pay [ID] [сумма] - перевести монеты другому игроку\n/promo [код] - активировать промокод на бонус\n\n<b>🎁 Предметы:</b>\n/si - поиск предметов (раз в час)\n/items - показать инвентарь\n/sell [номер] - продать предмет из инвентаря\n\n<b>🎲 Казино:</b>\n/roulette [цвет] [ставка] - игра в рулетку\n  Цвета: red (🔴 x2), black (⚫ x2), green (🟢 x14)\n  Пример: /roulette red 1000\n\n<b>🎮 Игры:</b>\n🍬 Dalgona Challenge - вырежи фигуру\n🌉 Стеклянный мост - пройди мост\n\n<b>⚔️ PvP дуэли:</b>\n/challenge [ID] [ставка] - вызвать игрока на дуэль\n  Пример: /challenge 123456789 500`
        );
      } else if (text === '/profile') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        const prefixText = player?.prefix ? `${player.prefix}` : 'Нет префикса';
        const displayName = player?.prefix 
          ? `[${player.prefix}] ${player?.first_name || from.first_name || 'Игрок'}`
          : player?.first_name || from.first_name || 'Игрок';
        
        await sendMessage(chat.id, 
          `👤 <b>Профиль: ${displayName}</b>\n\n💰 Баланс: ${player?.balance || 0} монет\n🏆 Побед: ${player?.total_wins || 0}\n💀 Поражений: ${player?.total_losses || 0}\n✨ Префикс: ${prefixText}`,
          { 
            inline_keyboard: [
              [{ text: '🛍️ Магазин префиксов', callback_data: `shop_prefixes_u${from.id}` }],
              player?.prefix ? [{ text: '❌ Убрать префикс', callback_data: `remove_prefix_u${from.id}` }] : [],
              [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]
            ].filter(row => row.length > 0)
          }
        );
      } else if (text === '/balance') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance')
          .eq('telegram_id', from.id)
          .single();

        await sendMessage(chat.id, `💰 Твой баланс: ${player?.balance || 0} монет`);
      } else if (text === '/shop') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance, prefix')
          .eq('telegram_id', from.id)
          .single();
        
        const prefixes = [
          { name: 'absolute', price: 2000000, emoji: '👑' },
          { name: 'emperror', price: 3000000, emoji: '⚔️' }
        ];

        let shopText = '🛍️ <b>Магазин префиксов</b>\n\n💰 Твой баланс: ' + (player?.balance || 0) + ' монет\n\n';
        
        prefixes.forEach(prefix => {
          const owned = player?.prefix === prefix.name;
          shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${prefix.price.toLocaleString()} монет ${owned ? '✅ Куплен' : ''}\n`;
        });

        await sendMessage(chat.id, shopText, {
          inline_keyboard: [
            [{ text: '👑 Купить absolute (2,000,000)', callback_data: `buy_prefix_absolute_u${from.id}` }],
            [{ text: '⚔️ Купить emperror (3,000,000)', callback_data: `buy_prefix_emperror_u${from.id}` }]
          ]
        });
      } else if (text === '/top') {
        // Get players who are active in this chat
        const { data: chatPlayers } = await supabaseClient
          .from('squid_player_chats')
          .select('player_id')
          .eq('chat_id', chat.id);

        if (!chatPlayers || chatPlayers.length === 0) {
          await sendMessage(chat.id, '❌ В этой беседе пока нет игроков');
          return new Response('OK', { headers: corsHeaders });
        }

        const playerIds = chatPlayers.map(cp => cp.player_id);

        const { data: topPlayers } = await supabaseClient
          .from('squid_players')
          .select('*')
          .in('id', playerIds)
          .order('balance', { ascending: false })
          .limit(10);

        if (!topPlayers || topPlayers.length === 0) {
          await sendMessage(chat.id, '❌ Топ игроков пуст');
          return new Response('OK', { headers: corsHeaders });
        }

        let topText = '🏆 <b>Топ 10 богатых игроков этой беседы</b>\n\n';
        
        topPlayers.forEach((player, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          const displayName = player.prefix 
            ? `[${player.prefix}] ${player.first_name || 'Неизвестно'}`
            : player.first_name || 'Неизвестно';
          topText += `${medal} ${displayName} - ${player.balance.toLocaleString()} монет\n`;
        });

        await sendMessage(chat.id, topText);
      } else if (text === '/topworld') {
        const { data: topPlayers } = await supabaseClient
          .from('squid_players')
          .select('*')
          .order('balance', { ascending: false })
          .limit(10);

        if (!topPlayers || topPlayers.length === 0) {
          await sendMessage(chat.id, '❌ Топ игроков пуст');
          return new Response('OK', { headers: corsHeaders });
        }

        let topText = '🌍 <b>Топ 10 богатых игроков мира</b>\n\n';
        
        topPlayers.forEach((player, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          const displayName = player.prefix 
            ? `[${player.prefix}] ${player.first_name || 'Неизвестно'}`
            : player.first_name || 'Неизвестно';
          topText += `${medal} ${displayName} - ${player.balance.toLocaleString()} монет\n`;
        });

        await sendMessage(chat.id, topText);
      } else if (text.startsWith('/roulette')) {
        const args = text.split(' ').slice(1);
        
        if (args.length !== 2) {
          await sendMessage(chat.id, '❌ Неверный формат команды!\n\nИспользуй: /roulette <цвет> <ставка>\n\nЦвет: red/красное, black/черное, green/зеленое\nПример: /roulette red 100');
          return new Response('OK', { headers: corsHeaders });
        }

        const colorInput = args[0].toLowerCase();
        const betAmount = parseInt(args[1]);

        // Validate color
        let color: string;
        if (colorInput === 'red' || colorInput === 'красное' || colorInput === 'красный') {
          color = 'red';
        } else if (colorInput === 'black' || colorInput === 'черное' || colorInput === 'черный') {
          color = 'black';
        } else if (colorInput === 'green' || colorInput === 'зеленое' || colorInput === 'зеленый') {
          color = 'green';
        } else {
          await sendMessage(chat.id, '❌ Неверный цвет!\n\nДоступные цвета:\n🔴 red/красное (x2)\n⚫ black/черное (x2)\n🟢 green/зеленое (x14)');
          return new Response('OK', { headers: corsHeaders });
        }

        // Validate bet amount
        if (isNaN(betAmount) || betAmount <= 0) {
          await sendMessage(chat.id, '❌ Неверная ставка! Укажи положительное число.');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance, casino_admin_mode')
          .eq('telegram_id', from.id)
          .single();

        if (!player || player.balance < betAmount) {
          await sendMessage(chat.id, `❌ Недостаточно монет!\n\n💰 Твой баланс: ${player?.balance || 0} монет`);
          return new Response('OK', { headers: corsHeaders });
        }

        // Deduct bet
        await supabaseClient.from('squid_players')
          .update({ balance: player.balance - betAmount })
          .eq('id', player.id);

        // Spin roulette with weighted probabilities
        let resultColor: string;
        let winMultiplier = 0;

        // Admin casino mode - always win
        if (player.casino_admin_mode) {
          resultColor = color;
          winMultiplier = color === 'green' ? 14 : 2;
        } else {
          const result = Math.random();
          
          // Red: 49.9%, Black: 49.9%, Green: 0.2%
          if (result < 0.499) {
            resultColor = 'red';
          } else if (result < 0.998) {
            resultColor = 'black';
          } else {
            resultColor = 'green';
          }

          if (resultColor === color) {
            winMultiplier = color === 'green' ? 14 : 2;
          }
        }

        const winAmount = betAmount * winMultiplier;
        const profit = winAmount - betAmount;

        if (winAmount > 0) {
          await supabaseClient.from('squid_players')
            .update({ balance: player.balance - betAmount + winAmount })
            .eq('id', player.id);
        }

        await supabaseClient.from('squid_casino_history').insert({
          player_id: player.id,
          game_type: 'roulette',
          bet_amount: betAmount,
          win_amount: winAmount,
          result: { color: resultColor, bet: color }
        });

        const resultEmoji = resultColor === 'red' ? '🔴' : resultColor === 'black' ? '⚫' : '🟢';
        const resultText = winAmount > 0 
          ? `🎉 <b>ВЫИГРЫШ!</b>\n\n🎡 Рулетка\nРезультат: ${resultEmoji} ${resultColor}\n💰 Выигрыш: ${profit} монет\n💵 Новый баланс: ${player.balance - betAmount + winAmount} монет`
          : `😔 Проигрыш\n\n🎡 Рулетка\nРезультат: ${resultEmoji} ${resultColor}\n💸 Потеря: ${betAmount} монет\n💵 Новый баланс: ${player.balance - betAmount} монет`;

        await sendMessage(chat.id, resultText);
      } else if (text === '/daily') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, last_daily_claim, balance')
          .eq('telegram_id', from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, '❌ Игрок не найден.');
          return new Response('OK', { headers: corsHeaders });
        }

        const now = new Date();
        const lastClaim = player.last_daily_claim ? new Date(player.last_daily_claim) : null;
        
        // Check if 24 hours have passed
        if (lastClaim && (now.getTime() - lastClaim.getTime()) < 24 * 60 * 60 * 1000) {
          const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now.getTime() - lastClaim.getTime())) / (60 * 60 * 1000));
          await sendMessage(chat.id, `⏰ Ежедневный бонус уже получен!\n\nПриходи через ${hoursLeft} ${hoursLeft === 1 ? 'час' : hoursLeft < 5 ? 'часа' : 'часов'}.`);
          return new Response('OK', { headers: corsHeaders });
        }

        const dailyReward = 1200;
        await supabaseClient.from('squid_players')
          .update({ 
            balance: (player.balance || 0) + dailyReward,
            last_daily_claim: now.toISOString()
          })
          .eq('id', player.id);

        await sendMessage(chat.id, `🎁 <b>Ежедневный бонус получен!</b>\n\n💰 +${dailyReward} монет\n💵 Новый баланс: ${(player.balance || 0) + dailyReward} монет`);
      } else if (text.startsWith('/promo ')) {
        const promoCode = text.split(' ')[1]?.trim();
        
        if (!promoCode) {
          await sendMessage(chat.id, '❌ Укажи промокод!\nИспользуй: /promo КОД');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: promo } = await supabaseClient
          .from('squid_promo_codes')
          .select('*')
          .eq('code', promoCode)
          .single();

        if (!promo) {
          await sendMessage(chat.id, '❌ Промокод не найден!');
          return new Response('OK', { headers: corsHeaders });
        }

        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          await sendMessage(chat.id, '❌ Срок действия промокода истёк!');
          return new Response('OK', { headers: corsHeaders });
        }

        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
          await sendMessage(chat.id, '❌ Лимит использований промокода исчерпан!');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
          .eq('telegram_id', from.id)
          .single();

        const { data: existingRedemption } = await supabaseClient
          .from('squid_promo_redemptions')
          .select('*')
          .eq('player_id', player?.id)
          .eq('promo_code_id', promo.id)
          .single();

        if (existingRedemption) {
          await sendMessage(chat.id, '❌ Ты уже использовал этот промокод!');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_promo_redemptions').insert({
          player_id: player?.id,
          promo_code_id: promo.id
        });

        await supabaseClient.from('squid_promo_codes')
          .update({ current_uses: (promo.current_uses || 0) + 1 })
          .eq('id', promo.id);

        const newBalance = (player?.balance || 0) + promo.reward_amount;
        await supabaseClient.from('squid_players')
          .update({ balance: newBalance })
          .eq('id', player?.id);

        await sendMessage(chat.id, `🎉 <b>Промокод активирован!</b>\n\n💰 +${promo.reward_amount} монет\n💵 Новый баланс: ${newBalance} монет`);
      } else if (text.startsWith('/pay ')) {
        const args = text.split(' ');
        if (args.length !== 3) {
          await sendMessage(chat.id, '❌ Неверный формат!\nИспользуй: /pay [ID] [сумма]\nПример: /pay 123456789 100');
          return new Response('OK', { headers: corsHeaders });
        }

        const recipientId = parseInt(args[1]);
        const amount = parseInt(args[2]);

        if (isNaN(recipientId) || isNaN(amount) || amount <= 0) {
          await sendMessage(chat.id, '❌ Неверные данные! ID и сумма должны быть положительными числами.');
          return new Response('OK', { headers: corsHeaders });
        }

        if (recipientId === from.id) {
          await sendMessage(chat.id, '❌ Нельзя переводить монеты самому себе!');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: sender } = await supabaseClient
          .from('squid_players')
          .select('id, balance, first_name')
          .eq('telegram_id', from.id)
          .single();

        if (!sender || sender.balance < amount) {
          await sendMessage(chat.id, `❌ Недостаточно монет!\n\n💰 Твой баланс: ${sender?.balance || 0} монет`);
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: recipient } = await supabaseClient
          .from('squid_players')
          .select('id, balance, first_name')
          .eq('telegram_id', recipientId)
          .single();

        if (!recipient) {
          await sendMessage(chat.id, '❌ Получатель не найден!');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_players')
          .update({ balance: sender.balance - amount })
          .eq('id', sender.id);

        await supabaseClient.from('squid_players')
          .update({ balance: recipient.balance + amount })
          .eq('id', recipient.id);

        await sendMessage(chat.id, `✅ Перевод выполнен!\n\n💸 Отправлено: ${amount} монет\n👤 Получатель: ${recipient.first_name}\n💵 Твой новый баланс: ${sender.balance - amount} монет`);
        await sendMessage(recipientId, `💰 Тебе перевели ${amount} монет!\n\n👤 От: ${sender.first_name}\n💵 Твой новый баланс: ${recipient.balance + amount} монет`);
      } else if (text.startsWith('/challenge ')) {
        const args = text.split(' ');
        if (args.length !== 3) {
          await sendMessage(chat.id, '❌ Неверный формат!\nИспользуй: /challenge [ID] [ставка]');
          return new Response('OK', { headers: corsHeaders });
        }

        const opponentId = parseInt(args[1]);
        const betAmount = parseInt(args[2]);

        if (isNaN(opponentId) || isNaN(betAmount) || betAmount <= 0) {
          await sendMessage(chat.id, '❌ Неверные данные!');
          return new Response('OK', { headers: corsHeaders });
        }

        if (opponentId === from.id) {
          await sendMessage(chat.id, '❌ Нельзя вызвать самого себя!');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance, first_name')
          .eq('telegram_id', from.id)
          .single();

        if (!player || player.balance < betAmount) {
          await sendMessage(chat.id, `❌ Недостаточно монет!\n\n💰 Твой баланс: ${player?.balance || 0} монет`);
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: opponent } = await supabaseClient
          .from('squid_players')
          .select('id')
          .eq('telegram_id', opponentId)
          .single();

        if (!opponent) {
          await sendMessage(chat.id, '❌ Игрок не найден!');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .insert({
            player1_id: player.id,
            game_type: 'squid_pvp',
            bet_amount: betAmount,
            status: 'waiting'
          })
          .select()
          .single();

        await sendMessage(chat.id, `⚔️ Вызов отправлен!\n\nСтавка: ${betAmount} монет\nОжидаем ответ...`);
        
        console.log(`Sending challenge to opponent ${opponentId} with buttons`);
        const challengeResult = await sendMessage(opponentId, `🦑 Вызов на Игру в Кальмара!\n\n${player.first_name} бросает тебе вызов!\n💰 Ставка: ${betAmount} монет\n\nТы принимаешь?`, {
          inline_keyboard: [
            [{ text: '✅ Принять', callback_data: `accept_challenge_${session.id}_u${opponentId}` }],
            [{ text: '❌ Отказаться', callback_data: `decline_challenge_${session.id}_u${opponentId}` }]
          ]
        });
        console.log(`Challenge message result:`, challengeResult);
      } else if (text.startsWith('/admin_add_coins ')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const args = text.split(' ');
        if (args.length !== 3) {
          await sendMessage(chat.id, '❌ Формат: /admin_add_coins [ID] [сумма]');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        const amount = parseInt(args[2]);

        const { data: target } = await supabaseClient
          .from('squid_players')
          .select('id, balance, first_name')
          .eq('telegram_id', targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, '❌ Игрок не найден!');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_players')
          .update({ balance: target.balance + amount })
          .eq('id', target.id);

        await sendMessage(chat.id, `✅ Добавлено ${amount} монет игроку ${target.first_name}`);
      } else if (text === '/balance') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance')
          .eq('telegram_id', from.id)
          .single();

        await sendMessage(chat.id, `💰 <b>Твой баланс</b>\n\n${player?.balance || 0} монет`);
      } else if (text === '/shop') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance, prefix')
          .eq('telegram_id', from.id)
          .single();

        const prefixes = [
          { name: 'absolute', price: 2000000, emoji: '👑' },
          { name: 'emperror', price: 3000000, emoji: '⚔️' }
        ];

        let shopText = '🛍️ <b>Магазин префиксов</b>\n\n💰 Твой баланс: ' + (player?.balance || 0) + ' монет\n\n';
        
        prefixes.forEach(prefix => {
          const owned = player?.prefix === prefix.name;
          shopText += `${prefix.emoji} <b>${prefix.name}</b> - ${prefix.price.toLocaleString()} монет ${owned ? '✅ Куплен' : ''}\n`;
        });

        await sendMessage(chat.id, shopText, {
          inline_keyboard: [
            [{ text: '👑 Купить absolute (2,000,000)', callback_data: `buy_prefix_absolute_u${from.id}` }],
            [{ text: '⚔️ Купить emperror (3,000,000)', callback_data: `buy_prefix_emperror_u${from.id}` }]
          ]
        });
      } else if (text.startsWith('/admin_create_promo ')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const args = text.split(' ');
        if (args.length !== 3) {
          await sendMessage(chat.id, '❌ Формат: /admin_create_promo [код] [сумма]');
          return new Response('OK', { headers: corsHeaders });
        }

        const code = args[1];
        const reward = parseInt(args[2]);

        await supabaseClient.from('squid_promo_codes').insert({
          code: code,
          reward_amount: reward
        });

        await sendMessage(chat.id, `✅ Промокод создан!\n\nКод: ${code}\nНаграда: ${reward} монет`);
      } else if (text === '/servers') {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: chats } = await supabaseClient
          .from('squid_bot_chats')
          .select('*')
          .order('last_activity', { ascending: false });

        if (!chats || chats.length === 0) {
          await sendMessage(chat.id, '❌ Список чатов пуст');
          return new Response('OK', { headers: corsHeaders });
        }

        let serversText = '🌐 <b>Список серверов/чатов бота</b>\n\n';
        
        chats.forEach((chatData, index) => {
          const chatTypeEmoji = chatData.chat_type === 'private' ? '👤' : chatData.chat_type === 'group' ? '👥' : chatData.chat_type === 'supergroup' ? '👥' : '📢';
          const chatName = chatData.chat_title || chatData.chat_username || `Chat ${chatData.chat_id}`;
          const members = chatData.member_count ? ` (${chatData.member_count} участников)` : '';
          const lastActive = new Date(chatData.last_activity).toLocaleDateString('ru-RU');
          
          serversText += `${index + 1}. ${chatTypeEmoji} <b>${chatName}</b>${members}\n`;
          serversText += `   ID: <code>${chatData.chat_id}</code> | Последняя активность: ${lastActive}\n\n`;
        });

        await sendMessage(chat.id, serversText);
      } else if (text === '/casino_admin') {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('casino_admin_mode')
          .eq('telegram_id', from.id)
          .single();

        const newMode = !player?.casino_admin_mode;

        await supabaseClient.from('squid_players')
          .update({ casino_admin_mode: newMode })
          .eq('telegram_id', from.id);

        const modeText = newMode ? '✅ ВКЛЮЧЁН' : '❌ ВЫКЛЮЧЕН';
        await sendMessage(chat.id, `🎰 <b>Режим админа казино ${modeText}</b>\n\n${newMode ? 'Теперь ты будешь всегда выигрывать в казино!' : 'Обычный режим игры восстановлен.'}`);
      } else if (text === '/admin_commands') {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        await sendMessage(chat.id, 
          `👑 <b>Команды администратора</b>\n\n<b>💰 Управление балансом:</b>\n/admin_add_coins [ID] [сумма] - добавить монеты игроку\n/admin_set_balance [ID] [сумма] - установить точный баланс\n\n<b>🎟️ Промокоды:</b>\n/admin_create_promo [код] [сумма] - создать промокод\n/admin_delete_promo [код] - удалить промокод\n\n<b>🎰 Казино:</b>\n/casino_admin - включить/выключить режим всегда выигрывать\n\n<b>📊 Информация:</b>\n/servers - список всех чатов бота\n/admin_search - список всех игроков с ID\n/admin_commands - показать эту справку`
        );
      } else if (text === '/admin_search') {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: allPlayers } = await supabaseClient
          .from('squid_players')
          .select('*')
          .order('balance', { ascending: false });

        if (!allPlayers || allPlayers.length === 0) {
          await sendMessage(chat.id, '❌ Список игроков пуст');
          return new Response('OK', { headers: corsHeaders });
        }

        let searchText = '🔍 <b>Список всех игроков</b>\n\n';
        
        allPlayers.forEach((player, index) => {
          const prefix = player.prefix ? `[${player.prefix}] ` : '';
          const displayName = player.first_name || 'Неизвестно';
          const username = player.username ? `@${player.username}` : '';
          searchText += `${index + 1}. ${prefix}${displayName} ${username}\n`;
          searchText += `   ID: <code>${player.telegram_id}</code> | 💰 ${player.balance.toLocaleString()} монет\n\n`;
        });

        await sendMessage(chat.id, searchText);
      } else if (text.startsWith('/admin_delete_promo ')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const code = text.split(' ')[1];
        
        if (!code) {
          await sendMessage(chat.id, '❌ Формат: /admin_delete_promo [код]');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: promo } = await supabaseClient
          .from('squid_promo_codes')
          .select('*')
          .eq('code', code)
          .single();

        if (!promo) {
          await sendMessage(chat.id, '❌ Промокод не найден!');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient
          .from('squid_promo_codes')
          .delete()
          .eq('code', code);

        await sendMessage(chat.id, `✅ Промокод "${code}" удалён!`);
      } else if (text.startsWith('/admin_set_balance ')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const args = text.split(' ');
        if (args.length !== 3) {
          await sendMessage(chat.id, '❌ Формат: /admin_set_balance [ID] [сумма]');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        const newBalance = parseInt(args[2]);

        if (isNaN(targetId) || isNaN(newBalance)) {
          await sendMessage(chat.id, '❌ ID и сумма должны быть числами!');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from('squid_players')
          .select('id, balance, first_name')
          .eq('telegram_id', targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, '❌ Игрок не найден!');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_players')
          .update({ balance: newBalance })
          .eq('id', target.id);

        await sendMessage(chat.id, `✅ Баланс игрока ${target.first_name} изменён с ${target.balance} на ${newBalance} монет`);
      } else if (text.startsWith('/admin_edit ')) {
        const { data: admin } = await supabaseClient
          .from('squid_admins')
          .select('*')
          .eq('telegram_id', from.id)
          .single();

        if (!admin) {
          return new Response('OK', { headers: corsHeaders });
        }

        const args = text.split(' ');
        if (args.length !== 2) {
          await sendMessage(chat.id, '❌ Формат: /admin_edit [ID]');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        if (isNaN(targetId)) {
          await sendMessage(chat.id, '❌ ID должен быть числом!');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from('squid_players')
          .select('*')
          .eq('telegram_id', targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, '❌ Игрок не найден!');
          return new Response('OK', { headers: corsHeaders });
        }

        const prefixText = target.prefix ? target.prefix : 'нет';
        
        await sendMessage(chat.id, 
          `⚙️ <b>Редактирование игрока ${targetId}</b>\n\n💰 Баланс: ${target.balance} монет\n✨ Префикс: ${prefixText}\n🏆 Побед: ${target.total_wins}\n💀 Поражений: ${target.total_losses}`,
          {
            inline_keyboard: [
              [{ text: '✨ Дать префикс absolute', callback_data: `admin_set_prefix_absolute_${targetId}` }],
              [{ text: '✨ Дать префикс emperror', callback_data: `admin_set_prefix_emperror_${targetId}` }],
              [{ text: '❌ Убрать префикс', callback_data: `admin_remove_prefix_${targetId}` }],
              [{ text: '🔄 Обнулить статистику', callback_data: `admin_reset_stats_${targetId}` }]
            ]
          }
        );
      } else if (text === '/si') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance, last_si_claim')
          .eq('telegram_id', from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, '❌ Игрок не найден.');
          return new Response('OK', { headers: corsHeaders });
        }

        const now = new Date();
        const lastClaim = player.last_si_claim ? new Date(player.last_si_claim) : null;
        
        // Check if 1 hour has passed
        if (lastClaim && (now.getTime() - lastClaim.getTime()) < 60 * 60 * 1000) {
          const minutesLeft = Math.ceil((60 * 60 * 1000 - (now.getTime() - lastClaim.getTime())) / (60 * 1000));
          await sendMessage(chat.id, `⏰ Поиск предметов доступен раз в час!\n\nПриходи через ${minutesLeft} ${minutesLeft === 1 ? 'минуту' : minutesLeft < 5 ? 'минуты' : 'минут'}.`);
          return new Response('OK', { headers: corsHeaders });
        }

        // Random money (0-4000)
        const moneyFound = Math.floor(Math.random() * 4001);

        // Item drop chances
        const itemChance = Math.random() * 100;
        let itemFound: { name: string, rarity: string, sellPrice: number } | null = null;

        if (itemChance < 2) {
          // 2% - Маска Фронтман (Мифическая)
          itemFound = { name: '🎭 Маска Фронтман', rarity: 'Мифическая', sellPrice: 25000 };
        } else if (itemChance < 9) {
          // 7% - Карта VIP (Эпическая)
          itemFound = { name: '💳 Карта VIP', rarity: 'Эпическая', sellPrice: 9000 };
        } else if (itemChance < 22) {
          // 13% - Маска квадрат (Раритет)
          itemFound = { name: '🟥 Маска квадрат', rarity: 'Раритет', sellPrice: 5000 };
        } else if (itemChance < 47) {
          // 25% - Печенька Зонт (Обычная)
          itemFound = { name: '🍪 Печенька Зонт', rarity: 'Обычная', sellPrice: 2000 };
        } else if (itemChance < 67) {
          // 20% - Зипка 456 (Обычная)
          itemFound = { name: '🧥 Зипка 456', rarity: 'Обычная', sellPrice: 3000 };
        }

        // Update balance and last claim
        await supabaseClient.from('squid_players')
          .update({ 
            balance: player.balance + moneyFound,
            last_si_claim: now.toISOString()
          })
          .eq('id', player.id);

        // Add item to inventory if found
        if (itemFound) {
          await supabaseClient.from('squid_player_items').insert({
            player_id: player.id,
            item_name: itemFound.name,
            item_rarity: itemFound.rarity,
            sell_price: itemFound.sellPrice
          });
        }

        const resultText = itemFound
          ? `🔍 <b>Поиск предметов</b>\n\n💰 Найдено монет: ${moneyFound}\n\n🎁 <b>Предмет найден!</b>\n${itemFound.name}\nРедкость: ${itemFound.rarity}\nЦена продажи: ${itemFound.sellPrice} монет\n\n💵 Новый баланс: ${player.balance + moneyFound} монет`
          : `🔍 <b>Поиск предметов</b>\n\n💰 Найдено монет: ${moneyFound}\n\n❌ Предметов не найдено\n\n💵 Новый баланс: ${player.balance + moneyFound} монет`;

        await sendMessage(chat.id, resultText);
      } else if (text === '/items') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id')
          .eq('telegram_id', from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, '❌ Игрок не найден.');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: items } = await supabaseClient
          .from('squid_player_items')
          .select('*')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false });

        if (!items || items.length === 0) {
          await sendMessage(chat.id, '🎒 <b>Твой инвентарь пуст</b>\n\nИспользуй команду /si чтобы найти предметы!');
          return new Response('OK', { headers: corsHeaders });
        }

        let inventoryText = '🎒 <b>Твой инвентарь</b>\n\n';
        
        items.forEach((item, index) => {
          inventoryText += `${index + 1}. ${item.item_name}\nРедкость: ${item.item_rarity}\nЦена продажи: ${item.sell_price} монет\n\n`;
        });

        inventoryText += `\nЧтобы продать предмет, используй:\n/sell [номер]`;

        await sendMessage(chat.id, inventoryText);
      } else if (text.startsWith('/sell ')) {
        const itemIndex = parseInt(text.split(' ')[1]);

        if (isNaN(itemIndex) || itemIndex < 1) {
          await sendMessage(chat.id, '❌ Неверный номер предмета!\nИспользуй: /sell [номер]\nПример: /sell 1');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
          .eq('telegram_id', from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, '❌ Игрок не найден.');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: items } = await supabaseClient
          .from('squid_player_items')
          .select('*')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false });

        if (!items || items.length === 0) {
          await sendMessage(chat.id, '❌ У тебя нет предметов!');
          return new Response('OK', { headers: corsHeaders });
        }

        if (itemIndex > items.length) {
          await sendMessage(chat.id, `❌ Предмет с номером ${itemIndex} не найден!`);
          return new Response('OK', { headers: corsHeaders });
        }

        const itemToSell = items[itemIndex - 1];

        // Delete item from inventory
        await supabaseClient
          .from('squid_player_items')
          .delete()
          .eq('id', itemToSell.id);

        // Add money to balance
        await supabaseClient.from('squid_players')
          .update({ balance: player.balance + itemToSell.sell_price })
          .eq('id', player.id);

        await sendMessage(chat.id, `✅ Предмет продан!\n\n${itemToSell.item_name}\n💰 Получено: ${itemToSell.sell_price} монет\n💵 Новый баланс: ${player.balance + itemToSell.sell_price} монет`);
      }
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

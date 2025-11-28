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
    chat: { id: number };
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
        const userId = parseInt(data.split('_u')[1].split('_')[0]);
        if (userId !== from.id) {
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
            [{ text: '⭐ Звезда', callback_data: 'dalgona_select_star' }],
            [{ text: '☂️ Зонтик', callback_data: 'dalgona_select_umbrella' }],
            [{ text: '🔺 Треугольник', callback_data: 'dalgona_select_triangle' }],
            [{ text: '🖼️ Мона Лиза', callback_data: 'dalgona_select_monalisa' }],
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
      } else if (data.startsWith('accept_challenge_')) {
        const sessionId = data.replace('accept_challenge_', '');
        
        const { data: playerData } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
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

        // Accept challenge
        await supabaseClient.from('squid_game_sessions')
          .update({ player2_id: playerData?.id, status: 'active' })
          .eq('id', sessionId);

        // Notify both players
        const player1Chat = (session.player1 as any).telegram_id;
        await sendMessage(player1Chat, `⚔️ ${from.first_name} принял вызов!\n\nИгра началась! Отправь /attack или /defend`);
        await sendMessage(chatId, `⚔️ Ты принял вызов!\n\nСтавка: ${session.bet_amount} монет\nОтправь /attack или /defend`);
      } else if (data.startsWith('dalgona_select_')) {
        const shape = data.replace('dalgona_select_', '');
        
        const shapeConfig: Record<string, { name: string, bet: number, reward: number, chance: number }> = {
          star: { name: '⭐ Звезда', bet: 100, reward: 400, chance: 0.7 },
          umbrella: { name: '☂️ Зонтик', bet: 300, reward: 1000, chance: 0.4 },
          triangle: { name: '🔺 Треугольник', bet: 120, reward: 300, chance: 0.75 },
          monalisa: { name: '🖼️ Мона Лиза', bet: 500, reward: 5000, chance: 0.03 }
        };

        const config = shapeConfig[shape];
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
              [{ text: '✅ Вырезать', callback_data: `dalgona_confirm_${shape}` }],
              [{ text: '❌ Отмена', callback_data: 'play_dalgona' }]
            ]
          }
        );
      } else if (data.startsWith('dalgona_confirm_')) {
        const shape = data.replace('dalgona_confirm_', '');
        
        const shapeConfig: Record<string, { name: string, bet: number, reward: number, chance: number }> = {
          star: { name: '⭐ Звезда', bet: 100, reward: 400, chance: 0.7 },
          umbrella: { name: '☂️ Зонтик', bet: 300, reward: 1000, chance: 0.4 },
          triangle: { name: '🔺 Треугольник', bet: 120, reward: 300, chance: 0.75 },
          monalisa: { name: '🖼️ Мона Лиза', bet: 500, reward: 5000, chance: 0.03 }
        };

        const config = shapeConfig[shape];
        if (!config) return new Response('OK', { headers: corsHeaders });

        const { data: currentPlayer } = await supabaseClient
          .from('squid_players')
          .select('balance')
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

        const success = Math.random() < config.chance;
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
            result: { shape, success: true }
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
            result: { shape, success: false }
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

        await editMessage(chatId, message!.message_id, 
          `👤 <b>Твой профиль</b>\n\n💰 Баланс: ${player?.balance || 0} монет\n🏆 Побед: ${player?.total_wins || 0}\n💀 Поражений: ${player?.total_losses || 0}`,
          { inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]] }
        );
      } else if (data === 'play_casino') {
        await sendMessage(chatId, '🎰 <b>Казино</b>\n\nВыбери игру:', {
          inline_keyboard: [
            [{ text: '🎡 Рулетка', callback_data: `casino_roulette_u${from.id}` }],
            [{ text: '🎰 Слоты', callback_data: `casino_slots_u${from.id}` }],
            [{ text: '📈 Краш', callback_data: `casino_crash_u${from.id}` }],
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
          .select('id, balance')
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
        const result = Math.random();
        let resultColor: string;
        let winMultiplier = 0;

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
      } else if (data.startsWith('casino_slots_u')) {
        await editMessage(chatId, message!.message_id, '🎰 <b>Слоты</b>\n\nВыбери размер ставки:', {
          inline_keyboard: [
            [{ text: '100 монет', callback_data: `slots_play_100_u${from.id}` }],
            [{ text: '500 монет', callback_data: `slots_play_500_u${from.id}` }],
            [{ text: '1000 монет', callback_data: `slots_play_1000_u${from.id}` }],
            [{ text: '5000 монет', callback_data: `slots_play_5000_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      } else if (data.startsWith('slots_play_')) {
        const betAmount = parseInt(data.split('_')[2]);

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
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

        // Slot symbols and their weights
        const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
        const weights = [30, 25, 20, 15, 7, 2, 1]; // Higher = more common
        
        const spinReel = () => {
          const total = weights.reduce((a, b) => a + b, 0);
          const random = Math.random() * total;
          let sum = 0;
          for (let i = 0; i < symbols.length; i++) {
            sum += weights[i];
            if (random < sum) return symbols[i];
          }
          return symbols[0];
        };

        const reel1 = spinReel();
        const reel2 = spinReel();
        const reel3 = spinReel();

        // Calculate win
        let winMultiplier = 0;
        if (reel1 === reel2 && reel2 === reel3) {
          // Three of a kind
          const symbolIndex = symbols.indexOf(reel1);
          winMultiplier = [3, 5, 8, 12, 25, 50, 100][symbolIndex];
        } else if (reel1 === reel2 || reel2 === reel3) {
          // Two of a kind
          winMultiplier = 1.5;
        }

        const winAmount = Math.floor(betAmount * winMultiplier);
        const profit = winAmount - betAmount;

        if (winAmount > 0) {
          await supabaseClient.from('squid_players')
            .update({ balance: player.balance - betAmount + winAmount })
            .eq('id', player.id);
        }

        await supabaseClient.from('squid_casino_history').insert({
          player_id: player.id,
          game_type: 'slots',
          bet_amount: betAmount,
          win_amount: winAmount,
          result: { reels: [reel1, reel2, reel3] }
        });

        const resultText = winAmount > 0
          ? `🎰 ${reel1} ${reel2} ${reel3}\n\n🎉 <b>ВЫИГРЫШ!</b>\n💰 Выигрыш: ${profit} монет (x${winMultiplier})\n💵 Новый баланс: ${player.balance - betAmount + winAmount} монет`
          : `🎰 ${reel1} ${reel2} ${reel3}\n\n😔 Проигрыш\n💸 Потеря: ${betAmount} монет\n💵 Новый баланс: ${player.balance - betAmount} монет`;

        await editMessage(chatId, message!.message_id, resultText, {
          inline_keyboard: [
            [{ text: '🎰 Играть еще', callback_data: `casino_slots_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      } else if (data.startsWith('casino_crash_u')) {
        await editMessage(chatId, message!.message_id, '📈 <b>Краш</b>\n\nВыбери размер ставки:', {
          inline_keyboard: [
            [{ text: '100 монет', callback_data: `crash_start_100_u${from.id}` }],
            [{ text: '500 монет', callback_data: `crash_start_500_u${from.id}` }],
            [{ text: '1000 монет', callback_data: `crash_start_1000_u${from.id}` }],
            [{ text: '5000 монет', callback_data: `crash_start_5000_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      } else if (data.startsWith('crash_start_')) {
        const betAmount = parseInt(data.split('_')[2]);

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
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

        // Generate crash point (weighted towards lower multipliers)
        const random = Math.random();
        let crashPoint: number;
        if (random < 0.5) crashPoint = 1 + Math.random() * 0.5; // 50% chance: 1.0-1.5x
        else if (random < 0.8) crashPoint = 1.5 + Math.random() * 1.5; // 30% chance: 1.5-3.0x
        else if (random < 0.95) crashPoint = 3 + Math.random() * 7; // 15% chance: 3.0-10.0x
        else crashPoint = 10 + Math.random() * 90; // 5% chance: 10.0-100.0x

        // Create game session
        await supabaseClient.from('squid_game_sessions').insert({
          player1_id: player.id,
          game_type: 'crash',
          bet_amount: betAmount,
          status: 'active',
          game_data: { crashPoint: crashPoint.toFixed(2), currentMultiplier: 1.00 }
        });

        await sendMessage(chatId, `📈 <b>Игра началась!</b>\n\nСтавка: ${betAmount} монет\nТекущий множитель: 1.00x\n\nНажми "Забрать", когда захочешь выйти!`, {
          inline_keyboard: [
            [{ text: '💰 Забрать (x1.50)', callback_data: `crash_cashout_1.50_u${from.id}` }],
            [{ text: '💰 Забрать (x2.00)', callback_data: `crash_cashout_2.00_u${from.id}` }],
            [{ text: '💰 Забрать (x3.00)', callback_data: `crash_cashout_3.00_u${from.id}` }],
            [{ text: '💰 Забрать (x5.00)', callback_data: `crash_cashout_5.00_u${from.id}` }],
            [{ text: '💰 Забрать (x10.00)', callback_data: `crash_cashout_10.00_u${from.id}` }]
          ]
        });
      } else if (data.startsWith('crash_cashout_')) {
        const cashoutMultiplier = parseFloat(data.split('_')[2]);

        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
          .eq('telegram_id', from.id)
          .single();

        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*')
          .eq('player1_id', player?.id)
          .eq('game_type', 'crash')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!session) {
          await answerCallbackQuery(callbackId, 'Игра не найдена!');
          return new Response('OK', { headers: corsHeaders });
        }

        const gameData = session.game_data as any;
        const crashPoint = parseFloat(gameData.crashPoint);

        await supabaseClient.from('squid_game_sessions')
          .update({ status: 'finished', finished_at: new Date().toISOString() })
          .eq('id', session.id);

        if (cashoutMultiplier <= crashPoint) {
          // Win!
          const winAmount = Math.floor(session.bet_amount * cashoutMultiplier);
          const profit = winAmount - session.bet_amount;

          await supabaseClient.from('squid_players')
            .update({ balance: (player?.balance || 0) + winAmount })
            .eq('id', player?.id);

          await supabaseClient.from('squid_casino_history').insert({
            player_id: player?.id,
            game_type: 'crash',
            bet_amount: session.bet_amount,
            win_amount: winAmount,
            result: { crashPoint, cashoutAt: cashoutMultiplier, won: true }
          });

          await editMessage(chatId, message!.message_id, `🎉 <b>УСПЕХ!</b>\n\n📈 Вышел на x${cashoutMultiplier.toFixed(2)}\n💥 Крашпоинт был x${crashPoint.toFixed(2)}\n\n💰 Выигрыш: ${profit} монет\n💵 Новый баланс: ${(player?.balance || 0) + winAmount} монет`, {
            inline_keyboard: [
              [{ text: '📈 Играть еще', callback_data: `casino_crash_u${from.id}` }],
              [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
            ]
          });
        } else {
          // Lost - crashed before cashout
          await supabaseClient.from('squid_casino_history').insert({
            player_id: player?.id,
            game_type: 'crash',
            bet_amount: session.bet_amount,
            win_amount: 0,
            result: { crashPoint, cashoutAt: cashoutMultiplier, won: false }
          });

          await editMessage(chatId, message!.message_id, `💥 <b>КРАШ!</b>\n\n📈 Краш на x${crashPoint.toFixed(2)}\n❌ Не успел забрать на x${cashoutMultiplier.toFixed(2)}\n\n💸 Потеря: ${session.bet_amount} монет\n💵 Новый баланс: ${player?.balance || 0} монет`, {
            inline_keyboard: [
              [{ text: '📈 Играть еще', callback_data: `casino_crash_u${from.id}` }],
              [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
            ]
          });
        }
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
      await supabaseClient.from('squid_players').upsert({
        telegram_id: from.id,
        username: from.username,
        first_name: from.first_name,
      }, { onConflict: 'telegram_id' });

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
      } else if (text === '/top') {
        const { data: topPlayers } = await supabaseClient
          .from('squid_players')
          .select('*')
          .order('balance', { ascending: false })
          .limit(10);

        if (!topPlayers || topPlayers.length === 0) {
          await sendMessage(chat.id, '❌ Топ игроков пуст');
          return new Response('OK', { headers: corsHeaders });
        }

        let topText = '🏆 <b>Топ 10 богатых игроков</b>\n\n';
        
        topPlayers.forEach((player, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          topText += `${medal} ${player.first_name || 'Неизвестно'} - ${player.balance} монет\n`;
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
          .select('id, balance')
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

        // Spin roulette (18 red, 18 black, 1 green)
        const result = Math.random();
        let resultColor: string;
        let winMultiplier = 0;

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
      } else if (text === '/slots') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance')
          .eq('telegram_id', from.id)
          .single();

        await sendMessage(chat.id, `🎰 <b>Слоты</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n\nВыбери размер ставки:`, {
          inline_keyboard: [
            [{ text: '100 монет', callback_data: `slots_play_100_u${from.id}` }],
            [{ text: '500 монет', callback_data: `slots_play_500_u${from.id}` }],
            [{ text: '1000 монет', callback_data: `slots_play_1000_u${from.id}` }],
            [{ text: '5000 монет', callback_data: `slots_play_5000_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      } else if (text === '/crash') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('balance')
          .eq('telegram_id', from.id)
          .single();

        await sendMessage(chat.id, `📈 <b>Краш</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n\nВыбери размер ставки:`, {
          inline_keyboard: [
            [{ text: '100 монет', callback_data: `crash_start_100_u${from.id}` }],
            [{ text: '500 монет', callback_data: `crash_start_500_u${from.id}` }],
            [{ text: '1000 монет', callback_data: `crash_start_1000_u${from.id}` }],
            [{ text: '5000 монет', callback_data: `crash_start_5000_u${from.id}` }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
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
        await sendMessage(opponentId, `⚔️ ${player.first_name} вызывает тебя!\n\nСтавка: ${betAmount} монет`, {
          inline_keyboard: [[{ text: '✅ Принять', callback_data: `accept_challenge_${session.id}` }]]
        });
      } else if (text === '/attack' || text === '/defend') {
        const action = text === '/attack' ? 'attack' : 'defend';
        
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id')
          .eq('telegram_id', from.id)
          .single();

        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*, player1:squid_players!player1_id(telegram_id, first_name), player2:squid_players!player2_id(telegram_id, first_name)')
          .or(`player1_id.eq.${player?.id},player2_id.eq.${player?.id}`)
          .eq('game_type', 'squid_pvp')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!session) {
          await sendMessage(chat.id, '❌ Активная игра не найдена!');
          return new Response('OK', { headers: corsHeaders });
        }

        const gameData = session.game_data as any || {};
        const isPlayer1 = session.player1_id === player?.id;
        const playerKey = isPlayer1 ? 'player1Action' : 'player2Action';

        if (gameData[playerKey]) {
          await sendMessage(chat.id, '⏳ Ты уже сделал ход! Жди соперника...');
          return new Response('OK', { headers: corsHeaders });
        }

        gameData[playerKey] = action;

        if (gameData.player1Action && gameData.player2Action) {
          const p1Action = gameData.player1Action;
          const p2Action = gameData.player2Action;
          
          let winnerId = null;
          if (p1Action === 'attack' && p2Action === 'defend') {
            winnerId = session.player2_id;
          } else if (p1Action === 'defend' && p2Action === 'attack') {
            winnerId = session.player1_id;
          } else if (p1Action === 'attack' && p2Action === 'attack') {
            winnerId = Math.random() < 0.5 ? session.player1_id : session.player2_id;
          }

          await supabaseClient.from('squid_game_sessions')
            .update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() })
            .eq('id', session.id);

          if (winnerId) {
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
            await supabaseClient.from('squid_players')
              .update({ total_losses: (await supabaseClient.from('squid_players').select('total_losses').eq('id', loserId).single()).data?.total_losses + 1 || 1 })
              .eq('id', loserId);

            const winnerChatId = winnerId === session.player1_id ? (session.player1 as any).telegram_id : (session.player2 as any).telegram_id;
            const loserChatId = winnerId === session.player1_id ? (session.player2 as any).telegram_id : (session.player1 as any).telegram_id;

            await sendMessage(winnerChatId, `🎉 <b>ПОБЕДА!</b>\n\nТвой ход: ${p1Action === 'attack' ? '⚔️ Атака' : '🛡 Защита'}\nХод соперника: ${p2Action === 'attack' ? '⚔️ Атака' : '🛡 Защита'}\n\n💰 Выигрыш: ${session.bet_amount * 2} монет`);
            await sendMessage(loserChatId, `💀 <b>ПОРАЖЕНИЕ</b>\n\nТвой ход: ${p2Action === 'attack' ? '⚔️ Атака' : '🛡 Защита'}\nХод соперника: ${p1Action === 'attack' ? '⚔️ Атака' : '🛡 Защита'}\n\n💸 Потеря: ${session.bet_amount} монет`);
          }
        } else {
          await supabaseClient.from('squid_game_sessions')
            .update({ game_data: gameData })
            .eq('id', session.id);

          await sendMessage(chat.id, '⏳ Ход сделан! Жди соперника...');
        }
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

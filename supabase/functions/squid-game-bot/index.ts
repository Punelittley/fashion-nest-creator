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

      // Ensure player exists
      await supabaseClient.from('squid_players').upsert({
        telegram_id: from.id,
        username: from.username,
        first_name: from.first_name,
      }, { onConflict: 'telegram_id' });

      await answerCallbackQuery(callbackId);

      if (data === 'play_dalgona') {
        await sendMessage(chatId, '🍬 <b>Игра Dalgona</b>\n\nВыбери форму, которую нужно вырезать:', {
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

        await sendMessage(chatId, `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n\nВыбери игру:`, {
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

        await sendMessage(chatId, 
          `👤 <b>Твой профиль</b>\n\n💰 Баланс: ${player?.balance || 0} монет\n🏆 Побед: ${player?.total_wins || 0}\n💀 Поражений: ${player?.total_losses || 0}`,
          { inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]] }
        );
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

        const { data: isAdmin } = await supabaseClient
          .from('squid_admins')
          .select('telegram_id')
          .eq('telegram_id', from.id)
          .single();

        const commands = isAdmin 
          ? '\n\n<b>📋 Команды:</b>\n/daily - ежедневный бонус\n/promo [код] - активировать промокод\n\n<b>👑 Админ команды:</b>\n/admin_balance [ID] [сумма] - изменить баланс\n/admin_promo [код] [сумма] [лимит] - создать промокод'
          : '\n\n<b>📋 Команды:</b>\n/daily - ежедневный бонус\n/promo [код] - активировать промокод';

        await sendMessage(chat.id, 
          `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n🆔 Твой ID: ${player?.telegram_id}${commands}\n\nВыбери игру:`,
          {
            inline_keyboard: [
              [{ text: '🍬 Dalgona Challenge', callback_data: 'play_dalgona' }],
              [{ text: '🌉 Стеклянный мост', callback_data: 'play_glass_bridge' }],
              [{ text: '🦑 Игра в Кальмара (PvP)', callback_data: 'play_squid_pvp' }],
              [{ text: '👤 Мой профиль', callback_data: 'profile' }]
            ]
          }
        );
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
        const promoCode = text.replace('/promo ', '').trim().toUpperCase();
        
        if (!promoCode) {
          await sendMessage(chat.id, '❌ Использование: /promo [код]\nПример: /promo BONUS2025');
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

        // Check if promo code exists and is valid
        const { data: promo } = await supabaseClient
          .from('squid_promo_codes')
          .select('*')
          .eq('code', promoCode)
          .single();

        if (!promo) {
          await sendMessage(chat.id, '❌ Промокод не найден.');
          return new Response('OK', { headers: corsHeaders });
        }

        // Check if expired
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          await sendMessage(chat.id, '❌ Промокод истёк.');
          return new Response('OK', { headers: corsHeaders });
        }

        // Check if max uses reached
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
          await sendMessage(chat.id, '❌ Промокод исчерпан.');
          return new Response('OK', { headers: corsHeaders });
        }

        // Check if player already used this promo
        const { data: existingRedemption } = await supabaseClient
          .from('squid_promo_redemptions')
          .select('id')
          .eq('player_id', player.id)
          .eq('promo_code_id', promo.id)
          .single();

        if (existingRedemption) {
          await sendMessage(chat.id, '❌ Ты уже использовал этот промокод.');
          return new Response('OK', { headers: corsHeaders });
        }

        // Redeem promo code
        await supabaseClient.from('squid_players')
          .update({ balance: (player.balance || 0) + promo.reward_amount })
          .eq('id', player.id);

        await supabaseClient.from('squid_promo_codes')
          .update({ current_uses: promo.current_uses + 1 })
          .eq('id', promo.id);

        await supabaseClient.from('squid_promo_redemptions')
          .insert({ player_id: player.id, promo_code_id: promo.id });

        await sendMessage(chat.id, `✅ <b>Промокод активирован!</b>\n\n💰 +${promo.reward_amount} монет\n💵 Новый баланс: ${(player.balance || 0) + promo.reward_amount} монет`);
      } else if (text.startsWith('/admin_balance ')) {
        // Check if user is admin
        const { data: isAdmin } = await supabaseClient
          .from('squid_admins')
          .select('telegram_id')
          .eq('telegram_id', from.id)
          .single();

        if (!isAdmin) {
          await sendMessage(chat.id, '❌ У тебя нет прав администратора.');
          return new Response('OK', { headers: corsHeaders });
        }

        const parts = text.split(' ');
        if (parts.length < 3) {
          await sendMessage(chat.id, '❌ Использование: /admin_balance [Telegram_ID] [сумма]\nПример: /admin_balance 123456789 5000');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(parts[1]);
        const newBalance = parseInt(parts[2]);

        const { data: targetPlayer } = await supabaseClient
          .from('squid_players')
          .select('id, first_name')
          .eq('telegram_id', targetId)
          .single();

        if (!targetPlayer) {
          await sendMessage(chat.id, '❌ Игрок не найден.');
          return new Response('OK', { headers: corsHeaders });
        }

        await supabaseClient.from('squid_players')
          .update({ balance: newBalance })
          .eq('id', targetPlayer.id);

        await sendMessage(chat.id, `✅ Баланс игрока ${targetPlayer.first_name} (ID: ${targetId}) установлен на ${newBalance} монет.`);
      } else if (text.startsWith('/admin_promo ')) {
        // Check if user is admin
        const { data: isAdmin } = await supabaseClient
          .from('squid_admins')
          .select('telegram_id')
          .eq('telegram_id', from.id)
          .single();

        if (!isAdmin) {
          await sendMessage(chat.id, '❌ У тебя нет прав администратора.');
          return new Response('OK', { headers: corsHeaders });
        }

        const parts = text.split(' ');
        if (parts.length < 4) {
          await sendMessage(chat.id, '❌ Использование: /admin_promo [код] [сумма] [лимит]\nПример: /admin_promo BONUS2025 1000 100');
          return new Response('OK', { headers: corsHeaders });
        }

        const code = parts[1].toUpperCase();
        const amount = parseInt(parts[2]);
        const maxUses = parseInt(parts[3]);

        const { error } = await supabaseClient.from('squid_promo_codes')
          .insert({
            code: code,
            reward_amount: amount,
            max_uses: maxUses
          });

        if (error) {
          await sendMessage(chat.id, '❌ Ошибка создания промокода. Возможно, код уже существует.');
          return new Response('OK', { headers: corsHeaders });
        }

        await sendMessage(chat.id, `✅ <b>Промокод создан!</b>\n\n📝 Код: ${code}\n💰 Награда: ${amount} монет\n👥 Лимит использований: ${maxUses}`);
      } else if (text.startsWith('/challenge ')) {
        const parts = text.split(' ');
        if (parts.length < 3) {
          await sendMessage(chat.id, '❌ Использование: /challenge [Telegram_ID] [ставка]\nПример: /challenge 123456789 100');
          return new Response('OK', { headers: corsHeaders });
        }

        const targetId = parseInt(parts[1]);
        const betAmount = parseInt(parts[2]);

        const { data: challenger } = await supabaseClient
          .from('squid_players')
          .select('id, balance')
          .eq('telegram_id', from.id)
          .single();

        if (!challenger || challenger.balance < betAmount) {
          await sendMessage(chat.id, '❌ Недостаточно монет для этой ставки!');
          return new Response('OK', { headers: corsHeaders });
        }

        const { data: opponent } = await supabaseClient
          .from('squid_players')
          .select('id, telegram_id')
          .eq('telegram_id', targetId)
          .single();

        if (!opponent) {
          await sendMessage(chat.id, '❌ Игрок не найден. Убедись, что он запустил бота командой /start');
          return new Response('OK', { headers: corsHeaders });
        }

        // Create challenge
        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .insert({
            player1_id: challenger.id,
            player2_id: null,
            game_type: 'squid_game',
            bet_amount: betAmount,
            status: 'waiting'
          })
          .select()
          .single();

        await sendMessage(chat.id, `⚔️ Вызов отправлен! Ожидаем ответа...`);
        await sendMessage(targetId, `⚔️ <b>Вызов на бой!</b>\n\n${from.first_name} вызывает тебя на игру в Кальмара!\nСтавка: ${betAmount} монет\n\nТвой ID: ${targetId}`, {
          inline_keyboard: [
            [{ text: '✅ Принять вызов', callback_data: `accept_challenge_${session?.id}` }],
            [{ text: '❌ Отклонить', callback_data: 'main_menu' }]
          ]
        });
      } else if (text === '/attack' || text === '/defend') {
        const { data: player } = await supabaseClient
          .from('squid_players')
          .select('id')
          .eq('telegram_id', from.id)
          .single();

        const { data: session } = await supabaseClient
          .from('squid_game_sessions')
          .select('*, player1:squid_players!player1_id(telegram_id, first_name), player2:squid_players!player2_id(telegram_id, first_name)')
          .or(`player1_id.eq.${player?.id},player2_id.eq.${player?.id}`)
          .eq('game_type', 'squid_game')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!session) {
          await sendMessage(chat.id, '❌ У тебя нет активной игры!');
          return new Response('OK', { headers: corsHeaders });
        }

        const gameData = (session.game_data as any) || { moves: [] };
        const isPlayer1 = session.player1_id === player?.id;
        const moveKey = isPlayer1 ? 'p1' : 'p2';

        gameData.moves = gameData.moves || [];
        const currentRound = Math.floor(gameData.moves.length / 2);

        if (gameData.moves.some((m: any) => m.round === currentRound && m.player === moveKey)) {
          await sendMessage(chat.id, '⏳ Ты уже сделал ход! Жди хода оппонента.');
          return new Response('OK', { headers: corsHeaders });
        }

        const move = text === '/attack' ? 'attack' : 'defend';
        gameData.moves.push({ round: currentRound, player: moveKey, move });

        await supabaseClient.from('squid_game_sessions')
          .update({ game_data: gameData })
          .eq('id', session.id);

        // Check if round is complete
        const roundMoves = gameData.moves.filter((m: any) => m.round === currentRound);
        if (roundMoves.length === 2) {
          const p1Move = roundMoves.find((m: any) => m.player === 'p1')?.move;
          const p2Move = roundMoves.find((m: any) => m.player === 'p2')?.move;

          let winner = null;
          if (p1Move === 'attack' && p2Move === 'defend') winner = null; // Draw
          else if (p1Move === 'defend' && p2Move === 'attack') winner = null; // Draw
          else if (p1Move === 'attack' && p2Move === 'attack') winner = Math.random() > 0.5 ? session.player1_id : session.player2_id;
          else winner = Math.random() > 0.5 ? session.player1_id : session.player2_id;

          if (currentRound >= 2 || winner) {
            // Game over
            const finalWinner = winner || (Math.random() > 0.5 ? session.player1_id : session.player2_id);
            const loserId = finalWinner === session.player1_id ? session.player2_id : session.player1_id;

            await supabaseClient.from('squid_game_sessions')
              .update({ status: 'finished', winner_id: finalWinner, finished_at: new Date().toISOString() })
              .eq('id', session.id);

            const { data: winnerData } = await supabaseClient
              .from('squid_players')
              .select('balance, total_wins')
              .eq('id', finalWinner)
              .single();

            const { data: loserData } = await supabaseClient
              .from('squid_players')
              .select('balance, total_losses')
              .eq('id', loserId)
              .single();

            await supabaseClient.from('squid_players')
              .update({ 
                balance: (winnerData?.balance || 0) + (session.bet_amount * 2),
                total_wins: (winnerData?.total_wins || 0) + 1
              })
              .eq('id', finalWinner);

            await supabaseClient.from('squid_players')
              .update({ 
                balance: (loserData?.balance || 0) - session.bet_amount,
                total_losses: (loserData?.total_losses || 0) + 1
              })
              .eq('id', loserId);

            const winnerTgId = finalWinner === session.player1_id ? (session.player1 as any).telegram_id : (session.player2 as any).telegram_id;
            const loserTgId = loserId === session.player1_id ? (session.player1 as any).telegram_id : (session.player2 as any).telegram_id;

            await sendMessage(winnerTgId, `🎉 <b>ПОБЕДА!</b>\n\nТы выиграл ${session.bet_amount * 2} монет!`, {
              inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
            });

            await sendMessage(loserTgId, `💀 Поражение!\n\nТы потерял ${session.bet_amount} монет.`, {
              inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
            });
          } else {
            // Next round
            const p1TgId = (session.player1 as any).telegram_id;
            const p2TgId = (session.player2 as any).telegram_id;
            await sendMessage(p1TgId, `Раунд ${currentRound + 1} завершён!\nP1: ${p1Move}, P2: ${p2Move}\n\nСледующий раунд!`);
            await sendMessage(p2TgId, `Раунд ${currentRound + 1} завершён!\nP1: ${p1Move}, P2: ${p2Move}\n\nСледующий раунд!`);
          }
        } else {
          await sendMessage(chat.id, `✅ Ход принят! Ожидаем хода оппонента...`);
        }
      }
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

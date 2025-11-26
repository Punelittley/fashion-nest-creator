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
  
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
            [{ text: '⭐ Звезда', callback_data: 'dalgona_star' }],
            [{ text: '☂️ Зонтик', callback_data: 'dalgona_umbrella' }],
            [{ text: '🔺 Треугольник', callback_data: 'dalgona_triangle' }],
            [{ text: '⬅️ Назад', callback_data: 'main_menu' }]
          ]
        });
      } else if (data === 'play_glass_bridge') {
        const { data: playerData } = await supabaseClient
          .from('squid_players')
          .select('id')
          .eq('telegram_id', from.id)
          .single();

        // Start new glass bridge game
        const glassPattern = Array.from({ length: 18 }, () => Math.random() > 0.5 ? 'L' : 'R');
        await supabaseClient.from('squid_game_sessions').insert({
          player1_id: playerData?.id,
          game_type: 'glass_bridge',
          bet_amount: 0,
          status: 'active',
          game_data: { pattern: glassPattern, step: 0, lives: 1 }
        });

        await sendMessage(chatId, '🌉 <b>Стеклянный мост</b>\n\nПеред тобой 18 пар стёкол. Одно из них безопасное, другое разобьётся!\n\nВыбирай: Левое (L) или Правое (R)?', {
          inline_keyboard: [
            [{ text: '⬅️ Левое (L)', callback_data: 'glass_L' }, { text: 'Правое (R) ➡️', callback_data: 'glass_R' }],
            [{ text: '🚫 Выйти из игры', callback_data: 'main_menu' }]
          ]
        });
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

          if (gameData.step >= 18) {
            // Won the game
            const reward = 500;
            await supabaseClient.from('squid_players')
              .update({ 
                balance: supabaseClient.rpc('increment_balance', { amount: reward }),
                total_wins: supabaseClient.rpc('increment', { value: 1 })
              })
              .eq('id', playerData?.id);

            await supabaseClient.from('squid_game_sessions')
              .update({ status: 'finished', winner_id: playerData?.id, finished_at: new Date().toISOString() })
              .eq('id', session.id);

            await supabaseClient.from('squid_casino_history').insert({
              player_id: playerData?.id,
              game_type: 'glass_bridge',
              bet_amount: 0,
              win_amount: reward,
              result: { completed: true }
            });

            await sendMessage(chatId, `🎉 <b>ПОБЕДА!</b>\n\nТы прошёл все 18 стёкол!\n💰 Награда: ${reward} монет`, {
              inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
            });
          } else {
            await supabaseClient.from('squid_game_sessions')
              .update({ game_data: gameData })
              .eq('id', session.id);

            await sendMessage(chatId, `✅ Правильно! Шаг ${gameData.step}/18\n\nСледующее стекло?`, {
              inline_keyboard: [
                [{ text: '⬅️ Левое (L)', callback_data: 'glass_L' }, { text: 'Правое (R) ➡️', callback_data: 'glass_R' }],
                [{ text: '🚫 Выйти', callback_data: 'main_menu' }]
              ]
            });
          }
        } else {
          // Lost
          await supabaseClient.from('squid_game_sessions')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('id', session.id);

          await supabaseClient.from('squid_players')
            .update({ total_losses: supabaseClient.rpc('increment', { value: 1 }) })
            .eq('id', playerData?.id);

          await supabaseClient.from('squid_casino_history').insert({
            player_id: playerData?.id,
            game_type: 'glass_bridge',
            bet_amount: 0,
            win_amount: 0,
            result: { completed: false, step: gameData.step }
          });

          await sendMessage(chatId, `💥 Стекло разбилось!\n\nТы прошёл ${gameData.step}/18 стёкол.`, {
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
      } else if (data.startsWith('dalgona_')) {
        const shape = data.replace('dalgona_', '');
        const success = Math.random() > 0.5;
        const reward = success ? 100 : 0;

        if (success) {
          await supabaseClient.from('squid_players')
            .update({ balance: supabaseClient.rpc('increment_balance', { amount: reward }) })
            .eq('telegram_id', from.id);

          await supabaseClient.from('squid_casino_history').insert({
            player_id: (await supabaseClient.from('squid_players').select('id').eq('telegram_id', from.id).single()).data?.id,
            game_type: 'dalgona',
            bet_amount: 0,
            win_amount: reward,
            result: { shape, success: true }
          });

          await sendMessage(chatId, `✅ Отлично! Ты вырезал форму и получил ${reward} монет! 💰`, {
            inline_keyboard: [[{ text: '🎮 Играть ещё', callback_data: 'play_dalgona' }], [{ text: '⬅️ Главное меню', callback_data: 'main_menu' }]]
          });
        } else {
          await supabaseClient.from('squid_casino_history').insert({
            player_id: (await supabaseClient.from('squid_players').select('id').eq('telegram_id', from.id).single()).data?.id,
            game_type: 'dalgona',
            bet_amount: 0,
            win_amount: 0,
            result: { shape, success: false }
          });

          await sendMessage(chatId, '❌ Печенье сломалось! Попробуй ещё раз.', {
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
          .select('balance')
          .eq('telegram_id', from.id)
          .single();

        await sendMessage(chat.id, 
          `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n\nВыбери игру:`,
          {
            inline_keyboard: [
              [{ text: '🍬 Dalgona Challenge', callback_data: 'play_dalgona' }],
              [{ text: '🌉 Стеклянный мост', callback_data: 'play_glass_bridge' }],
              [{ text: '🦑 Игра в Кальмара (PvP)', callback_data: 'play_squid_pvp' }],
              [{ text: '👤 Мой профиль', callback_data: 'profile' }]
            ]
          }
        );
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

            await supabaseClient.from('squid_players')
              .update({ 
                balance: supabaseClient.rpc('increment_balance', { amount: session.bet_amount * 2 }),
                total_wins: supabaseClient.rpc('increment', { value: 1 })
              })
              .eq('id', finalWinner);

            await supabaseClient.from('squid_players')
              .update({ 
                balance: supabaseClient.rpc('increment_balance', { amount: -session.bet_amount }),
                total_losses: supabaseClient.rpc('increment', { value: 1 })
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
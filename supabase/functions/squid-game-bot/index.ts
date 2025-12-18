import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const TELEGRAM_BOT_TOKEN = Deno.env.get("SQUID_GAME_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    reply_to_message?: {
      from?: { id: number; username?: string; first_name?: string };
    };
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name?: string };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    // Handle rate limit errors
    if (!result.ok && result.error_code === 429) {
      const retryAfter = result.parameters?.retry_after || 1;
      console.log(`Rate limited, waiting ${retryAfter} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      // Retry the request
      return await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    return result;
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;

  try {
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    // Handle rate limit errors
    if (!result.ok && result.error_code === 429) {
      const retryAfter = result.parameters?.retry_after || 1;
      console.log(`Rate limited, waiting ${retryAfter} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      // Retry the request
      return await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    return result;
  } catch (error) {
    console.error("Error editing message:", error);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const update: TelegramUpdate = await req.json();
    console.log("Received update:", JSON.stringify(update));

    // Get user telegram ID for admin check
    const telegramUserId = update.message?.from?.id || update.callback_query?.from?.id;

    // Check if user is admin
    const { data: adminData } = await supabaseClient
      .from("squid_admins")
      .select("*")
      .eq("telegram_id", telegramUserId || 0)
      .single();
    
    const isAdmin = !!adminData;

    // Check bot enabled state (skip for admins)
    if (!isAdmin) {
      const { data: botSettings } = await supabaseClient
        .from("squid_bot_settings")
        .select("value")
        .eq("key", "bot_enabled")
        .single();

      if (botSettings?.value === "false") {
        // Bot is disabled, ignore all messages except from admin
        return new Response("OK", { headers: corsHeaders });
      }
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { id: callbackId, from, message, data } = update.callback_query;
      const chatId = message?.chat.id;

      if (!chatId || !from || !data) {
        return new Response("OK", { headers: corsHeaders });
      }

      // Check if callback data contains user_id verification
      if (data.includes("_u")) {
        const parts = data.split("_u");
        const userIdStr = parts[parts.length - 1].split("_")[0]; // Get last _u occurrence
        const userId = parseInt(userIdStr);

        console.log(`Button check: data=${data}, extracted userId=${userId}, from.id=${from.id}`);

        if (userId !== from.id) {
          console.log(`Access denied: ${userId} !== ${from.id}`);
          await answerCallbackQuery(callbackId, "❌ Это не твоя кнопка!");
          return new Response("OK", { headers: corsHeaders });
        }
      }

      // Ensure player exists
      await supabaseClient.from("squid_players").upsert(
        {
          telegram_id: from.id,
          username: from.username,
          first_name: from.first_name,
        },
        { onConflict: "telegram_id" },
      );

      await answerCallbackQuery(callbackId);

      if (data === "play_dalgona") {
        await editMessage(
          chatId,
          message!.message_id,
          "🍬 <b>Игра Dalgona</b>\n\nВыбери форму, которую нужно вырезать:",
          {
            inline_keyboard: [
              [{ text: "⭐ Звезда", callback_data: `dalgona_select_star_u${from.id}` }],
              [{ text: "☂️ Зонтик", callback_data: `dalgona_select_umbrella_u${from.id}` }],
              [{ text: "🔺 Треугольник", callback_data: `dalgona_select_triangle_u${from.id}` }],
              [{ text: "🖼️ Мона Лиза", callback_data: `dalgona_select_monalisa_u${from.id}` }],
              [{ text: "⬅️ Назад", callback_data: "main_menu" }],
            ],
          },
        );
      } else if (data === "play_glass_bridge") {
        const { data: playerData } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        const betAmount = 200;
        if ((playerData?.balance || 0) < betAmount) {
          await answerCallbackQuery(callbackId, "Недостаточно монет! Нужно 200 монет для игры.");
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct bet amount
        await supabaseClient
          .from("squid_players")
          .update({ balance: (playerData?.balance || 0) - betAmount })
          .eq("telegram_id", from.id);

        // Start new glass bridge game (60% chance to survive each step)
        const glassPattern = Array.from({ length: 18 }, () => (Math.random() < 0.6 ? "L" : "R"));
        await supabaseClient.from("squid_game_sessions").insert({
          player1_id: playerData?.id,
          game_type: "glass_bridge",
          bet_amount: betAmount,
          status: "active",
          game_data: { pattern: glassPattern, step: 0, lives: 1, accumulatedReward: 0 },
        });

        await editMessage(
          chatId,
          message!.message_id,
          "🌉 <b>Стеклянный мост</b>\n\n💰 Ставка: 200 монет\n\nПеред тобой 18 пар стёкол. Одно из них безопасное, другое разобьётся!\n\nВыбирай: Левое (L) или Правое (R)?",
          {
            inline_keyboard: [
              [
                { text: "⬅️ Левое (L)", callback_data: "glass_L" },
                { text: "Правое (R) ➡️", callback_data: "glass_R" },
              ],
              [{ text: "💰 Забрать деньги", callback_data: "glass_cashout" }],
            ],
          },
        );
      } else if (data === "glass_cashout") {
        const { data: playerData } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        const { data: session } = await supabaseClient
          .from("squid_game_sessions")
          .select("*")
          .eq("player1_id", playerData?.id)
          .eq("game_type", "glass_bridge")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!session) {
          await editMessage(chatId, message!.message_id, "❌ Игра не найдена.");
          return new Response("OK", { headers: corsHeaders });
        }

        const gameData = session.game_data as any;
        const accumulatedReward = gameData.accumulatedReward || 0;

        await supabaseClient
          .from("squid_game_sessions")
          .update({ status: "finished", finished_at: new Date().toISOString() })
          .eq("id", session.id);

        if (accumulatedReward > 0) {
          const { data: currentPlayer } = await supabaseClient
            .from("squid_players")
            .select("balance")
            .eq("id", playerData?.id)
            .single();

          await supabaseClient
            .from("squid_players")
            .update({ balance: (currentPlayer?.balance || 0) + accumulatedReward })
            .eq("id", playerData?.id);

          await supabaseClient.from("squid_casino_history").insert({
            player_id: playerData?.id,
            game_type: "glass_bridge",
            bet_amount: session.bet_amount,
            win_amount: accumulatedReward,
            result: { completed: false, step: gameData.step, cashout: true },
          });

          await editMessage(
            chatId,
            message!.message_id,
            `💰 <b>Выигрыш забран!</b>\n\nТы прошёл ${gameData.step}/18 стёкол\nПолучено: ${accumulatedReward} монет`,
            {
              inline_keyboard: [
                [{ text: "🎮 Играть ещё", callback_data: "play_glass_bridge" }],
                [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
              ],
            },
          );
        } else {
          await editMessage(chatId, message!.message_id, "❌ У тебя пока нет выигрыша. Пройди хотя бы одну плиту!", {
            inline_keyboard: [[{ text: "⬅️ Главное меню", callback_data: "main_menu" }]],
          });
        }
      } else if (data.startsWith("buy_business_")) {
        const businessType = data.replace("buy_business_", "").split("_u")[0];

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "❌ Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        // Check if player already owns this business
        const { data: existingBusiness } = await supabaseClient
          .from("squid_player_businesses")
          .select("*")
          .eq("player_id", player.id)
          .eq("business_type", businessType)
          .single();

        if (existingBusiness) {
          await answerCallbackQuery(callbackId, "❌ У тебя уже есть этот бизнес!");
          return new Response("OK", { headers: corsHeaders });
        }

        const costs = {
          mask_factory: 200000,
          vip_casino: 500000,
        };
        const names = {
          mask_factory: "🏭 Фабрика масок",
          vip_casino: "🎰 VIP Казино",
        };

        const cost = costs[businessType as keyof typeof costs];

        if (player.balance < cost) {
          await answerCallbackQuery(callbackId, `❌ Недостаточно монет! Нужно ${cost.toLocaleString()}`);
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct cost and add business
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance - cost })
          .eq("id", player.id);

        await supabaseClient.from("squid_player_businesses").insert({
          player_id: player.id,
          business_type: businessType,
          upgrade_level: 0,
        });

        await editMessage(
          chatId,
          message!.message_id,
          `✅ <b>Бизнес куплен!</b>\n\n${names[businessType as keyof typeof names]}\n💰 Потрачено: ${cost.toLocaleString()} монет\n💵 Новый баланс: ${(player.balance - cost).toLocaleString()} монет\n\nИспользуй /collect чтобы собирать прибыль!`,
        );
      } else if (data.startsWith("upgrade_business_")) {
        const businessType = data.replace("upgrade_business_", "").split("_u")[0];

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "❌ Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: business } = await supabaseClient
          .from("squid_player_businesses")
          .select("*")
          .eq("player_id", player.id)
          .eq("business_type", businessType)
          .single();

        if (!business) {
          await answerCallbackQuery(callbackId, "❌ Бизнес не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        if (business.upgrade_level >= 3) {
          await answerCallbackQuery(callbackId, "❌ Максимальный уровень!");
          return new Response("OK", { headers: corsHeaders });
        }

        const upgradeCosts = {
          mask_factory: [100000, 200000, 300000],
          vip_casino: [600000, 700000, 800000],
        };
        const incomes = {
          mask_factory: [12500, 25000, 37500, 50000],
          vip_casino: [25000, 50000, 75000, 100000],
        };
        const names = {
          mask_factory: "🏭 Фабрика масок",
          vip_casino: "🎰 VIP Казино",
        };

        const cost = upgradeCosts[businessType as keyof typeof upgradeCosts][business.upgrade_level];
        const newIncome = incomes[businessType as keyof typeof incomes][business.upgrade_level + 1];

        if (player.balance < cost) {
          await answerCallbackQuery(callbackId, `❌ Недостаточно монет! Нужно ${cost.toLocaleString()}`);
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct cost and upgrade business
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance - cost })
          .eq("id", player.id);

        await supabaseClient
          .from("squid_player_businesses")
          .update({ upgrade_level: business.upgrade_level + 1 })
          .eq("id", business.id);

        await editMessage(
          chatId,
          message!.message_id,
          `✅ <b>Бизнес улучшен!</b>\n\n${names[businessType as keyof typeof names]}\n📊 Новый уровень: ${business.upgrade_level + 2}/4\n💰 Новый доход: ${newIncome.toLocaleString()} монет/час\n💵 Новый баланс: ${(player.balance - cost).toLocaleString()} монет`,
        );
      } else if (data === "my_businesses") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "❌ Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: businesses } = await supabaseClient
          .from("squid_player_businesses")
          .select("*")
          .eq("player_id", player.id);

        if (!businesses || businesses.length === 0) {
          await editMessage(
            chatId,
            message!.message_id,
            "❌ У тебя нет бизнесов!\n\nИспользуй /business_shop чтобы купить свой первый бизнес.",
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const businessInfo = (type: string, level: number) => {
          if (type === "mask_factory") {
            const incomes = [12500, 25000, 37500, 50000];
            const upgradeCosts = [100000, 200000, 300000];
            return {
              name: "🏭 Фабрика масок",
              income: incomes[level],
              upgradeCost: level < 3 ? upgradeCosts[level] : null,
            };
          } else {
            const incomes = [25000, 50000, 75000, 100000];
            const upgradeCosts = [600000, 700000, 800000];
            return {
              name: "🎰 VIP Казино",
              income: incomes[level],
              upgradeCost: level < 3 ? upgradeCosts[level] : null,
            };
          }
        };

        let listText = "💼 <b>Мои бизнесы</b>\n\n";
        const buttons: any[] = [];

        businesses.forEach((biz) => {
          const info = businessInfo(biz.business_type, biz.upgrade_level);
          listText += `${info.name}\n`;
          listText += `📊 Уровень: ${biz.upgrade_level + 1}/4\n`;
          listText += `💰 Доход: ${info.income.toLocaleString()} монет/час\n`;
          if (info.upgradeCost) {
            listText += `⬆️ Улучшение: ${info.upgradeCost.toLocaleString()} монет\n`;
            buttons.push([
              {
                text: `⬆️ Улучшить ${info.name}`,
                callback_data: `upgrade_business_${biz.business_type}_u${from.id}`,
              },
            ]);
          } else {
            listText += `✅ Максимальный уровень!\n`;
          }
          listText += "\n";
        });

        listText += `💵 Баланс: ${player.balance.toLocaleString()} монет`;

        await editMessage(chatId, message!.message_id, listText, {
          inline_keyboard: buttons.length > 0 ? buttons : undefined,
        });
      } else if (data.startsWith("glass_")) {
        const choice = data.replace("glass_", "");

        const { data: playerData } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        const { data: session } = await supabaseClient
          .from("squid_game_sessions")
          .select("*")
          .eq("player1_id", playerData?.id)
          .eq("game_type", "glass_bridge")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!session) {
          await editMessage(chatId, message!.message_id, "❌ Игра не найдена. Начни новую!");
          return new Response("OK", { headers: corsHeaders });
        }

        const gameData = session.game_data as any;
        const correctChoice = gameData.pattern[gameData.step];

        if (choice === correctChoice) {
          gameData.step += 1;

          // Calculate progressive reward: 400 + (step - 1) * 300
          const stepReward = 400 + (gameData.step - 1) * 300;
          gameData.accumulatedReward = (gameData.accumulatedReward || 0) + stepReward;

          if (gameData.step >= 18) {
            // Won the game - automatically cashout
            const totalReward = gameData.accumulatedReward;
            const { data: currentPlayer } = await supabaseClient
              .from("squid_players")
              .select("balance, total_wins")
              .eq("id", playerData?.id)
              .single();

            await supabaseClient
              .from("squid_players")
              .update({
                balance: (currentPlayer?.balance || 0) + totalReward,
                total_wins: (currentPlayer?.total_wins || 0) + 1,
              })
              .eq("id", playerData?.id);

            await supabaseClient
              .from("squid_game_sessions")
              .update({ status: "finished", winner_id: playerData?.id, finished_at: new Date().toISOString() })
              .eq("id", session.id);

            await supabaseClient.from("squid_casino_history").insert({
              player_id: playerData?.id,
              game_type: "glass_bridge",
              bet_amount: session.bet_amount,
              win_amount: totalReward,
              result: { completed: true, steps: 18 },
            });

            await editMessage(
              chatId,
              message!.message_id,
              `🎉 <b>НЕВЕРОЯТНО!</b>\n\nТы прошёл все 18 стёкол!\n💰 Общий выигрыш: ${totalReward} монет`,
              {
                inline_keyboard: [[{ text: "⬅️ Главное меню", callback_data: "main_menu" }]],
              },
            );
          } else {
            await supabaseClient.from("squid_game_sessions").update({ game_data: gameData }).eq("id", session.id);

            await editMessage(
              chatId,
              message!.message_id,
              `✅ Правильно! Шаг ${gameData.step}/18\n💵 +${stepReward} монет\n💰 Накоплено: ${gameData.accumulatedReward} монет\n\nСледующее стекло?`,
              {
                inline_keyboard: [
                  [
                    { text: "⬅️ Левое (L)", callback_data: "glass_L" },
                    { text: "Правое (R) ➡️", callback_data: "glass_R" },
                  ],
                  [{ text: "💰 Забрать деньги", callback_data: "glass_cashout" }],
                ],
              },
            );
          }
        } else {
          // Lost - lose everything
          await supabaseClient
            .from("squid_game_sessions")
            .update({ status: "finished", finished_at: new Date().toISOString() })
            .eq("id", session.id);

          await supabaseClient
            .from("squid_players")
            .update({
              total_losses:
                (await supabaseClient.from("squid_players").select("total_losses").eq("id", playerData?.id).single())
                  .data?.total_losses + 1 || 1,
            })
            .eq("id", playerData?.id);

          await supabaseClient.from("squid_casino_history").insert({
            player_id: playerData?.id,
            game_type: "glass_bridge",
            bet_amount: session.bet_amount,
            win_amount: 0,
            result: { completed: false, step: gameData.step },
          });

          const lostReward = gameData.accumulatedReward || 0;
          const lostText = lostReward > 0 ? `\n💸 Потеряно: ${lostReward} монет` : "";
          await editMessage(
            chatId,
            message!.message_id,
            `💥 Стекло разбилось!\n\nТы прошёл ${gameData.step}/18 стёкол${lostText}`,
            {
              inline_keyboard: [
                [{ text: "🎮 Играть ещё", callback_data: "play_glass_bridge" }],
                [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
              ],
            },
          );
        }
      } else if (data === "play_squid_pvp") {
        await editMessage(
          chatId,
          message!.message_id,
          `🦑 <b>Игра в Кальмара (PvP)</b>\n\nЧтобы пригласить игрока, отправь:\n<code>/challenge [Telegram_ID] [ставка]</code>\n\nНапример:\n<code>/challenge 123456789 100</code>\n\nИли жди приглашения от других игроков!`,
          {
            inline_keyboard: [[{ text: "⬅️ Главное меню", callback_data: "main_menu" }]],
          },
        );
      } else if (data.startsWith("decline_challenge_")) {
        const sessionId = data.split("_u")[0].replace("decline_challenge_", "");

        const { data: session } = await supabaseClient
          .from("squid_game_sessions")
          .select("*, player1:squid_players!player1_id(telegram_id, first_name)")
          .eq("id", sessionId)
          .eq("status", "waiting")
          .single();

        if (!session) {
          await answerCallbackQuery(callbackId, "Игра уже началась или отменена");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient.from("squid_game_sessions").update({ status: "cancelled" }).eq("id", sessionId);

        const player1Chat = (session.player1 as any).telegram_id;
        await sendMessage(player1Chat, `❌ ${from.first_name} отказался от вызова.`);
        await editMessage(chatId, message!.message_id, `❌ Вы отказались от вызова.`);
      } else if (data.startsWith("accept_challenge_")) {
        const sessionId = data.split("_u")[0].replace("accept_challenge_", "");

        const { data: playerData } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", from.id)
          .single();

        const { data: session } = await supabaseClient
          .from("squid_game_sessions")
          .select("*, player1:squid_players!player1_id(telegram_id, first_name)")
          .eq("id", sessionId)
          .eq("status", "waiting")
          .single();

        if (!session) {
          await answerCallbackQuery(callbackId, "Игра уже началась или отменена");
          return new Response("OK", { headers: corsHeaders });
        }

        if ((playerData?.balance || 0) < session.bet_amount) {
          await answerCallbackQuery(callbackId, "Недостаточно монет!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct bets from both players
        const { data: player1Data } = await supabaseClient
          .from("squid_players")
          .select("balance")
          .eq("id", session.player1_id)
          .single();

        await supabaseClient
          .from("squid_players")
          .update({ balance: (playerData?.balance || 0) - session.bet_amount })
          .eq("id", playerData.id);

        await supabaseClient
          .from("squid_players")
          .update({ balance: (player1Data?.balance || 0) - session.bet_amount })
          .eq("id", session.player1_id);

        // Initialize game with 3 lives each
        const gameData = {
          player1_hp: 3,
          player2_hp: 3,
          current_turn: "player1",
          moves: [],
        };

        await supabaseClient
          .from("squid_game_sessions")
          .update({
            player2_id: playerData.id,
            status: "active",
            game_data: gameData,
          })
          .eq("id", sessionId);

        const player1Name = (session.player1 as any).first_name;
        const player2Name = playerData.first_name;

        // Send interactive buttons to both players
        await sendMessage(
          (session.player1 as any).telegram_id,
          `⚔️ <b>Игра началась!</b>\n\nТы против ${player2Name}\nСтавка: ${session.bet_amount} монет\n\n❤️ Твоё HP: ${gameData.player1_hp}\n❤️ HP противника: ${gameData.player2_hp}\n\n🎯 <b>Твой ход!</b>`,
          {
            inline_keyboard: [[{ text: "⚔️ Ударить", callback_data: `squid_attack_${sessionId}_p1` }]],
          },
        );

        await editMessage(
          chatId,
          message!.message_id,
          `⚔️ <b>Игра началась!</b>\n\nТы против ${player1Name}\nСтавка: ${session.bet_amount} монет\n\n❤️ Твоё HP: ${gameData.player2_hp}\n❤️ HP противника: ${gameData.player1_hp}\n\n⏳ Ожидание хода противника...`,
        );
      } else if (data.startsWith("squid_attack_")) {
        const parts = data.split("_");
        const sessionId = parts[2];
        const player = parts[3]; // p1 or p2

        const { data: session } = await supabaseClient
          .from("squid_game_sessions")
          .select(
            "*, player1:squid_players!player1_id(telegram_id, first_name), player2:squid_players!player2_id(telegram_id, first_name)",
          )
          .eq("id", sessionId)
          .eq("status", "active")
          .single();

        if (!session) {
          await answerCallbackQuery(callbackId, "Игра не найдена или уже завершена");
          return new Response("OK", { headers: corsHeaders });
        }

        const gameData = session.game_data as any;

        // Check if it's the correct player's turn
        if (
          (player === "p1" && gameData.current_turn !== "player1") ||
          (player === "p2" && gameData.current_turn !== "player2")
        ) {
          await answerCallbackQuery(callbackId, "Не твой ход!");
          return new Response("OK", { headers: corsHeaders });
        }

        // 60% hit chance
        const hit = Math.random() < 0.6;
        const hitText = hit ? "✅ попал" : "❌ промазал";

        if (hit) {
          if (player === "p1") {
            gameData.player2_hp -= 1;
          } else {
            gameData.player1_hp -= 1;
          }
        }

        gameData.moves.push({ player, hit });

        const player1Name = (session.player1 as any).first_name;
        const player2Name = (session.player2 as any).first_name;
        const player1Id = (session.player1 as any).telegram_id;
        const player2Id = (session.player2 as any).telegram_id;

        // Check if game over
        if (gameData.player1_hp <= 0 || gameData.player2_hp <= 0) {
          const winnerId = gameData.player1_hp > 0 ? session.player1_id : session.player2_id;
          const loserHp = gameData.player1_hp > 0 ? gameData.player2_hp : gameData.player1_hp;
          const winnerName = gameData.player1_hp > 0 ? player1Name : player2Name;
          const winAmount = session.bet_amount * 2;

          await supabaseClient
            .from("squid_game_sessions")
            .update({ status: "finished", winner_id: winnerId, finished_at: new Date().toISOString() })
            .eq("id", sessionId);

          // Update winner balance
          const { data: winnerData } = await supabaseClient
            .from("squid_players")
            .select("balance, total_wins")
            .eq("id", winnerId)
            .single();

          await supabaseClient
            .from("squid_players")
            .update({
              balance: (winnerData?.balance || 0) + winAmount,
              total_wins: (winnerData?.total_wins || 0) + 1,
            })
            .eq("id", winnerId);

          // Update loser stats
          const loserId = gameData.player1_hp > 0 ? session.player2_id : session.player1_id;
          const { data: loserData } = await supabaseClient
            .from("squid_players")
            .select("total_losses")
            .eq("id", loserId)
            .single();

          await supabaseClient
            .from("squid_players")
            .update({ total_losses: (loserData?.total_losses || 0) + 1 })
            .eq("id", loserId);

          await sendMessage(
            player1Id,
            `🎮 <b>Игра окончена!</b>\n\n🏆 Победитель: ${winnerName}\n💰 Выигрыш: ${winAmount} монет\n\n${hitText}`,
          );

          await sendMessage(
            player2Id,
            `🎮 <b>Игра окончена!</b>\n\n🏆 Победитель: ${winnerName}\n💰 Выигрыш: ${winAmount} монет\n\n${hitText}`,
          );
        } else {
          // Switch turn
          gameData.current_turn = gameData.current_turn === "player1" ? "player2" : "player1";

          await supabaseClient.from("squid_game_sessions").update({ game_data: gameData }).eq("id", sessionId);

          const nextPlayerId = gameData.current_turn === "player1" ? player1Id : player2Id;
          const waitingPlayerId = gameData.current_turn === "player1" ? player2Id : player1Id;

          // Update message for current player with hit result
          if (player === "p1") {
            await editMessage(
              player1Id,
              message!.message_id,
              `⚔️ Твой удар: ${hitText}\n\n❤️ Твоё HP: ${gameData.player1_hp}\n❤️ HP противника: ${gameData.player2_hp}\n\n⏳ Ожидание хода противника...`,
            );
          } else {
            await editMessage(
              player2Id,
              message!.message_id,
              `⚔️ Твой удар: ${hitText}\n\n❤️ Твоё HP: ${gameData.player2_hp}\n❤️ HP противника: ${gameData.player1_hp}\n\n⏳ Ожидание хода противника...`,
            );
          }

          // Send attack button to next player
          await sendMessage(
            nextPlayerId,
            `⚔️ <b>Твой ход!</b>\n\n❤️ Твоё HP: ${gameData.current_turn === "player1" ? gameData.player1_hp : gameData.player2_hp}\n❤️ HP противника: ${gameData.current_turn === "player1" ? gameData.player2_hp : gameData.player1_hp}`,
            {
              inline_keyboard: [
                [
                  {
                    text: "⚔️ Ударить",
                    callback_data: `squid_attack_${sessionId}_${gameData.current_turn === "player1" ? "p1" : "p2"}`,
                  },
                ],
              ],
            },
          );
        }
      } else if (data.startsWith("buy_prefix_")) {
        const prefixName = data.split("_u")[0].replace("buy_prefix_", "");

        // Get prefix from database
        const { data: prefixData } = await supabaseClient
          .from("squid_prefixes")
          .select("*")
          .eq("name", prefixName)
          .maybeSingle();

        if (!prefixData) {
          await answerCallbackQuery(callbackId, "Префикс не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, owned_prefixes")
          .eq("telegram_id", from.id)
          .single();

        const ownedPrefixes = player?.owned_prefixes || [];

        if (ownedPrefixes.includes(prefixName)) {
          await answerCallbackQuery(callbackId, "Ты уже владеешь этим префиксом!");
          return new Response("OK", { headers: corsHeaders });
        }

        if ((player?.balance || 0) < prefixData.price) {
          await answerCallbackQuery(callbackId, `Недостаточно монет! Нужно ${prefixData.price.toLocaleString()} монет`);
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_players")
          .update({
            balance: (player?.balance || 0) - prefixData.price,
            owned_prefixes: [...ownedPrefixes, prefixName],
          })
          .eq("id", player!.id);

        await editMessage(
          chatId,
          message!.message_id,
          `✅ <b>Префикс \"${prefixName}\" успешно куплен!</b>\n\nТеперь ты можешь активировать его в профиле.`,
          {
            inline_keyboard: [[{ text: "👤 Мой профиль", callback_data: "profile" }]],
          },
        );
      } else if (data.startsWith("remove_prefix_u")) {
        await supabaseClient.from("squid_players").update({ prefix: null }).eq("telegram_id", from.id);

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        await answerCallbackQuery(callbackId, "✅ Префикс убран!");

        const displayName = player?.first_name || from.first_name || "Игрок";

        await editMessage(
          chatId,
          message!.message_id,
          `👤 <b>Профиль: ${displayName}</b>\n\n💰 Баланс: ${player?.balance || 0} монет\n🏆 Побед: ${player?.total_wins || 0}\n💀 Поражений: ${player?.total_losses || 0}\n✨ Префикс: Нет префикса`,
          {
            inline_keyboard: [
              [{ text: "🛍️ Магазин префиксов", callback_data: `shop_prefixes_u${from.id}` }],
              [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
            ],
          },
        );
      } else if (data.startsWith("shop_prefixes_u")) {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("owned_prefixes, prefix")
          .eq("telegram_id", from.id)
          .single();

        // Get all prefixes from database
        const { data: allPrefixes } = await supabaseClient
          .from("squid_prefixes")
          .select("*")
          .order("price", { ascending: true });

        const ownedPrefixes = player?.owned_prefixes || [];
        const currentPrefix = player?.prefix;

        const prefixButtons: any[] = [];

        // Show all prefixes from database
        if (allPrefixes) {
          for (const prefix of allPrefixes) {
            if (ownedPrefixes.includes(prefix.name)) {
              prefixButtons.push([
                {
                  text: currentPrefix === prefix.name ? `✅ ${prefix.name} (активен)` : prefix.name,
                  callback_data:
                    currentPrefix === prefix.name ? `remove_prefix_u${from.id}` : `activate_prefix_${prefix.name}_u${from.id}`,
                },
              ]);
            } else {
              prefixButtons.push([
                { text: `${prefix.name} - ${prefix.price.toLocaleString()} 💰`, callback_data: `buy_prefix_${prefix.name}_u${from.id}` }
              ]);
            }
          }
        }

        prefixButtons.push([{ text: "⬅️ Назад", callback_data: "profile" }]);

        await editMessage(
          chatId,
          message!.message_id,
          `🛍️ <b>Магазин префиксов</b>\n\nДоступные префиксы для покупки:`,
          {
            inline_keyboard: prefixButtons,
          },
        );
      } else if (data.startsWith("activate_prefix_")) {
        const prefixName = data.split("_u")[0].replace("activate_prefix_", "");

        await supabaseClient.from("squid_players").update({ prefix: prefixName }).eq("telegram_id", from.id);

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        await answerCallbackQuery(callbackId, `✅ Префикс \"${prefixName}\" активирован!`);

        const displayName = `[${prefixName}] ${player?.first_name || from.first_name || "Игрок"}`;

        await editMessage(
          chatId,
          message!.message_id,
          `👤 <b>Профиль: ${displayName}</b>\n\n💰 Баланс: ${player?.balance || 0} монет\n🏆 Побед: ${player?.total_wins || 0}\n💀 Поражений: ${player?.total_losses || 0}\n✨ Префикс: ${prefixName}`,
          {
            inline_keyboard: [
              [{ text: "🛍️ Магазин префиксов", callback_data: `shop_prefixes_u${from.id}` }],
              [{ text: "❌ Убрать префикс", callback_data: `remove_prefix_u${from.id}` }],
              [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
            ],
          },
        );
      } else if (data.startsWith("dalgona_select_")) {
        const shapePart = data.replace("dalgona_select_", "").split("_u")[0];

        const shapeConfig: Record<string, { name: string; bet: number; reward: number; chance: number }> = {
          star: { name: "⭐ Звезда", bet: 100, reward: 400, chance: 0.7 },
          umbrella: { name: "☂️ Зонтик", bet: 300, reward: 1000, chance: 0.4 },
          triangle: { name: "🔺 Треугольник", bet: 120, reward: 300, chance: 0.75 },
          monalisa: { name: "🖼️ Мона Лиза", bet: 500, reward: 5000, chance: 0.03 },
        };

        const config = shapeConfig[shapePart];
        if (!config) return new Response("OK", { headers: corsHeaders });

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("balance")
          .eq("telegram_id", from.id)
          .single();

        if ((player?.balance || 0) < config.bet) {
          await answerCallbackQuery(callbackId, "Недостаточно монет!");
          return new Response("OK", { headers: corsHeaders });
        }

        await editMessage(
          chatId,
          message!.message_id,
          `🍬 <b>${config.name}</b>\n\n💰 Ставка: ${config.bet} монет\n🎁 Выигрыш: ${config.reward} монет\n📊 Шанс успеха: ${Math.round(config.chance * 100)}%\n\nПодтверждаешь?`,
          {
            inline_keyboard: [
              [{ text: "✅ Вырезать", callback_data: `dalgona_confirm_${shapePart}_u${from.id}` }],
              [{ text: "❌ Отмена", callback_data: "play_dalgona" }],
            ],
          },
        );
      } else if (data.startsWith("dalgona_confirm_")) {
        const shapePart = data.replace("dalgona_confirm_", "").split("_u")[0];

        const shapeConfig: Record<string, { name: string; bet: number; reward: number; chance: number }> = {
          star: { name: "⭐ Звезда", bet: 100, reward: 400, chance: 0.7 },
          umbrella: { name: "☂️ Зонтик", bet: 300, reward: 1000, chance: 0.4 },
          triangle: { name: "🔺 Треугольник", bet: 120, reward: 300, chance: 0.75 },
          monalisa: { name: "🖼️ Мона Лиза", bet: 500, reward: 5000, chance: 0.03 },
        };

        const config = shapeConfig[shapePart];
        if (!config) return new Response("OK", { headers: corsHeaders });

        const { data: currentPlayer } = await supabaseClient
          .from("squid_players")
          .select("balance, casino_admin_mode")
          .eq("telegram_id", from.id)
          .single();

        if ((currentPlayer?.balance || 0) < config.bet) {
          await answerCallbackQuery(callbackId, "Недостаточно монет!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct bet
        await supabaseClient
          .from("squid_players")
          .update({ balance: (currentPlayer?.balance || 0) - config.bet })
          .eq("telegram_id", from.id);

        // Admin casino mode - always win
        const success = currentPlayer?.casino_admin_mode ? true : Math.random() < config.chance;
        const winAmount = success ? config.reward : 0;

        if (success) {
          await supabaseClient
            .from("squid_players")
            .update({ balance: (currentPlayer?.balance || 0) - config.bet + winAmount })
            .eq("telegram_id", from.id);

          await supabaseClient.from("squid_casino_history").insert({
            player_id: (await supabaseClient.from("squid_players").select("id").eq("telegram_id", from.id).single())
              .data?.id,
            game_type: "dalgona",
            bet_amount: config.bet,
            win_amount: winAmount,
            result: { shape: shapePart, success: true },
          });

          await editMessage(
            chatId,
            message!.message_id,
            `✅ Отлично! Ты вырезал ${config.name} и получил ${winAmount} монет! 💰`,
            {
              inline_keyboard: [
                [{ text: "🎮 Играть ещё", callback_data: "play_dalgona" }],
                [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
              ],
            },
          );
        } else {
          await supabaseClient.from("squid_casino_history").insert({
            player_id: (await supabaseClient.from("squid_players").select("id").eq("telegram_id", from.id).single())
              .data?.id,
            game_type: "dalgona",
            bet_amount: config.bet,
            win_amount: 0,
            result: { shape: shapePart, success: false },
          });

          await editMessage(chatId, message!.message_id, `❌ Печенье сломалось! Ты потерял ${config.bet} монет.`, {
            inline_keyboard: [
              [{ text: "🎮 Играть ещё", callback_data: "play_dalgona" }],
              [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
            ],
          });
        }
      } else if (data === "main_menu") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("balance")
          .eq("telegram_id", from.id)
          .single();

        await editMessage(
          chatId,
          message!.message_id,
          `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n\nВыбери игру:`,
          {
            inline_keyboard: [
              [{ text: "🍬 Dalgona Challenge", callback_data: "play_dalgona" }],
              [{ text: "🌉 Стеклянный мост", callback_data: "play_glass_bridge" }],
              [{ text: "🦑 Игра в Кальмара (PvP)", callback_data: "play_squid_pvp" }],
              [{ text: "👤 Мой профиль", callback_data: "profile" }],
            ],
          },
        );
      } else if (data === "profile") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        const prefixText = player?.prefix ? `${player.prefix}` : "Нет префикса";
        const displayName = player?.prefix
          ? `[${player.prefix}] ${player?.first_name || from.first_name || "Игрок"}`
          : player?.first_name || from.first_name || "Игрок";

        const ownedPrefixes = player?.owned_prefixes || [];

        // Build prefix selection buttons
        const prefixButtons: any[] = [];
        if (ownedPrefixes.length > 0) {
          for (const prefixName of ownedPrefixes) {
            if (prefixName !== player?.prefix) {
              prefixButtons.push([{ text: `✨ Активировать ${prefixName}`, callback_data: `activate_prefix_${prefixName}_u${from.id}` }]);
            }
          }
        }

        await editMessage(
          chatId,
          message!.message_id,
          `👤 <b>Профиль: ${displayName}</b>\n\n💰 Баланс: ${player?.balance || 0} монет\n🏆 Побед: ${player?.total_wins || 0}\n💀 Поражений: ${player?.total_losses || 0}\n✨ Префикс: ${prefixText}\n📦 Куплено префиксов: ${ownedPrefixes.length}`,
          {
            inline_keyboard: [
              ...prefixButtons,
              [{ text: "🛍️ Магазин префиксов", callback_data: `shop_prefixes_u${from.id}` }],
              player?.prefix ? [{ text: "❌ Убрать префикс", callback_data: `remove_prefix_u${from.id}` }] : [],
              [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
            ].filter((row) => row.length > 0),
          },
        );
      } else if (data.startsWith("donate_premium_u")) {
        await editMessage(
          chatId,
          message!.message_id,
          `👑 <b>PREMIUM подписка</b>\n\n` +
            `🎁 <b>Что ты получишь:</b>\n` +
            `   • 2X множитель ограбления игроков\n` +
            `   • 2X бонус выигрыша в казино\n` +
            `   • 2X доход от бизнеса\n\n` +
            `💰 <b>Стоимость:</b> договорная\n\n` +
            `📩 Для покупки напишите: @COKPYIIIEHUE\n` +
            `🎁 Также можно оплатить подарками Telegram!`,
          {
            inline_keyboard: [
              [{ text: "⬅️ Назад", callback_data: `donate_back_u${from.id}` }],
            ],
          },
        );
      } else if (data.startsWith("donate_coins_100k_u")) {
        await editMessage(
          chatId,
          message!.message_id,
          `🪙 <b>100,000 монет</b>\n\n` +
            `💰 Стоимость: <b>15₽</b>\n\n` +
            `📩 Для покупки напишите: @COKPYIIIEHUE\n` +
            `🎁 Также можно оплатить подарками Telegram!`,
          {
            inline_keyboard: [
              [{ text: "⬅️ Назад", callback_data: `donate_back_u${from.id}` }],
            ],
          },
        );
      } else if (data.startsWith("donate_coins_500k_u")) {
        await editMessage(
          chatId,
          message!.message_id,
          `💰 <b>500,000 монет</b>\n\n` +
            `💰 Стоимость: <b>35₽</b>\n\n` +
            `📩 Для покупки напишите: @COKPYIIIEHUE\n` +
            `🎁 Также можно оплатить подарками Telegram!`,
          {
            inline_keyboard: [
              [{ text: "⬅️ Назад", callback_data: `donate_back_u${from.id}` }],
            ],
          },
        );
      } else if (data.startsWith("donate_coins_1m_u")) {
        await editMessage(
          chatId,
          message!.message_id,
          `💎 <b>1,000,000 монет</b>\n\n` +
            `💰 Стоимость: <b>75₽</b>\n\n` +
            `📩 Для покупки напишите: @COKPYIIIEHUE\n` +
            `🎁 Также можно оплатить подарками Telegram!`,
          {
            inline_keyboard: [
              [{ text: "⬅️ Назад", callback_data: `donate_back_u${from.id}` }],
            ],
          },
        );
      } else if (data.startsWith("donate_prefix_u")) {
        await editMessage(
          chatId,
          message!.message_id,
          `✨ <b>Кастомный префикс</b>\n\n` +
            `Получи уникальный префикс, который будет отображаться рядом с твоим именем!\n\n` +
            `💰 Стоимость: <b>договорная</b>\n\n` +
            `📩 Для покупки напишите: @COKPYIIIEHUE\n` +
            `🎁 Также можно оплатить подарками Telegram!`,
          {
            inline_keyboard: [
              [{ text: "⬅️ Назад", callback_data: `donate_back_u${from.id}` }],
            ],
          },
        );
      } else if (data.startsWith("donate_back_u")) {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, is_premium, premium_expires_at")
          .eq("telegram_id", from.id)
          .single();

        const isPremiumActive = player?.is_premium && player?.premium_expires_at && new Date(player.premium_expires_at) > new Date();
        const premiumStatus = isPremiumActive 
          ? `✅ Активен до ${new Date(player.premium_expires_at!).toLocaleDateString("ru-RU")}`
          : "❌ Не активен";

        await editMessage(
          chatId,
          message!.message_id,
          `💎 <b>Донат магазин</b>\n\n` +
            `👑 <b>PREMIUM статус:</b> ${premiumStatus}\n\n` +
            `🎁 <b>Преимущества PREMIUM:</b>\n` +
            `   • 2X множитель ограбления игроков\n` +
            `   • 2X бонус выигрыша в казино\n` +
            `   • 2X доход от бизнеса\n\n` +
            `💵 Твой баланс: ${(player?.balance || 0).toLocaleString()} монет`,
          {
            inline_keyboard: [
              [{ text: "👑 PREMIUM (1 месяц)", callback_data: `donate_premium_u${from.id}` }],
              [{ text: "🪙 100,000 монет - 15₽", callback_data: `donate_coins_100k_u${from.id}` }],
              [{ text: "💰 500,000 монет - 35₽", callback_data: `donate_coins_500k_u${from.id}` }],
              [{ text: "💎 1,000,000 монет - 75₽", callback_data: `donate_coins_1m_u${from.id}` }],
              [{ text: "✨ Кастомный префикс", callback_data: `donate_prefix_u${from.id}` }],
              [{ text: "⬅️ Назад", callback_data: "main_menu" }],
            ],
          },
        );
      } else if (data.startsWith("admin_set_prefix_absolute_")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, "Нет доступа");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace("admin_set_prefix_absolute_", ""));

        await supabaseClient.from("squid_players").update({ prefix: "absolute" }).eq("telegram_id", targetId);

        await answerCallbackQuery(callbackId, "✅ Префикс установлен!");
        await editMessage(chatId, message!.message_id, `✅ Префикс \"absolute\" установлен игроку ${targetId}`);
      } else if (data.startsWith("admin_set_prefix_emperror_")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, "Нет доступа");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace("admin_set_prefix_emperror_", ""));

        await supabaseClient.from("squid_players").update({ prefix: "emperror" }).eq("telegram_id", targetId);

        await answerCallbackQuery(callbackId, "✅ Префикс установлен!");
        await editMessage(chatId, message!.message_id, `✅ Префикс \"emperror\" установлен игроку ${targetId}`);
      } else if (data.startsWith("admin_remove_prefix_")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, "Нет доступа");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace("admin_remove_prefix_", ""));

        await supabaseClient.from("squid_players").update({ prefix: null }).eq("telegram_id", targetId);

        await answerCallbackQuery(callbackId, "✅ Префикс убран!");
        await editMessage(chatId, message!.message_id, `✅ Префикс убран у игрока ${targetId}`);
      } else if (data.startsWith("admin_reset_stats_")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          await answerCallbackQuery(callbackId, "Нет доступа");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(data.replace("admin_reset_stats_", ""));

        await supabaseClient
          .from("squid_players")
          .update({
            total_wins: 0,
            total_losses: 0,
          })
          .eq("telegram_id", targetId);

        await answerCallbackQuery(callbackId, "✅ Статистика обнулена!");
        await editMessage(chatId, message!.message_id, `✅ Статистика обнулена у игрока ${targetId}`);
      } else if (data === "play_casino") {
        await editMessage(chatId, message!.message_id, "🎰 <b>Казино</b>\n\nДобро пожаловать в казино!", {
          inline_keyboard: [
            [{ text: "🎡 Рулетка", callback_data: `casino_roulette_u${from.id}` }],
            [{ text: "⬅️ Назад", callback_data: "main_menu" }],
          ],
        });
      } else if (data.startsWith("casino_roulette_u")) {
        await editMessage(chatId, message!.message_id, "🎡 <b>Рулетка</b>\n\nВыбери ставку (100-10000 монет) и цвет:", {
          inline_keyboard: [
            [{ text: "🔴 Красное (x2)", callback_data: `roulette_bet_red_u${from.id}` }],
            [{ text: "⚫ Черное (x2)", callback_data: `roulette_bet_black_u${from.id}` }],
            [{ text: "🟢 Зеленое (x14)", callback_data: `roulette_bet_green_u${from.id}` }],
            [{ text: "⬅️ Назад", callback_data: "play_casino" }],
          ],
        });
      } else if (data.startsWith("roulette_bet_")) {
        const color = data.includes("red") ? "red" : data.includes("black") ? "black" : "green";

        await editMessage(
          chatId,
          message!.message_id,
          `Выбран цвет: ${color === "red" ? "🔴 Красное" : color === "black" ? "⚫ Черное" : "🟢 Зеленое"}\n\nВыбери размер ставки:`,
          {
            inline_keyboard: [
              [{ text: "100 монет", callback_data: `roulette_play_${color}_100_u${from.id}` }],
              [{ text: "500 монет", callback_data: `roulette_play_${color}_500_u${from.id}` }],
              [{ text: "1000 монет", callback_data: `roulette_play_${color}_1000_u${from.id}` }],
              [{ text: "5000 монет", callback_data: `roulette_play_${color}_5000_u${from.id}` }],
              [{ text: "10000 монет", callback_data: `roulette_play_${color}_10000_u${from.id}` }],
              [{ text: "⬅️ Назад", callback_data: `casino_roulette_u${from.id}` }],
            ],
          },
        );
      } else if (data.startsWith("roulette_play_")) {
        const parts = data.split("_");
        const color = parts[2];
        const betAmount = parseInt(parts[3]);

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, casino_admin_mode")
          .eq("telegram_id", from.id)
          .single();

        if (!player || player.balance < betAmount) {
          await answerCallbackQuery(callbackId, "Недостаточно монет!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct bet
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance - betAmount })
          .eq("id", player.id);

        // Spin roulette - FAIR random chances
        let resultColor: string;
        let winMultiplier = 0;

        // Admin casino mode - always win
        if (player.casino_admin_mode) {
          resultColor = color;
          winMultiplier = color === "green" ? 14 : 2;
        } else {
          const result = Math.random() * 100;

          // Fair chances: Red 48.5%, Black 48.5%, Green 3%
          if (result < 3) {
            resultColor = "green";
          } else if (result < 51.5) {
            resultColor = "red";
          } else {
            resultColor = "black";
          }

          if (resultColor === color) {
            winMultiplier = color === "green" ? 14 : 2;
          }
        }

        const winAmount = betAmount * winMultiplier;
        const profit = winAmount - betAmount;

        if (winAmount > 0) {
          await supabaseClient
            .from("squid_players")
            .update({ balance: player.balance - betAmount + winAmount })
            .eq("id", player.id);
        }

        await supabaseClient.from("squid_casino_history").insert({
          player_id: player.id,
          game_type: "roulette",
          bet_amount: betAmount,
          win_amount: winAmount,
          result: { color: resultColor, bet: color },
        });

        const resultEmoji = resultColor === "red" ? "🔴" : resultColor === "black" ? "⚫" : "🟢";
        const resultText =
          winAmount > 0
            ? `🎉 <b>ВЫИГРЫШ!</b>\n\nРезультат: ${resultEmoji} ${resultColor}\n💰 Выигрыш: ${profit} монет\n💵 Новый баланс: ${player.balance - betAmount + winAmount} монет`
            : `😔 Проигрыш\n\nРезультат: ${resultEmoji} ${resultColor}\n💸 Потеря: ${betAmount} монет\n💵 Новый баланс: ${player.balance - betAmount} монет`;

        await editMessage(chatId, message!.message_id, resultText, {
          inline_keyboard: [
            [{ text: "🎡 Играть еще", callback_data: `casino_roulette_u${from.id}` }],
            [{ text: "⬅️ Назад", callback_data: "main_menu" }],
          ],
        });
      } else if (data.startsWith("open_case_")) {
        const caseNum = parseInt(data.split("_")[2]);

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, owned_prefixes")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "❌ Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        let caseCost = 0;
        let rewards: { amount?: number; prefix?: string; chance: number; text: string }[] = [];

        if (caseNum === 1) {
          caseCost = 100000;
          rewards = [
            { amount: 50000, chance: 70, text: "🪙 50,000 монет" },
            { amount: 150000, chance: 11, text: "🪙 150,000 монет" },
            { amount: 300000, chance: 5, text: "💰 300,000 монет" },
            { prefix: "VIP", chance: 1, text: "👑 VIP префикс" },
            { amount: 0, chance: 13, text: "❌ Пусто" },
          ];
        } else if (caseNum === 2) {
          caseCost = 500000;
          rewards = [
            { amount: 200000, chance: 70, text: "🪙 200,000 монет" },
            { amount: 600000, chance: 11, text: "💰 600,000 монет" },
            { amount: 1000000, chance: 5, text: "💎 1,000,000 монет" },
            { prefix: "VIP", chance: 1, text: "👑 VIP префикс" },
            { amount: 0, chance: 13, text: "❌ Пусто" },
          ];
        }

        if (player.balance < caseCost) {
          await editMessage(
            chatId,
            message!.message_id,
            `❌ <b>Недостаточно монет!</b>\n\nСтоимость кейса: ${caseCost.toLocaleString()} монет\nТвой баланс: ${player.balance.toLocaleString()} монет`,
            {
              inline_keyboard: [[{ text: "⬅️ Назад к кейсам", callback_data: `case_menu_u${from.id}` }]],
            },
          );
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct cost
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance - caseCost })
          .eq("id", player.id);

        // Roll for reward
        const roll = Math.random() * 100;
        let cumulative = 0;
        let wonReward = rewards[rewards.length - 1]; // Default to last (empty)

        for (const reward of rewards) {
          cumulative += reward.chance;
          if (roll < cumulative) {
            wonReward = reward;
            break;
          }
        }

        let resultText = "";
        let newBalance = player.balance - caseCost;

        if (wonReward.prefix) {
          // Won VIP prefix
          const ownedPrefixes = player.owned_prefixes || [];
          if (ownedPrefixes.includes("VIP")) {
            // Already has VIP, give coins instead
            const compensation = caseNum === 1 ? 200000 : 800000;
            newBalance += compensation;
            await supabaseClient.from("squid_players").update({ balance: newBalance }).eq("id", player.id);
            resultText = `🎁 <b>Кейс #${caseNum} открыт!</b>\n\n👑 Выпал VIP префикс, но он у тебя уже есть!\n💰 Компенсация: ${compensation.toLocaleString()} монет\n\n💵 Новый баланс: ${newBalance.toLocaleString()} монет`;
          } else {
            await supabaseClient
              .from("squid_players")
              .update({ owned_prefixes: [...ownedPrefixes, "VIP"] })
              .eq("id", player.id);
            resultText = `🎁 <b>Кейс #${caseNum} открыт!</b>\n\n🎉 <b>ДЖЕКПОТ!</b>\n👑 Ты получил VIP префикс!\n\nАктивируй его в /profile\n\n💵 Баланс: ${newBalance.toLocaleString()} монет`;
          }
        } else if (wonReward.amount === 0) {
          // Empty - nothing won
          resultText = `🎁 <b>Кейс #${caseNum} открыт!</b>\n\n❌ Пусто! Ничего не выпало.\n\n💵 Баланс: ${newBalance.toLocaleString()} монет`;
        } else {
          // Won coins
          newBalance += wonReward.amount!;
          await supabaseClient.from("squid_players").update({ balance: newBalance }).eq("id", player.id);

          const profit = wonReward.amount! - caseCost;
          const profitText =
            profit > 0 ? `📈 Профит: +${profit.toLocaleString()} монет` : `📉 Потеря: ${profit.toLocaleString()} монет`;

          resultText = `🎁 <b>Кейс #${caseNum} открыт!</b>\n\n${wonReward.text}\n${profitText}\n\n💵 Новый баланс: ${newBalance.toLocaleString()} монет`;
        }

        await editMessage(chatId, message!.message_id, resultText, {
          inline_keyboard: [
            [{ text: "🎁 Открыть ещё", callback_data: `case_menu_u${from.id}` }],
            [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
          ],
        });
      } else if (data.startsWith("case_menu_u")) {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("balance")
          .eq("telegram_id", from.id)
          .single();

        await editMessage(
          chatId,
          message!.message_id,
          `📦 <b>Магазин кейсов</b>\n\n` +
            `🎁 <b>Кейс #1</b> - 100,000 монет\n` +
            `   🪙 50,000 монет (70%)\n` +
            `   🪙 150,000 монет (11%)\n` +
            `   💰 300,000 монет (5%)\n` +
            `   👑 VIP префикс (1%)\n` +
            `   ❌ Пусто (13%)\n\n` +
            `💎 <b>Кейс #2</b> - 500,000 монет\n` +
            `   🪙 200,000 монет (70%)\n` +
            `   🪙 600,000 монет (11%)\n` +
            `   💎 1,000,000 монет (5%)\n` +
            `   👑 VIP префикс (1%)\n` +
            `   ❌ Пусто (13%)\n\n` +
            `💵 Твой баланс: ${(player?.balance || 0).toLocaleString()} монет`,
          {
            inline_keyboard: [
              [{ text: "🎁 Открыть Кейс #1 (100k)", callback_data: `open_case_1_u${from.id}` }],
              [{ text: "💎 Открыть Кейс #2 (500k)", callback_data: `open_case_2_u${from.id}` }],
            ],
          },
        );
      }

      return new Response("OK", { headers: corsHeaders });
    }

    // Handle text messages
    if (update.message?.text) {
      const { chat, from, text } = update.message;

      if (!from) {
        return new Response("OK", { headers: corsHeaders });
      }

      // Create or update player
      const { data: player } = await supabaseClient
        .from("squid_players")
        .upsert(
          {
            telegram_id: from.id,
            username: from.username,
            first_name: from.first_name,
          },
          { onConflict: "telegram_id" },
        )
        .select()
        .single();

      // Store chat information
      await supabaseClient.from("squid_bot_chats").upsert(
        {
          chat_id: chat.id,
          chat_type: chat.type || "private",
          chat_title: chat.title || null,
          chat_username: chat.username || null,
          last_activity: new Date().toISOString(),
        },
        { onConflict: "chat_id" },
      );

      // Track player activity in this chat
      if (player) {
        await supabaseClient.from("squid_player_chats").upsert(
          {
            player_id: player.id,
            chat_id: chat.id,
            last_message_at: new Date().toISOString(),
          },
          { onConflict: "player_id,chat_id" },
        );
      }

      if (text === "/start" || text.startsWith("/start ")) {
        // Check for referral code
        const args = text.split(" ");
        let referrerTelegramId: number | null = null;
        
        if (args.length > 1) {
          const refCode = args[1];
          if (refCode.startsWith("ref")) {
            referrerTelegramId = parseInt(refCode.replace("ref", ""));
          }
        }

        const { data: existingPlayer } = await supabaseClient
          .from("squid_players")
          .select("id, balance, telegram_id, referrer_id")
          .eq("telegram_id", from.id)
          .single();

        // Handle referral for new players only
        if (!existingPlayer && referrerTelegramId && referrerTelegramId !== from.id) {
          const { data: referrer } = await supabaseClient
            .from("squid_players")
            .select("id, balance, referral_count, gift_count, first_name")
            .eq("telegram_id", referrerTelegramId)
            .single();

          if (referrer) {
            // Create new player with referrer
            const { data: newPlayer } = await supabaseClient
              .from("squid_players")
              .upsert({
                telegram_id: from.id,
                username: from.username,
                first_name: from.first_name,
                referrer_id: referrer.id,
              }, { onConflict: "telegram_id" })
              .select()
              .single();

            // Give referrer rewards: 100000 coins + 1 gift
            await supabaseClient
              .from("squid_players")
              .update({
                balance: referrer.balance + 100000,
                referral_count: (referrer.referral_count || 0) + 1,
                gift_count: (referrer.gift_count || 0) + 1,
              })
              .eq("id", referrer.id);

            // Notify referrer
            await sendMessage(
              referrerTelegramId,
              `🎉 <b>Новый реферал!</b>\n\n${from.first_name} присоединился по твоей ссылке!\n\n💰 +100,000 монет\n🎁 +1 подарок\n\nИспользуй /gift_open чтобы открыть подарок!`,
            );
          }
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("balance, telegram_id, referral_count, gift_count")
          .eq("telegram_id", from.id)
          .single();

        await sendMessage(
          chat.id,
          `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n💰 Твой баланс: ${player?.balance || 0} монет\n🆔 Твой ID: ${player?.telegram_id}\n👥 Рефералов: ${player?.referral_count || 0}\n🎁 Подарков: ${player?.gift_count || 0}\n\n<b>📋 Команды:</b>\n/help - список всех команд\n/ref - твоя реферальная ссылка\n/gift_open - открыть подарок\n/top - топ богатых игроков\n/daily - ежедневный бонус\n\nВыбери игру:`,
          {
            inline_keyboard: [
              [{ text: "🍬 Dalgona Challenge", callback_data: "play_dalgona" }],
              [{ text: "🌉 Стеклянный мост", callback_data: "play_glass_bridge" }],
              [{ text: "🦑 Игра в Кальмара (PvP)", callback_data: "play_squid_pvp" }],
              [{ text: "👤 Мой профиль", callback_data: "profile" }],
            ],
          },
        );
      } else if (text === "/casino") {
        await sendMessage(
          chat.id,
          `🎰 <b>Веб-казино</b>\n\n🎡 Рулетка и 🪜 Лестница доступны в веб-приложении!\n\nНажми кнопку ниже чтобы открыть:`,
          {
            inline_keyboard: [
              [{ text: "🎮 Открыть казино", web_app: { url: "https://punelittley.github.io/fashion-nest-creator/casino/" } }],
            ],
          },
        );
      } else if (text === "/help") {
        await sendMessage(
          chat.id,
          `📋 <b>Список команд</b>\n\n<b>🎮 Игры:</b>\n🍬 Dalgona Challenge - вырезай фигурки из печенья\n🌉 Стеклянный мост - пройди по опасному мосту\n🦑 Игра в Кальмара (PvP) - бейся с другими игроками\n\n<b>💰 Команды:</b>\n/balance - проверить баланс\n/profile - твой профиль\n/daily - получить ежедневный бонус\n/promo [код] - использовать промокод\n/pay [ID] [сумма] - перевести монеты игроку\n/rob - ограбить игрока (раз в час)\n/top - топ 10 богатых игроков в чате\n/topworld - топ 10 богатых игроков глобально\n/shop - магазин префиксов\n/case - магазин кейсов\n/donate - премиум и донат\n\n<b>🔗 Рефералы:</b>\n/ref - твоя реферальная ссылка\n/gift_open - открыть подарок\n\n<b>🏭 Бизнес:</b>\n/business_shop - магазин бизнесов\n/my_buss - мои бизнесы и улучшения\n/collect - собрать прибыль (макс. 1 час)\n\n<b>📦 Предметы:</b>\n/si - искать предметы (раз в час)\n/items - показать инвентарь\n/sell [номер] - продать предмет\n/sell all - продать все предметы\n\n<b>🏰 Кланы:</b>\n/clan - информация о твоём клане\n/clans - список топ кланов\n/clan_create [название] - создать клан (500k)\n/clan_join [название] - вступить в клан\n/clan_leave - покинуть клан\n\n<b>🎲 Казино:</b>\n/casino - открыть веб-казино\n/roulette [цвет] [ставка] - сыграть в рулетку\nЦвета: red, black, green\n\n<b>ℹ️ Помощь:</b>\n/help - список всех команд`,
        );
      } else if (text === "/daily") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, last_daily_claim")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const now = new Date();
        const lastClaim = player.last_daily_claim ? new Date(player.last_daily_claim) : null;

        // Check if 24 hours have passed
        if (lastClaim && now.getTime() - lastClaim.getTime() < 24 * 60 * 60 * 1000) {
          const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now.getTime() - lastClaim.getTime())) / (60 * 60 * 1000));
          await sendMessage(
            chat.id,
            `⏰ Ты уже получил ежедневный бонус!\n\nПриходи через ${hoursLeft} ${hoursLeft === 1 ? "час" : hoursLeft < 5 ? "часа" : "часов"}.`,
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const dailyBonus = 1200;
        await supabaseClient
          .from("squid_players")
          .update({
            balance: player.balance + dailyBonus,
            last_daily_claim: now.toISOString(),
          })
          .eq("id", player.id);

        await sendMessage(
          chat.id,
          `🎁 <b>Ежедневный бонус!</b>\n\n+${dailyBonus} монет\n💰 Новый баланс: ${player.balance + dailyBonus} монет`,
        );
      } else if (text.startsWith("/promo ")) {
        const code = text.split(" ")[1];

        if (!code) {
          await sendMessage(chat.id, "❌ Формат: /promo [код]");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: promo } = await supabaseClient.from("squid_promo_codes").select("*").eq("code", code).single();

        if (!promo) {
          await sendMessage(chat.id, "❌ Промокод не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Check if promo is expired
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          await sendMessage(chat.id, "❌ Этот промокод истёк!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Check if max uses reached
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
          await sendMessage(chat.id, "❌ Этот промокод уже использован максимальное количество раз!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        // Check if player already redeemed this promo
        const { data: redemption } = await supabaseClient
          .from("squid_promo_redemptions")
          .select("*")
          .eq("player_id", player.id)
          .eq("promo_code_id", promo.id)
          .single();

        if (redemption) {
          await sendMessage(chat.id, "❌ Ты уже использовал этот промокод!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Redeem promo
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance + promo.reward_amount })
          .eq("id", player.id);

        await supabaseClient.from("squid_promo_redemptions").insert({
          player_id: player.id,
          promo_code_id: promo.id,
        });

        await supabaseClient
          .from("squid_promo_codes")
          .update({ current_uses: (promo.current_uses || 0) + 1 })
          .eq("id", promo.id);

        await sendMessage(
          chat.id,
          `✅ <b>Промокод активирован!</b>\n\n+${promo.reward_amount} монет\n💰 Новый баланс: ${player.balance + promo.reward_amount} монет`,
        );
      } else if (text.startsWith("/challenge ")) {
        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /challenge [Telegram_ID] [ставка]");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        const betAmount = parseInt(args[2]);

        if (targetId === from.id) {
          await sendMessage(chat.id, "❌ Ты не можешь вызвать сам себя!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: challenger } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", from.id)
          .single();

        if (!challenger || challenger.balance < betAmount) {
          await sendMessage(chat.id, "❌ Недостаточно монет для ставки!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (target.balance < betAmount) {
          await sendMessage(chat.id, "❌ У твоего противника недостаточно монет!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Create game session
        const { data: session } = await supabaseClient
          .from("squid_game_sessions")
          .insert({
            player1_id: challenger.id,
            game_type: "squid_pvp",
            bet_amount: betAmount,
            status: "waiting",
          })
          .select()
          .single();

        await sendMessage(chat.id, `✅ Вызов отправлен игроку ${target.first_name}!`);

        await sendMessage(
          targetId,
          `⚔️ <b>Вызов на Игру в Кальмара!</b>\n\n${challenger.first_name} вызывает тебя на дуэль!\n💰 Ставка: ${betAmount} монет\n\nПринимаешь вызов?`,
          {
            inline_keyboard: [
              [{ text: "✅ Принять", callback_data: `accept_challenge_${session?.id}_u${targetId}` }],
              [{ text: "❌ Отказать", callback_data: `decline_challenge_${session?.id}_u${targetId}` }],
            ],
          },
        );
      } else if (text.startsWith("/pay ")) {
        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /pay [ID] [сумма]");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        const amount = parseInt(args[2]);

        if (amount <= 0) {
          await sendMessage(chat.id, "❌ Сумма должна быть больше 0!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (targetId === from.id) {
          await sendMessage(chat.id, "❌ Ты не можешь перевести монеты самому себе!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: sender } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", from.id)
          .single();

        if (!sender || sender.balance < amount) {
          await sendMessage(chat.id, "❌ Недостаточно монет!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Transfer money
        await supabaseClient
          .from("squid_players")
          .update({ balance: sender.balance - amount })
          .eq("id", sender.id);

        await supabaseClient
          .from("squid_players")
          .update({ balance: target.balance + amount })
          .eq("id", target.id);

        await sendMessage(chat.id, `✅ Успешно переведено ${amount} монет игроку ${target.first_name}!`);
        await sendMessage(targetId, `💰 ${sender.first_name} перевёл тебе ${amount} монет!`);
      } else if (text === "/rob") {
        // Check if user is replying to a message
        const replyTo = update.message?.reply_to_message;
        
        if (!replyTo || !replyTo.from) {
          await sendMessage(chat.id, "❌ Чтобы ограбить игрока, ответь на его сообщение командой /rob");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetTelegramId = replyTo.from.id;
        
        if (targetTelegramId === from.id) {
          await sendMessage(chat.id, "❌ Ты не можешь ограбить сам себя!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: robber } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name, last_rob_time")
          .eq("telegram_id", from.id)
          .single();

        if (!robber) {
          await sendMessage(chat.id, "❌ Ты не зарегистрирован. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }

        // Check 1-hour cooldown
        const now = new Date();
        const lastRob = robber.last_rob_time ? new Date(robber.last_rob_time) : null;
        
        if (lastRob && now.getTime() - lastRob.getTime() < 60 * 60 * 1000) {
          const minutesLeft = Math.ceil((60 * 60 * 1000 - (now.getTime() - lastRob.getTime())) / (60 * 1000));
          await sendMessage(
            chat.id,
            `⏰ Ограбление доступно раз в час!\n\nПопробуй через ${minutesLeft} ${minutesLeft === 1 ? "минуту" : minutesLeft < 5 ? "минуты" : "минут"}.`,
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: victim } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", targetTelegramId)
          .single();

        if (!victim) {
          await sendMessage(chat.id, "❌ Этот игрок не зарегистрирован в боте!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Update last_rob_time
        await supabaseClient
          .from("squid_players")
          .update({ last_rob_time: new Date().toISOString() })
          .eq("id", robber.id);

        const maxAmount = 5000;
        const successChance = 0.3; // 30% success
        const isSuccess = Math.random() < successChance;

        if (isSuccess) {
          // Successful robbery - steal up to 5000 coins
          const stealAmount = Math.min(Math.floor(Math.random() * maxAmount) + 1, victim.balance);
          
          if (stealAmount <= 0) {
            await sendMessage(chat.id, `😅 У ${victim.first_name} нечего красть - баланс пуст!`);
            return new Response("OK", { headers: corsHeaders });
          }

          await supabaseClient
            .from("squid_players")
            .update({ balance: robber.balance + stealAmount })
            .eq("id", robber.id);

          await supabaseClient
            .from("squid_players")
            .update({ balance: victim.balance - stealAmount })
            .eq("id", victim.id);

          await sendMessage(
            chat.id,
            `🔫 <b>Успешное ограбление!</b>\n\n${robber.first_name} украл у ${victim.first_name} ${stealAmount.toLocaleString()} монет!\n\n💰 Твой баланс: ${(robber.balance + stealAmount).toLocaleString()} монет`,
          );
        } else {
          // Failed robbery - lose up to 5000 coins
          const loseAmount = Math.min(Math.floor(Math.random() * maxAmount) + 1, robber.balance);
          
          if (loseAmount <= 0) {
            await sendMessage(chat.id, `😅 Ты попался, но у тебя нечего забрать!`);
            return new Response("OK", { headers: corsHeaders });
          }

          await supabaseClient
            .from("squid_players")
            .update({ balance: robber.balance - loseAmount })
            .eq("id", robber.id);

          await sendMessage(
            chat.id,
            `🚔 <b>Провал!</b>\n\n${robber.first_name} попытался ограбить ${victim.first_name}, но был пойман!\n\n💸 Штраф: ${loseAmount.toLocaleString()} монет\n💰 Твой баланс: ${(robber.balance - loseAmount).toLocaleString()} монет`,
          );
        }
      } else if (text === "/top") {
        // Get players from current chat only
        const { data: chatPlayers } = await supabaseClient
          .from("squid_player_chats")
          .select("player_id")
          .eq("chat_id", chat.id);

        if (!chatPlayers || chatPlayers.length === 0) {
          await sendMessage(chat.id, "❌ В этом чате нет игроков.");
          return new Response("OK", { headers: corsHeaders });
        }

        const playerIds = chatPlayers.map((p) => p.player_id);

        const { data: topPlayers } = await supabaseClient
          .from("squid_players")
          .select("*")
          .in("id", playerIds)
          .order("balance", { ascending: false })
          .limit(10);

        if (!topPlayers || topPlayers.length === 0) {
          await sendMessage(chat.id, "❌ Список игроков пуст.");
          return new Response("OK", { headers: corsHeaders });
        }

        let topText = "🏆 <b>Топ 10 богатых игроков (этот чат)</b>\n\n";

        topPlayers.forEach((player, index) => {
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
          const prefix = player.prefix ? `[${player.prefix}] ` : "";
          const displayName = player.first_name || "Неизвестно";
          topText += `${medal} ${prefix}${displayName}\n💰 ${player.balance.toLocaleString()} монет\n\n`;
        });

        await sendMessage(chat.id, topText);
      } else if (text === "/topworld") {
        const { data: topPlayers } = await supabaseClient
          .from("squid_players")
          .select("*")
          .order("balance", { ascending: false })
          .limit(10);

        if (!topPlayers || topPlayers.length === 0) {
          await sendMessage(chat.id, "❌ Список игроков пуст.");
          return new Response("OK", { headers: corsHeaders });
        }

        let topText = "🌍 <b>Топ 10 богатых игроков (весь мир)</b>\n\n";

        topPlayers.forEach((player, index) => {
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
          const prefix = player.prefix ? `[${player.prefix}] ` : "";
          const displayName = player.first_name || "Неизвестно";
          topText += `${medal} ${prefix}${displayName}\n💰 ${player.balance.toLocaleString()} монет\n\n`;
        });

        await sendMessage(chat.id, topText);
      } else if (text.startsWith("/roulette ")) {
        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /roulette [цвет] [ставка]\nЦвета: red, black, green");
          return new Response("OK", { headers: corsHeaders });
        }

        const color = args[1].toLowerCase();
        const betAmount = parseInt(args[2]);

        if (!["red", "black", "green"].includes(color)) {
          await sendMessage(chat.id, "❌ Неверный цвет! Используй: red, black, или green");
          return new Response("OK", { headers: corsHeaders });
        }

        if (isNaN(betAmount) || betAmount <= 0) {
          await sendMessage(chat.id, "❌ Ставка должна быть положительным числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, casino_admin_mode, is_premium, premium_expires_at")
          .eq("telegram_id", from.id)
          .single();

        if (!player || player.balance < betAmount) {
          await sendMessage(chat.id, "❌ Недостаточно монет!");
          return new Response("OK", { headers: corsHeaders });
        }

        const isPremiumActive = player.is_premium && player.premium_expires_at && new Date(player.premium_expires_at) > new Date();

        // Deduct bet
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance - betAmount })
          .eq("id", player.id);

        // Spin roulette - FAIR random chances
        let resultColor: string;
        let winMultiplier = 0;

        if (player.casino_admin_mode) {
          resultColor = color;
          winMultiplier = color === "green" ? 14 : 2;
        } else {
          const rand = Math.random() * 100;

          // Fair chances: Red 48.5%, Black 48.5%, Green 3%
          if (rand < 3) {
            resultColor = "green";
          } else if (rand < 51.5) {
            resultColor = "red";
          } else {
            resultColor = "black";
          }

          if (resultColor === color) {
            winMultiplier = color === "green" ? 14 : 2;
          }
        }

        let winAmount = betAmount * winMultiplier;
        
        // Apply premium bonus (2x)
        if (isPremiumActive && winAmount > 0) {
          winAmount = winAmount * 2;
        }
        
        const profit = winAmount - betAmount;

        if (winAmount > 0) {
          await supabaseClient
            .from("squid_players")
            .update({ balance: player.balance - betAmount + winAmount })
            .eq("id", player.id);
        }

        await supabaseClient.from("squid_casino_history").insert({
          player_id: player.id,
          game_type: "roulette",
          bet_amount: betAmount,
          win_amount: winAmount,
          result: { color: resultColor, bet: color },
        });

        const colorEmoji: Record<string, string> = {
          red: "🔴",
          black: "⚫",
          green: "🟢",
        };

        const premiumBonus = isPremiumActive ? " 👑 (x2 PREMIUM)" : "";

        if (winAmount > 0) {
          await sendMessage(
            chat.id,
            `🎉 <b>ВЫИГРЫШ!</b>${premiumBonus}\n\n🎡 Рулетка: ${colorEmoji[resultColor]} ${resultColor}\n💰 Ставка: ${betAmount} монет на ${colorEmoji[color]} ${color}\n🎁 Выигрыш: ${profit} монет (x${winMultiplier}${isPremiumActive ? " x2" : ""})\n💵 Новый баланс: ${player.balance - betAmount + winAmount} монет`,
          );
        } else {
          await sendMessage(
            chat.id,
            `😔 <b>Проигрыш</b>\n\n🎡 Рулетка: ${colorEmoji[resultColor]} ${resultColor}\n💰 Ставка: ${betAmount} монет на ${colorEmoji[color]} ${color}\n💸 Потеря: ${betAmount} монет\n💵 Новый баланс: ${player.balance - betAmount} монет`,
          );
        }
      } else if (text.startsWith("/admin_add_coins ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /admin_add_coins [ID] [сумма]");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        const amount = parseInt(args[2]);

        const { data: target } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_players")
          .update({ balance: target.balance + amount })
          .eq("id", target.id);

        await sendMessage(chat.id, `✅ Добавлено ${amount} монет игроку ${target.first_name}`);
      } else if (text === "/balance") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("balance")
          .eq("telegram_id", from.id)
          .single();

        await sendMessage(chat.id, `💰 <b>Твой баланс</b>\n\n${player?.balance || 0} монет`);
      } else if (text === "/shop") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("balance, prefix, owned_prefixes")
          .eq("telegram_id", from.id)
          .single();

        // Load prefixes from database
        const { data: dbPrefixes } = await supabaseClient
          .from("squid_prefixes")
          .select("*")
          .order("price", { ascending: true });

        const ownedPrefixes = player?.owned_prefixes || [];

        let shopText = "🛍️ <b>Магазин префиксов</b>\n\n💰 Твой баланс: " + (player?.balance || 0).toLocaleString() + " монет\n\n";

        const buttons: any[] = [];

        if (dbPrefixes && dbPrefixes.length > 0) {
          dbPrefixes.forEach((prefix) => {
            const owned = ownedPrefixes.includes(prefix.name);
            shopText += `✨ <b>${prefix.name}</b> - ${prefix.price.toLocaleString()} монет ${owned ? "✅ Куплен" : ""}\n`;
            if (!owned) {
              buttons.push([{ text: `Купить ${prefix.name} (${prefix.price.toLocaleString()})`, callback_data: `buy_prefix_${prefix.name}_u${from.id}` }]);
            }
          });
        } else {
          shopText += "❌ Нет доступных префиксов\n";
        }

        await sendMessage(chat.id, shopText, {
          inline_keyboard: buttons.length > 0 ? buttons : [[{ text: "⬅️ Назад", callback_data: "main_menu" }]],
        });
      } else if (text.startsWith("/admin_create_promo ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.split(" ");
        if (args.length !== 4) {
          await sendMessage(chat.id, "❌ Формат: /admin_create_promo [код] [сумма] [количество использований]");
          return new Response("OK", { headers: corsHeaders });
        }

        const code = args[1];
        const reward = parseInt(args[2]);
        const maxUses = parseInt(args[3]);

        await supabaseClient.from("squid_promo_codes").insert({
          code: code,
          reward_amount: reward,
          max_uses: maxUses,
        });

        await sendMessage(
          chat.id,
          `✅ Промокод создан!\n\nКод: ${code}\nНаграда: ${reward} монет\nМакс. использований: ${maxUses}`,
        );
      } else if (text === "/servers") {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: chats } = await supabaseClient
          .from("squid_bot_chats")
          .select("*")
          .order("last_activity", { ascending: false });

        if (!chats || chats.length === 0) {
          await sendMessage(chat.id, "❌ Список чатов пуст");
          return new Response("OK", { headers: corsHeaders });
        }

        let serversText = "🌐 <b>Список серверов/чатов бота</b>\n\n";

        chats.forEach((chatData, index) => {
          const chatTypeEmoji =
            chatData.chat_type === "private"
              ? "👤"
              : chatData.chat_type === "group"
                ? "👥"
                : chatData.chat_type === "supergroup"
                  ? "👥"
                  : "📢";
          const chatName = chatData.chat_title || chatData.chat_username || `Chat ${chatData.chat_id}`;
          const members = chatData.member_count ? ` (${chatData.member_count} участников)` : "";
          const lastActive = new Date(chatData.last_activity).toLocaleDateString("ru-RU");

          serversText += `${index + 1}. ${chatTypeEmoji} <b>${chatName}</b>${members}\n`;
          serversText += `   ID: <code>${chatData.chat_id}</code> | Последняя активность: ${lastActive}\n\n`;
        });

        await sendMessage(chat.id, serversText);
      } else if (text === "/casino_admin") {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("casino_admin_mode")
          .eq("telegram_id", from.id)
          .single();

        const newMode = !player?.casino_admin_mode;

        await supabaseClient.from("squid_players").update({ casino_admin_mode: newMode }).eq("telegram_id", from.id);

        const modeText = newMode ? "✅ ВКЛЮЧЁН" : "❌ ВЫКЛЮЧЕН";
        await sendMessage(
          chat.id,
          `🎰 <b>Режим админа казино ${modeText}</b>\n\n${newMode ? "Теперь ты будешь всегда выигрывать в казино!" : "Обычный режим игры восстановлен."}`,
        );
      } else if (text === "/admin_commands") {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        await sendMessage(
          chat.id,
          `👑 <b>Команды администратора</b>\n\n<b>💰 Управление балансом:</b>\n/admin_add_coins [ID] [сумма] - добавить монеты\n/admin_set_balance [ID] [сумма] - установить баланс\n\n<b>✨ Префиксы:</b>\n/create_prefix [название] [цена] - создать префикс\n/prefix_delete [название] - удалить префикс\n/get_prefix [название] [ID] - выдать префикс\n/prefix_delete_player [ID] [название] - удалить префикс у игрока\n\n<b>🎟️ Промокоды:</b>\n/admin_create_promo [код] [сумма] [кол-во]\n/admin_delete_promo [код]\n\n<b>🎁 Подарки:</b>\n/gift [ID] [кол-во] - выдать подарки игроку\n/gift_all [кол-во] [текст] - подарки всем\n\n<b>📢 Рассылка:</b>\n/all [текст] - сообщение всем в ЛС\n/dep_all [сумма] [текст] - монеты + сообщение всем\n\n<b>🎰 Казино:</b>\n/casino_admin - режим всегда выигрывать\n\n<b>🏭 Бизнесы:</b>\n/admin_del_bus [ID] [тип] - удалить бизнес\n\n<b>⚙️ Управление ботом:</b>\n/off - выключить бот для всех\n/on - включить бот для всех\n\n<b>📊 Информация:</b>\n/servers - список чатов\n/admin_search [страница] - список игроков\n/admin_commands - эта справка`,
        );
      } else if (text === "/admin_search" || text.startsWith("/admin_search ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const page = text.includes(" ") ? parseInt(text.split(" ")[1]) || 1 : 1;
        const perPage = 20;
        const offset = (page - 1) * perPage;

        const { data: allPlayers, count } = await supabaseClient
          .from("squid_players")
          .select("*", { count: "exact" })
          .order("balance", { ascending: false })
          .range(offset, offset + perPage - 1);

        if (!allPlayers || allPlayers.length === 0) {
          await sendMessage(chat.id, "❌ Список игроков пуст");
          return new Response("OK", { headers: corsHeaders });
        }

        const totalPages = Math.ceil((count || 0) / perPage);
        let searchText = `🔍 <b>Список игроков</b> (стр. ${page}/${totalPages})\n\n`;

        allPlayers.forEach((player, index) => {
          const prefix = player.prefix ? `[${player.prefix}] ` : "";
          const displayName = player.first_name || "Неизв.";
          searchText += `${offset + index + 1}. ${prefix}${displayName}\n`;
          searchText += `   ID: <code>${player.telegram_id}</code> | 💰 ${player.balance.toLocaleString()}\n`;
        });

        searchText += `\n📊 Всего: ${count} игроков`;
        if (totalPages > 1) {
          searchText += `\n/admin_search [номер страницы]`;
        }

        await sendMessage(chat.id, searchText);
      } else if (text.startsWith("/all ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const messageText = text.replace("/all ", "").trim();
        if (!messageText) {
          await sendMessage(chat.id, "❌ Формат: /all [текст сообщения]");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: allPlayers } = await supabaseClient.from("squid_players").select("telegram_id");

        if (!allPlayers || allPlayers.length === 0) {
          await sendMessage(chat.id, "❌ Нет игроков для рассылки");
          return new Response("OK", { headers: corsHeaders });
        }

        let sent = 0;
        let failed = 0;

        for (const player of allPlayers) {
          try {
            await sendMessage(player.telegram_id, `📢 <b>Сообщение от создателя:</b>\n\n${messageText}`);
            sent++;
            // Small delay to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (e) {
            failed++;
          }
        }

        await sendMessage(
          chat.id,
          `✅ <b>Рассылка завершена!</b>\n\n📤 Отправлено: ${sent}\n❌ Не доставлено: ${failed}`,
        );
      } else if (text.startsWith("/dep_all ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.replace("/dep_all ", "").trim();
        const firstSpace = args.indexOf(" ");

        if (firstSpace === -1) {
          await sendMessage(chat.id, "❌ Формат: /dep_all [сумма] [текст сообщения]");
          return new Response("OK", { headers: corsHeaders });
        }

        const amount = parseInt(args.substring(0, firstSpace));
        const messageText = args.substring(firstSpace + 1).trim();

        if (isNaN(amount) || amount <= 0) {
          await sendMessage(chat.id, "❌ Сумма должна быть положительным числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (!messageText) {
          await sendMessage(chat.id, "❌ Укажи текст сообщения!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: allPlayers } = await supabaseClient.from("squid_players").select("telegram_id, balance, id");

        if (!allPlayers || allPlayers.length === 0) {
          await sendMessage(chat.id, "❌ Нет игроков для рассылки");
          return new Response("OK", { headers: corsHeaders });
        }

        let sent = 0;
        let failed = 0;

        for (const player of allPlayers) {
          try {
            // Add coins to player
            await supabaseClient
              .from("squid_players")
              .update({ balance: player.balance + amount })
              .eq("id", player.id);

            await sendMessage(
              player.telegram_id,
              `🎁 <b>Подарок от создателя!</b>\n\n💰 Тебе начислено: ${amount.toLocaleString()} монет\n\n📢 ${messageText}`,
            );
            sent++;
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (e) {
            failed++;
          }
        }

        await sendMessage(
          chat.id,
          `✅ <b>Рассылка с депозитом завершена!</b>\n\n` +
            `💰 Сумма: ${amount.toLocaleString()} монет каждому\n` +
            `📤 Отправлено: ${sent}\n` +
            `❌ Не доставлено: ${failed}\n` +
            `💵 Всего выдано: ${(sent * amount).toLocaleString()} монет`,
        );
      } else if (text.startsWith("/admin_delete_promo ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const code = text.split(" ")[1];

        if (!code) {
          await sendMessage(chat.id, "❌ Формат: /admin_delete_promo [код]");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: promo } = await supabaseClient.from("squid_promo_codes").select("*").eq("code", code).single();

        if (!promo) {
          await sendMessage(chat.id, "❌ Промокод не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient.from("squid_promo_codes").delete().eq("code", code);

        await sendMessage(chat.id, `✅ Промокод \"${code}\" удалён!`);
      } else if (text.startsWith("/admin_set_balance ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /admin_set_balance [ID] [сумма]");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        const newBalance = parseInt(args[2]);

        if (isNaN(targetId) || isNaN(newBalance)) {
          await sendMessage(chat.id, "❌ ID и сумма должны быть числами!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient.from("squid_players").update({ balance: newBalance }).eq("id", target.id);

        await sendMessage(
          chat.id,
          `✅ Баланс игрока ${target.first_name} изменён с ${target.balance} на ${newBalance} монет`,
        );
      } else if (text.startsWith("/create_prefix ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /create_prefix [название] [цена]");
          return new Response("OK", { headers: corsHeaders });
        }

        const prefixName = args[1].toLowerCase();
        const price = parseInt(args[2]);

        if (isNaN(price) || price <= 0) {
          await sendMessage(chat.id, "❌ Цена должна быть положительным числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Check if prefix already exists
        const { data: existingPrefix } = await supabaseClient
          .from("squid_prefixes")
          .select("*")
          .eq("name", prefixName)
          .maybeSingle();

        if (existingPrefix) {
          await sendMessage(chat.id, `❌ Префикс "${prefixName}" уже существует!`);
          return new Response("OK", { headers: corsHeaders });
        }

        // Create prefix in database
        const { error: insertError } = await supabaseClient
          .from("squid_prefixes")
          .insert({ name: prefixName, price: price });

        if (insertError) {
          await sendMessage(chat.id, `❌ Ошибка создания префикса: ${insertError.message}`);
          return new Response("OK", { headers: corsHeaders });
        }

        await sendMessage(
          chat.id,
          `✅ <b>Префикс создан!</b>\n\n` +
            `📝 Название: ${prefixName}\n` +
            `💰 Цена: ${price.toLocaleString()} монет\n\n` +
            `Префикс уже доступен в магазине /shop`,
        );
      } else if (text.startsWith("/prefix_delete ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const prefixName = text.replace("/prefix_delete ", "").trim();

        if (!prefixName) {
          await sendMessage(chat.id, "❌ Формат: /prefix_delete [название]");
          return new Response("OK", { headers: corsHeaders });
        }

        // Search case-insensitive
        const { data: existingPrefix } = await supabaseClient
          .from("squid_prefixes")
          .select("*")
          .ilike("name", prefixName)
          .maybeSingle();

        if (!existingPrefix) {
          await sendMessage(chat.id, `❌ Префикс "${prefixName}" не найден в магазине!`);
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_prefixes")
          .delete()
          .eq("id", existingPrefix.id);

        await sendMessage(
          chat.id,
          `✅ Префикс "${existingPrefix.name}" удалён из магазина!`,
        );
      } else if (text.startsWith("/get_prefix ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /get_prefix [название] [ID игрока]");
          return new Response("OK", { headers: corsHeaders });
        }

        const prefixName = args[1];
        const targetId = parseInt(args[2]);

        if (isNaN(targetId)) {
          await sendMessage(chat.id, "❌ ID игрока должен быть числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: targetPlayer } = await supabaseClient
          .from("squid_players")
          .select("id, first_name, owned_prefixes")
          .eq("telegram_id", targetId)
          .single();

        if (!targetPlayer) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        const ownedPrefixes = targetPlayer.owned_prefixes || [];
        
        if (ownedPrefixes.includes(prefixName)) {
          await sendMessage(chat.id, `❌ У игрока ${targetPlayer.first_name} уже есть префикс "${prefixName}"!`);
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_players")
          .update({ owned_prefixes: [...ownedPrefixes, prefixName] })
          .eq("id", targetPlayer.id);

        await sendMessage(
          chat.id,
          `✅ <b>Префикс выдан!</b>\n\n` +
            `👤 Игрок: ${targetPlayer.first_name} (${targetId})\n` +
            `✨ Префикс: ${prefixName}\n\n` +
            `Игрок может активировать его в /profile`,
        );
      } else if (text.startsWith("/admin_edit ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.split(" ");
        if (args.length !== 2) {
          await sendMessage(chat.id, "❌ Формат: /admin_edit [ID]");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        if (isNaN(targetId)) {
          await sendMessage(chat.id, "❌ ID должен быть числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from("squid_players")
          .select("*")
          .eq("telegram_id", targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        const prefixText = target.prefix ? target.prefix : "нет";

        await sendMessage(
          chat.id,
          `⚙️ <b>Редактирование игрока ${targetId}</b>\n\n💰 Баланс: ${target.balance} монет\n✨ Префикс: ${prefixText}\n🏆 Побед: ${target.total_wins}\n💀 Поражений: ${target.total_losses}`,
          {
            inline_keyboard: [
              [{ text: "✨ Дать префикс absolute", callback_data: `admin_set_prefix_absolute_${targetId}` }],
              [{ text: "✨ Дать префикс emperror", callback_data: `admin_set_prefix_emperror_${targetId}` }],
              [{ text: "❌ Убрать префикс", callback_data: `admin_remove_prefix_${targetId}` }],
              [{ text: "🔄 Обнулить статистику", callback_data: `admin_reset_stats_${targetId}` }],
            ],
          },
        );
      } else if (text === "/si") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, last_si_claim")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const now = new Date();
        const lastClaim = player.last_si_claim ? new Date(player.last_si_claim) : null;

        // Check if 1 hour has passed
        if (lastClaim && now.getTime() - lastClaim.getTime() < 60 * 60 * 1000) {
          const minutesLeft = Math.ceil((60 * 60 * 1000 - (now.getTime() - lastClaim.getTime())) / (60 * 1000));
          await sendMessage(
            chat.id,
            `⏰ Поиск предметов доступен раз в час!\n\nПриходи через ${minutesLeft} ${minutesLeft === 1 ? "минуту" : minutesLeft < 5 ? "минуты" : "минут"}.`,
          );
          return new Response("OK", { headers: corsHeaders });
        }

        // Random money (0-2000) - reduced
        const moneyFound = Math.floor(Math.random() * 2001);

        // Item drop chances - REDUCED
        const itemChance = Math.random() * 100;
        let itemFound: { name: string; rarity: string; sellPrice: number } | null = null;

        if (itemChance < 0.5) {
          // 0.5% - Маска Фронтман (Мифическая)
          itemFound = { name: "🎭 Маска Фронтман", rarity: "Мифическая", sellPrice: 25000 };
        } else if (itemChance < 2.5) {
          // 2% - Карта VIP (Эпическая)
          itemFound = { name: "💳 Карта VIP", rarity: "Эпическая", sellPrice: 9000 };
        } else if (itemChance < 7.5) {
          // 5% - Маска квадрат (Раритет)
          itemFound = { name: "🟥 Маска квадрат", rarity: "Раритет", sellPrice: 5000 };
        } else if (itemChance < 17.5) {
          // 10% - Печенька Зонт (Обычная)
          itemFound = { name: "🍪 Печенька Зонт", rarity: "Обычная", sellPrice: 2000 };
        } else if (itemChance < 25) {
          // 7.5% - Зипка 456 (Обычная)
          itemFound = { name: "🧥 Зипка 456", rarity: "Обычная", sellPrice: 3000 };
        }
        // 75% - nothing

        // Update balance and last claim
        await supabaseClient
          .from("squid_players")
          .update({
            balance: player.balance + moneyFound,
            last_si_claim: now.toISOString(),
          })
          .eq("id", player.id);

        // Add item to inventory if found
        if (itemFound) {
          await supabaseClient.from("squid_player_items").insert({
            player_id: player.id,
            item_name: itemFound.name,
            item_rarity: itemFound.rarity,
            sell_price: itemFound.sellPrice,
          });
        }

        const resultText = itemFound
          ? `🔍 <b>Поиск предметов</b>\n\n💰 Найдено монет: ${moneyFound}\n\n🎁 <b>Предмет найден!</b>\n${itemFound.name}\nРедкость: ${itemFound.rarity}\nЦена продажи: ${itemFound.sellPrice} монет\n\n💵 Новый баланс: ${player.balance + moneyFound} монет`
          : `🔍 <b>Поиск предметов</b>\n\n💰 Найдено монет: ${moneyFound}\n\n❌ Предметов не найдено\n\n💵 Новый баланс: ${player.balance + moneyFound} монет`;

        await sendMessage(chat.id, resultText);
      } else if (text === "/items") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: items } = await supabaseClient
          .from("squid_player_items")
          .select("*")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false });

        if (!items || items.length === 0) {
          await sendMessage(chat.id, "🎒 <b>Твой инвентарь пуст</b>\n\nИспользуй команду /si чтобы найти предметы!");
          return new Response("OK", { headers: corsHeaders });
        }

        let inventoryText = "🎒 <b>Твой инвентарь</b>\n\n";

        items.forEach((item, index) => {
          inventoryText += `${index + 1}. ${item.item_name}\n`;
          inventoryText += `   Редкость: ${item.item_rarity}\n`;
          inventoryText += `   Цена: ${item.sell_price} монет\n\n`;
        });

        inventoryText += "\nИспользуй /sell [номер] чтобы продать предмет";

        await sendMessage(chat.id, inventoryText);
      } else if (text.startsWith("/sell ")) {
        const args = text.split(" ");
        if (args.length !== 2) {
          await sendMessage(chat.id, "❌ Формат: /sell [номер] или /sell all");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: items } = await supabaseClient
          .from("squid_player_items")
          .select("*")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false });

        if (!items || items.length === 0) {
          await sendMessage(chat.id, "❌ У тебя нет предметов для продажи!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (args[1] === "all") {
          let totalValue = 0;
          for (const item of items) {
            totalValue += item.sell_price;
          }

          await supabaseClient
            .from("squid_players")
            .update({ balance: player.balance + totalValue })
            .eq("id", player.id);

          await supabaseClient.from("squid_player_items").delete().eq("player_id", player.id);

          await sendMessage(
            chat.id,
            `✅ <b>Все предметы проданы!</b>\n\n📦 Продано: ${items.length} шт.\n💰 Получено: ${totalValue.toLocaleString()} монет\n💵 Новый баланс: ${(player.balance + totalValue).toLocaleString()} монет`,
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const itemIndex = parseInt(args[1]) - 1;

        if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= items.length) {
          await sendMessage(chat.id, "❌ Предмет не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        const itemToSell = items[itemIndex];

        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance + itemToSell.sell_price })
          .eq("id", player.id);

        await supabaseClient.from("squid_player_items").delete().eq("id", itemToSell.id);

        await sendMessage(
          chat.id,
          `✅ <b>Предмет продан!</b>\n\n${itemToSell.item_name}\n💰 Получено: ${itemToSell.sell_price.toLocaleString()} монет\n💵 Новый баланс: ${(player.balance + itemToSell.sell_price).toLocaleString()} монет`,
        );
      } else if (text === "/business_shop") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const shopText = `🏭 <b>Магазин бизнесов</b>

💼 <b>Фабрика масок</b>
🪙 Стоимость: 200,000 монет
💰 Доход: 12,500 - 50,000 монет/час
⬆️ 3 улучшения доступно

🎰 <b>VIP Казино</b>
🪙 Стоимость: 500,000 монет
💰 Доход: 25,000 - 100,000 монет/час
⬆️ 3 улучшения доступно

💵 Твой баланс: ${player.balance.toLocaleString()} монет`;

        await sendMessage(chat.id, shopText, {
          inline_keyboard: [
            [{ text: "🏭 Купить Фабрику масок", callback_data: `buy_business_mask_factory_u${from.id}` }],
            [{ text: "🎰 Купить VIP Казино", callback_data: `buy_business_vip_casino_u${from.id}` }],
            [{ text: "📊 Мои бизнесы", callback_data: `my_businesses_u${from.id}` }],
          ],
        });
      } else if (text === "/my_buss") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: businesses } = await supabaseClient
          .from("squid_player_businesses")
          .select("*")
          .eq("player_id", player.id);

        if (!businesses || businesses.length === 0) {
          await sendMessage(
            chat.id,
            "❌ У тебя нет бизнесов!\n\nИспользуй /business_shop чтобы купить свой первый бизнес.",
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const businessInfo = (type: string, level: number) => {
          if (type === "mask_factory") {
            const incomes = [12500, 25000, 37500, 50000];
            const upgradeCosts = [100000, 200000, 300000];
            return {
              name: "🏭 Фабрика масок",
              income: incomes[level],
              upgradeCost: level < 3 ? upgradeCosts[level] : null,
            };
          } else {
            const incomes = [25000, 50000, 75000, 100000];
            const upgradeCosts = [600000, 700000, 800000];
            return {
              name: "🎰 VIP Казино",
              income: incomes[level],
              upgradeCost: level < 3 ? upgradeCosts[level] : null,
            };
          }
        };

        let listText = "💼 <b>Мои бизнесы</b>\n\n";
        const buttons: any[] = [];

        businesses.forEach((biz) => {
          const info = businessInfo(biz.business_type, biz.upgrade_level);
          listText += `${info.name}\n`;
          listText += `📊 Уровень: ${biz.upgrade_level + 1}/4\n`;
          listText += `💰 Доход: ${info.income.toLocaleString()} монет/час\n`;
          if (info.upgradeCost) {
            listText += `⬆️ Улучшение: ${info.upgradeCost.toLocaleString()} монет\n`;
            buttons.push([
              {
                text: `⬆️ Улучшить ${info.name}`,
                callback_data: `upgrade_business_${biz.business_type}_u${from.id}`,
              },
            ]);
          } else {
            listText += `✅ Максимальный уровень!\n`;
          }
          listText += "\n";
        });

        listText += `💵 Баланс: ${player.balance.toLocaleString()} монет`;

        await sendMessage(chat.id, listText, {
          inline_keyboard: buttons.length > 0 ? buttons : undefined,
        });
      } else if (text === "/collect") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: businesses } = await supabaseClient
          .from("squid_player_businesses")
          .select("*")
          .eq("player_id", player.id);

        if (!businesses || businesses.length === 0) {
          await sendMessage(chat.id, "❌ У тебя нет бизнесов!");
          return new Response("OK", { headers: corsHeaders });
        }

        let totalIncome = 0;
        const now = new Date();

        for (const biz of businesses) {
          const lastCollection = new Date(biz.last_collection);
          const hoursPassed = (now.getTime() - lastCollection.getTime()) / (1000 * 60 * 60);
          
          // Cap at 1 hour maximum
          const cappedHours = Math.min(hoursPassed, 1);

          let hourlyIncome = 0;
          if (biz.business_type === "mask_factory") {
            const incomes = [12500, 25000, 37500, 50000];
            hourlyIncome = incomes[biz.upgrade_level];
          } else {
            const incomes = [25000, 50000, 75000, 100000];
            hourlyIncome = incomes[biz.upgrade_level];
          }

          const income = Math.floor(hourlyIncome * cappedHours);
          totalIncome += income;

          // Update last collection time
          await supabaseClient
            .from("squid_player_businesses")
            .update({ last_collection: now.toISOString() })
            .eq("id", biz.id);
        }

        if (totalIncome === 0) {
          await sendMessage(chat.id, "⏳ Пока нечего собирать. Подожди немного!\n\n⚠️ Максимум можно накопить за 1 час.");
          return new Response("OK", { headers: corsHeaders });
        }

        // Add income to player balance
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance + totalIncome })
          .eq("id", player.id);

        await sendMessage(
          chat.id,
          `💰 <b>Прибыль собрана!</b>\n\n🪙 Получено: ${totalIncome.toLocaleString()} монет\n💵 Новый баланс: ${(player.balance + totalIncome).toLocaleString()} монет\n\n⚠️ Собирай каждый час! Больше не накапливается.`,
        );
      } else if (text.startsWith("/admin_del_bus ")) {
        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /admin_del_bus [telegram_id] [тип]\nТипы: mask_factory, vip_casino");
          return new Response("OK", { headers: corsHeaders });
        }

        // Check if user is admin
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          await sendMessage(chat.id, "❌ У тебя нет прав администратора.");
          return new Response("OK", { headers: corsHeaders });
        }

        const telegramId = parseInt(args[1]);
        const businessType = args[2];

        if (businessType !== "mask_factory" && businessType !== "vip_casino") {
          await sendMessage(chat.id, "❌ Неверный тип бизнеса. Доступны: mask_factory, vip_casino");
          return new Response("OK", { headers: corsHeaders });
        }

        // Find player
        const { data: targetPlayer } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", telegramId)
          .single();

        if (!targetPlayer) {
          await sendMessage(chat.id, "❌ Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        // Delete business
        const { error } = await supabaseClient
          .from("squid_player_businesses")
          .delete()
          .eq("player_id", targetPlayer.id)
          .eq("business_type", businessType);

        if (error) {
          await sendMessage(chat.id, `❌ Ошибка при удалении бизнеса: ${error.message}`);
        } else {
          const businessName = businessType === "mask_factory" ? "Фабрика масок" : "VIP Казино";
          await sendMessage(chat.id, `✅ Бизнес "${businessName}" успешно удалён у игрока ${telegramId}!`);
        }
      } else if (text === "/clan") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: membership } = await supabaseClient
          .from("squid_clan_members")
          .select("*, squid_clans(*)")
          .eq("player_id", player.id)
          .maybeSingle();

        if (!membership) {
          await sendMessage(
            chat.id,
            "❌ Ты не состоишь в клане!\n\nИспользуй /clans чтобы посмотреть список кланов\nИли /clan_create [название] чтобы создать свой клан (500,000 монет)",
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const clan = membership.squid_clans;

        const { data: owner } = await supabaseClient
          .from("squid_players")
          .select("username, first_name, prefix")
          .eq("id", clan.owner_id)
          .single();

        const ownerName = owner?.prefix
          ? `[${owner.prefix}] ${owner.first_name || owner.username || "Unknown"}`
          : owner?.first_name || owner?.username || "Unknown";

        const roleNames: Record<string, string> = {
          owner: "👑 Владелец",
          admin: "⚔️ Админ",
          member: "👤 Участник",
        };

        await sendMessage(
          chat.id,
          `🏰 <b>Твой клан</b>\n\n` +
            `📛 Название: ${clan.name}\n` +
            `👑 Владелец: ${ownerName}\n` +
            `👥 Участников: ${clan.member_count}\n` +
            `💰 Казна: ${clan.balance.toLocaleString()} монет\n` +
            `📊 Твоя роль: ${roleNames[membership.role] || membership.role}\n\n` +
            `📅 Создан: ${new Date(clan.created_at).toLocaleDateString("ru-RU")}`,
        );
      } else if (text === "/clans") {
        const { data: clans } = await supabaseClient
          .from("squid_clans")
          .select("*")
          .order("member_count", { ascending: false })
          .limit(10);

        if (!clans || clans.length === 0) {
          await sendMessage(
            chat.id,
            "🏰 <b>Список кланов</b>\n\nПока нет ни одного клана!\n\nСоздай первый: /clan_create [название]",
          );
          return new Response("OK", { headers: corsHeaders });
        }

        let listText = "🏰 <b>Топ кланов</b>\n\n";

        for (let i = 0; i < clans.length; i++) {
          const clan = clans[i];
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          listText += `${medal} <b>${clan.name}</b>\n`;
          listText += `   👥 ${clan.member_count} | 💰 ${clan.balance.toLocaleString()}\n`;
        }

        listText += "\n/clan - информация о своём клане\n/clan_create [название] - создать клан (500k)";

        await sendMessage(chat.id, listText);
      } else if (text.startsWith("/clan_create ")) {
        const clanName = text.replace("/clan_create ", "").trim();

        if (!clanName || clanName.length < 2 || clanName.length > 20) {
          await sendMessage(chat.id, "❌ Название клана должно быть от 2 до 20 символов!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: existingMembership } = await supabaseClient
          .from("squid_clan_members")
          .select("id")
          .eq("player_id", player.id)
          .maybeSingle();

        if (existingMembership) {
          await sendMessage(chat.id, "❌ Ты уже состоишь в клане! Сначала покинь его.");
          return new Response("OK", { headers: corsHeaders });
        }

        const clanCost = 500000;
        if (player.balance < clanCost) {
          await sendMessage(
            chat.id,
            `❌ Недостаточно монет!\n\nСтоимость создания клана: ${clanCost.toLocaleString()} монет\nТвой баланс: ${player.balance.toLocaleString()} монет`,
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: existingClan } = await supabaseClient
          .from("squid_clans")
          .select("id")
          .eq("name", clanName)
          .maybeSingle();

        if (existingClan) {
          await sendMessage(chat.id, "❌ Клан с таким названием уже существует!");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance - clanCost })
          .eq("id", player.id);

        const { data: newClan, error: clanError } = await supabaseClient
          .from("squid_clans")
          .insert({
            name: clanName,
            owner_id: player.id,
            member_count: 1,
          })
          .select()
          .single();

        if (clanError || !newClan) {
          await supabaseClient.from("squid_players").update({ balance: player.balance }).eq("id", player.id);
          await sendMessage(chat.id, "❌ Ошибка при создании клана. Попробуй другое название.");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient.from("squid_clan_members").insert({
          clan_id: newClan.id,
          player_id: player.id,
          role: "owner",
        });

        await sendMessage(
          chat.id,
          `✅ <b>Клан создан!</b>\n\n` +
            `🏰 Название: ${clanName}\n` +
            `💰 Потрачено: ${clanCost.toLocaleString()} монет\n` +
            `💵 Новый баланс: ${(player.balance - clanCost).toLocaleString()} монет\n\n` +
            `Используй /clan чтобы увидеть информацию о клане`,
        );
      } else if (text.startsWith("/clan_join ")) {
        const clanName = text.replace("/clan_join ", "").trim();

        if (!clanName) {
          await sendMessage(chat.id, "❌ Укажи название клана!\nФормат: /clan_join [название]");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: existingMembership } = await supabaseClient
          .from("squid_clan_members")
          .select("id")
          .eq("player_id", player.id)
          .maybeSingle();

        if (existingMembership) {
          await sendMessage(chat.id, "❌ Ты уже состоишь в клане! Сначала покинь его командой /clan_leave");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: clan } = await supabaseClient.from("squid_clans").select("*").eq("name", clanName).maybeSingle();

        if (!clan) {
          await sendMessage(chat.id, "❌ Клан с таким названием не найден!\n\nПосмотри список кланов: /clans");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient.from("squid_clan_members").insert({
          clan_id: clan.id,
          player_id: player.id,
          role: "member",
        });

        await supabaseClient
          .from("squid_clans")
          .update({ member_count: clan.member_count + 1 })
          .eq("id", clan.id);

        await sendMessage(
          chat.id,
          `✅ <b>Ты вступил в клан!</b>\n\n` +
            `🏰 Клан: ${clan.name}\n` +
            `👥 Участников: ${clan.member_count + 1}\n\n` +
            `Используй /clan чтобы увидеть информацию о клане`,
        );
      } else if (text === "/clan_leave") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: membership } = await supabaseClient
          .from("squid_clan_members")
          .select("*, squid_clans(*)")
          .eq("player_id", player.id)
          .maybeSingle();

        if (!membership) {
          await sendMessage(chat.id, "❌ Ты не состоишь в клане!");
          return new Response("OK", { headers: corsHeaders });
        }

        const clan = membership.squid_clans;

        if (membership.role === "owner") {
          if (clan.member_count > 1) {
            await sendMessage(
              chat.id,
              "❌ Ты владелец клана! Сначала передай владение или расформируй клан (когда в нём только ты).",
            );
            return new Response("OK", { headers: corsHeaders });
          }

          await supabaseClient.from("squid_clan_members").delete().eq("id", membership.id);

          await supabaseClient.from("squid_clans").delete().eq("id", clan.id);

          await sendMessage(chat.id, `✅ <b>Клан расформирован!</b>\n\n` + `🏰 Клан "${clan.name}" был удалён.`);
        } else {
          await supabaseClient.from("squid_clan_members").delete().eq("id", membership.id);

          await supabaseClient
            .from("squid_clans")
            .update({ member_count: clan.member_count - 1 })
            .eq("id", clan.id);

          await sendMessage(chat.id, `✅ <b>Ты покинул клан!</b>\n\n` + `🏰 Клан: ${clan.name}`);
        }
      } else if (text === "/case") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        await sendMessage(
          chat.id,
          `📦 <b>Магазин кейсов</b>\n\n` +
            `🎁 <b>Кейс #1</b> - 100,000 монет\n` +
            `   🪙 50,000 монет (70%)\n` +
            `   🪙 150,000 монет (11%)\n` +
            `   💰 300,000 монет (5%)\n` +
            `   👑 VIP префикс (1%)\n` +
            `   ❌ Пусто (13%)\n\n` +
            `💎 <b>Кейс #2</b> - 500,000 монет\n` +
            `   🪙 200,000 монет (70%)\n` +
            `   🪙 600,000 монет (11%)\n` +
            `   💎 1,000,000 монет (5%)\n` +
            `   👑 VIP префикс (1%)\n` +
            `   ❌ Пусто (13%)\n\n` +
            `💵 Твой баланс: ${player.balance.toLocaleString()} монет`,
          {
            inline_keyboard: [
              [{ text: "🎁 Открыть Кейс #1 (100k)", callback_data: `open_case_1_u${from.id}` }],
              [{ text: "💎 Открыть Кейс #2 (500k)", callback_data: `open_case_2_u${from.id}` }],
            ],
          },
        );
      } else if (text === "/ref") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("telegram_id, referral_count, gift_count")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }

        const botUsername = "squid_game_russia_bot";
        const refLink = `https://t.me/${botUsername}?start=ref${player.telegram_id}`;

        await sendMessage(
          chat.id,
          `🔗 <b>Реферальная программа</b>\n\n` +
            `Приглашай друзей и получай награды!\n\n` +
            `💰 За каждого друга: <b>100,000 монет</b>\n` +
            `🎁 За каждого друга: <b>1 подарок</b>\n\n` +
            `👥 Приглашено друзей: ${player.referral_count || 0}\n` +
            `🎁 Доступно подарков: ${player.gift_count || 0}\n\n` +
            `📎 <b>Твоя ссылка:</b>\n<code>${refLink}</code>\n\n` +
            `Используй /gift_open чтобы открыть подарок!`,
        );
      } else if (text === "/gift_open") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, gift_count, owned_prefixes")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }

        if ((player.gift_count || 0) <= 0) {
          await sendMessage(
            chat.id,
            `❌ <b>У тебя нет подарков!</b>\n\n` +
              `Приглашай друзей по реферальной ссылке /ref чтобы получить подарки!`,
          );
          return new Response("OK", { headers: corsHeaders });
        }

        // Deduct gift
        await supabaseClient
          .from("squid_players")
          .update({ gift_count: player.gift_count - 1 })
          .eq("id", player.id);

        // Gift rewards - the lower the chance, the higher the reward
        const giftChance = Math.random() * 100;
        let rewardText = "";
        let coinsWon = 0;
        let prefixWon: string | null = null;

        if (giftChance < 0.5) {
          // 0.5% - GOD prefix
          prefixWon = "GOD";
          rewardText = `👑 <b>ЛЕГЕНДАРНЫЙ ВЫИГРЫШ!</b>\n\n✨ Ты получил префикс <b>GOD</b>!\n\nАктивируй его в /profile`;

          const ownedPrefixes = player.owned_prefixes || [];
          if (!ownedPrefixes.includes("GOD")) {
            await supabaseClient
              .from("squid_players")
              .update({ owned_prefixes: [...ownedPrefixes, "GOD"] })
              .eq("id", player.id);
          } else {
            // Already has GOD, give coins instead
            coinsWon = 200000;
            rewardText = `👑 <b>ЛЕГЕНДАРНЫЙ ВЫИГРЫШ!</b>\n\nУ тебя уже есть GOD, поэтому ты получаешь:\n💰 <b>+200,000 монет</b>`;
            await supabaseClient
              .from("squid_players")
              .update({ balance: player.balance + coinsWon })
              .eq("id", player.id);
          }
        } else if (giftChance < 1.5) {
          // 1% - 200,000 coins
          coinsWon = 200000;
          rewardText = `🎉 <b>ОГРОМНЫЙ ВЫИГРЫШ!</b>\n\n💰 <b>+200,000 монет</b>`;
        } else if (giftChance < 5) {
          // 3.5% - 100,000 coins
          coinsWon = 100000;
          rewardText = `🎉 <b>ОТЛИЧНЫЙ ВЫИГРЫШ!</b>\n\n💰 <b>+100,000 монет</b>`;
        } else if (giftChance < 15) {
          // 10% - 50,000 coins
          coinsWon = 50000;
          rewardText = `🎁 <b>Хороший выигрыш!</b>\n\n💰 <b>+50,000 монет</b>`;
        } else if (giftChance < 35) {
          // 20% - 25,000 coins
          coinsWon = 25000;
          rewardText = `🎁 <b>Выигрыш!</b>\n\n💰 <b>+25,000 монет</b>`;
        } else if (giftChance < 60) {
          // 25% - 10,000 coins
          coinsWon = 10000;
          rewardText = `🎁 Выигрыш\n\n💰 <b>+10,000 монет</b>`;
        } else {
          // 40% - 5,000 coins
          coinsWon = 5000;
          rewardText = `🎁 Небольшой выигрыш\n\n💰 <b>+5,000 монет</b>`;
        }

        if (coinsWon > 0 && !prefixWon) {
          await supabaseClient
            .from("squid_players")
            .update({ balance: player.balance + coinsWon })
            .eq("id", player.id);
        }

        const newBalance = player.balance + coinsWon;
        const remainingGifts = player.gift_count - 1;

        await sendMessage(
          chat.id,
          `🎁 <b>Открытие подарка</b>\n\n${rewardText}\n\n💵 Баланс: ${newBalance.toLocaleString()} монет\n🎁 Осталось подарков: ${remainingGifts}`,
        );
      } else if (text.startsWith("/gift_all ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.replace("/gift_all ", "").trim();
        const firstSpace = args.indexOf(" ");

        if (firstSpace === -1) {
          await sendMessage(chat.id, "❌ Формат: /gift_all [количество] [сообщение]");
          return new Response("OK", { headers: corsHeaders });
        }

        const amount = parseInt(args.substring(0, firstSpace));
        const messageText = args.substring(firstSpace + 1).trim();

        if (isNaN(amount) || amount <= 0) {
          await sendMessage(chat.id, "❌ Количество подарков должно быть положительным числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (!messageText) {
          await sendMessage(chat.id, "❌ Укажи текст сообщения!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: allPlayers } = await supabaseClient.from("squid_players").select("telegram_id, gift_count, id");

        if (!allPlayers || allPlayers.length === 0) {
          await sendMessage(chat.id, "❌ Нет игроков для рассылки");
          return new Response("OK", { headers: corsHeaders });
        }

        let sent = 0;
        let failed = 0;

        for (const player of allPlayers) {
          try {
            // Add gifts to player
            await supabaseClient
              .from("squid_players")
              .update({ gift_count: (player.gift_count || 0) + amount })
              .eq("id", player.id);

            // Convert telegram_id to number (might be BigInt from DB)
            const telegramId = Number(player.telegram_id);
            await sendMessage(
              telegramId,
              `🎁 <b>Подарок от создателя!</b>\n\n🎁 Тебе начислено: ${amount} ${amount === 1 ? "подарок" : amount < 5 ? "подарка" : "подарков"}\n\n📢 ${messageText}\n\nОткрой подарки: /gift_open`,
            );
            sent++;
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (e) {
            console.error(`Failed to send gift to player ${player.id}:`, e);
            failed++;
          }
        }

        await sendMessage(
          chat.id,
          `✅ <b>Рассылка подарков завершена!</b>\n\n` +
            `🎁 Количество: ${amount} каждому\n` +
            `📤 Отправлено: ${sent}\n` +
            `❌ Не доставлено: ${failed}\n` +
            `🎁 Всего выдано: ${sent * amount} подарков`,
        );
      } else if (text.startsWith("/gift ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /gift [ID игрока] [количество]");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(args[1]);
        const amount = parseInt(args[2]);

        if (isNaN(targetId)) {
          await sendMessage(chat.id, "❌ ID игрока должен быть числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (isNaN(amount) || amount <= 0) {
          await sendMessage(chat.id, "❌ Количество подарков должно быть положительным числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: targetPlayer } = await supabaseClient
          .from("squid_players")
          .select("id, first_name, gift_count, telegram_id")
          .eq("telegram_id", targetId)
          .single();

        if (!targetPlayer) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_players")
          .update({ gift_count: (targetPlayer.gift_count || 0) + amount })
          .eq("id", targetPlayer.id);

        // Notify the player
        try {
          await sendMessage(
            targetPlayer.telegram_id,
            `🎁 <b>Подарок от администратора!</b>\n\n` +
              `🎁 Тебе начислено: ${amount} ${amount === 1 ? "подарок" : amount < 5 ? "подарка" : "подарков"}\n\n` +
              `Открой подарки: /gift_open`,
          );
        } catch (e) {
          // Player might have blocked the bot
        }

        await sendMessage(
          chat.id,
          `✅ <b>Подарки выданы!</b>\n\n` +
            `👤 Игрок: ${targetPlayer.first_name} (${targetId})\n` +
            `🎁 Выдано: ${amount} ${amount === 1 ? "подарок" : amount < 5 ? "подарка" : "подарков"}\n` +
            `🎁 Всего подарков у игрока: ${(targetPlayer.gift_count || 0) + amount}`,
        );
      } else if (text.startsWith("/prefix_delete_player ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const args = text.replace("/prefix_delete_player ", "").trim();
        const firstSpace = args.indexOf(" ");

        if (firstSpace === -1) {
          await sendMessage(chat.id, "❌ Формат: /prefix_delete_player [ID игрока] [название префикса]");
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(args.substring(0, firstSpace));
        const prefixToDelete = args.substring(firstSpace + 1).trim();

        if (isNaN(targetId)) {
          await sendMessage(chat.id, "❌ ID игрока должен быть числом!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (!prefixToDelete) {
          await sendMessage(chat.id, "❌ Укажи название префикса!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: targetPlayer } = await supabaseClient
          .from("squid_players")
          .select("id, first_name, owned_prefixes, prefix")
          .eq("telegram_id", targetId)
          .single();

        if (!targetPlayer) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        const ownedPrefixes = targetPlayer.owned_prefixes || [];
        
        // Find prefix case-insensitive
        const prefixIndex = ownedPrefixes.findIndex(
          (p: string) => p.toLowerCase() === prefixToDelete.toLowerCase()
        );

        if (prefixIndex === -1) {
          await sendMessage(
            chat.id,
            `❌ У игрока ${targetPlayer.first_name} (${targetId}) нет префикса "${prefixToDelete}"!\n\n` +
              `Имеющиеся префиксы: ${ownedPrefixes.length > 0 ? ownedPrefixes.join(", ") : "нет"}`
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const deletedPrefix = ownedPrefixes[prefixIndex];
        const newOwnedPrefixes = ownedPrefixes.filter((_: string, i: number) => i !== prefixIndex);
        
        // If active prefix is the one being deleted, remove it
        const updateData: any = { owned_prefixes: newOwnedPrefixes };
        if (targetPlayer.prefix && targetPlayer.prefix.toLowerCase() === deletedPrefix.toLowerCase()) {
          updateData.prefix = null;
        }

        await supabaseClient
          .from("squid_players")
          .update(updateData)
          .eq("id", targetPlayer.id);

        await sendMessage(
          chat.id,
          `✅ <b>Префикс удалён!</b>\n\n` +
            `👤 Игрок: ${targetPlayer.first_name} (${targetId})\n` +
            `❌ Удалён: ${deletedPrefix}\n` +
            `📦 Осталось префиксов: ${newOwnedPrefixes.length > 0 ? newOwnedPrefixes.join(", ") : "нет"}`
        );
      } else if (text === "/donate") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance, is_premium, premium_expires_at")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }

        const isPremiumActive = player.is_premium && player.premium_expires_at && new Date(player.premium_expires_at) > new Date();
        const premiumStatus = isPremiumActive 
          ? `✅ Активен до ${new Date(player.premium_expires_at!).toLocaleDateString("ru-RU")}`
          : "❌ Не активен";

        await sendMessage(
          chat.id,
          `💎 <b>Донат магазин</b>\n\n` +
            `👑 <b>PREMIUM статус:</b> ${premiumStatus}\n\n` +
            `🎁 <b>Преимущества PREMIUM:</b>\n` +
            `   • 2X множитель ограбления игроков\n` +
            `   • 2X бонус выигрыша в казино\n` +
            `   • 2X доход от бизнеса\n\n` +
            `💵 Твой баланс: ${(player.balance || 0).toLocaleString()} монет`,
          {
            inline_keyboard: [
              [{ text: "👑 PREMIUM (1 месяц)", callback_data: `donate_premium_u${from.id}` }],
              [{ text: "🪙 100,000 монет - 15₽", callback_data: `donate_coins_100k_u${from.id}` }],
              [{ text: "💰 500,000 монет - 35₽", callback_data: `donate_coins_500k_u${from.id}` }],
              [{ text: "💎 1,000,000 монет - 75₽", callback_data: `donate_coins_1m_u${from.id}` }],
              [{ text: "✨ Кастомный префикс", callback_data: `donate_prefix_u${from.id}` }],
              [{ text: "⬅️ Назад", callback_data: "main_menu" }],
            ],
          },
        );
      } else if (text === "/profile") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }

        const prefixText = player.prefix ? `${player.prefix}` : "Нет префикса";
        const displayName = player.prefix
          ? `[${player.prefix}] ${player.first_name || from.first_name || "Игрок"}`
          : player.first_name || from.first_name || "Игрок";

        const ownedPrefixes = player.owned_prefixes || [];
        const isPremiumActive = player.is_premium && player.premium_expires_at && new Date(player.premium_expires_at) > new Date();

        // Build prefix selection buttons
        const prefixButtons: any[] = [];
        if (ownedPrefixes.length > 0) {
          for (const prefixName of ownedPrefixes) {
            if (prefixName !== player.prefix) {
              prefixButtons.push([{ text: `✨ Активировать ${prefixName}`, callback_data: `activate_prefix_${prefixName}_u${from.id}` }]);
            }
          }
        }

        await sendMessage(
          chat.id,
          `👤 <b>Профиль: ${displayName}</b>\n\n` +
            `💰 Баланс: ${(player.balance || 0).toLocaleString()} монет\n` +
            `👑 Premium: ${isPremiumActive ? "✅ Активен" : "❌ Нет"}\n` +
            `🏆 Побед: ${player.total_wins || 0}\n` +
            `💀 Поражений: ${player.total_losses || 0}\n` +
            `✨ Префикс: ${prefixText}\n` +
            `📦 Куплено префиксов: ${ownedPrefixes.length}\n` +
            `👥 Рефералов: ${player.referral_count || 0}\n` +
            `🎁 Подарков: ${player.gift_count || 0}`,
          {
            inline_keyboard: [
              ...prefixButtons,
              [{ text: "🛍️ Магазин префиксов", callback_data: `shop_prefixes_u${from.id}` }],
              player.prefix ? [{ text: "❌ Убрать префикс", callback_data: `remove_prefix_u${from.id}` }] : [],
              [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
            ].filter((row) => row.length > 0),
          },
        );
      } else if (text === "/off") {
        // Admin only - disable bot for all users
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_bot_settings")
          .update({ value: "false", updated_at: new Date().toISOString() })
          .eq("key", "bot_enabled");

        await sendMessage(
          chat.id,
          "🔴 <b>Бот выключен!</b>\n\nБот теперь недоступен для всех пользователей кроме админа.\nИспользуй /on чтобы включить бот."
        );
      } else if (text === "/on") {
        // Admin only - enable bot for all users
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        await supabaseClient
          .from("squid_bot_settings")
          .update({ value: "true", updated_at: new Date().toISOString() })
          .eq("key", "bot_enabled");

        await sendMessage(
          chat.id,
          "🟢 <b>Бот включён!</b>\n\nБот теперь доступен для всех пользователей."
        );
      }
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

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
    message_id: number;
    chat: {
      id: number;
      type?: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
    caption?: string;
    photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number }>;
    video?: { file_id: string; file_unique_id: string; width: number; height: number; duration: number };
    animation?: { file_id: string; file_unique_id: string; width: number; height: number; duration: number };
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
    console.log("Sending message to", chatId, "body:", JSON.stringify(body).slice(0, 500));
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log("sendMessage result:", JSON.stringify(result));

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

// Function to send photo with caption
async function sendPhoto(chatId: number, photo: string, caption?: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, photo, parse_mode: "HTML" };
  if (caption) body.caption = caption;
  if (replyMarkup) body.reply_markup = replyMarkup;

  try {
    const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    console.error("Error sending photo:", error);
  }
}

// Function to send animation (GIF)
async function sendAnimation(chatId: number, animation: string, caption?: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, animation, parse_mode: "HTML" };
  if (caption) body.caption = caption;
  if (replyMarkup) body.reply_markup = replyMarkup;

  try {
    const response = await fetch(`${TELEGRAM_API}/sendAnimation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    console.error("Error sending animation:", error);
  }
}

// Function to send video
async function sendVideo(chatId: number, video: string, caption?: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, video, parse_mode: "HTML" };
  if (caption) body.caption = caption;
  if (replyMarkup) body.reply_markup = replyMarkup;

  try {
    const response = await fetch(`${TELEGRAM_API}/sendVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    console.error("Error sending video:", error);
  }
}

// Function to send media with text (auto-detect type from URL)
async function sendMediaWithText(chatId: number, mediaUrl: string, text: string, replyMarkup?: any) {
  const lowerUrl = mediaUrl.toLowerCase();
  
  if (lowerUrl.includes('.gif') || lowerUrl.includes('giphy') || lowerUrl.includes('tenor')) {
    return await sendAnimation(chatId, mediaUrl, text, replyMarkup);
  } else if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi') || lowerUrl.includes('video')) {
    return await sendVideo(chatId, mediaUrl, text, replyMarkup);
  } else {
    return await sendPhoto(chatId, mediaUrl, text, replyMarkup);
  }
}

// Function to send media by file_id (for forwarding attachments)
async function sendMediaByFileId(chatId: number, fileId: string, mediaType: 'photo' | 'video' | 'animation', caption?: string) {
  let endpoint = '';
  let fieldName = '';
  
  switch (mediaType) {
    case 'photo':
      endpoint = 'sendPhoto';
      fieldName = 'photo';
      break;
    case 'video':
      endpoint = 'sendVideo';
      fieldName = 'video';
      break;
    case 'animation':
      endpoint = 'sendAnimation';
      fieldName = 'animation';
      break;
  }
  
  const body: any = { chat_id: chatId, [fieldName]: fileId, parse_mode: "HTML" };
  if (caption) body.caption = caption;
  
  try {
    const response = await fetch(`${TELEGRAM_API}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    console.error(`Error sending ${mediaType}:`, error);
  }
}

// Function to set bot commands for autocomplete
async function setBotCommands() {
  const commands = [
    { command: "help", description: "📋 Команды" },
    { command: "profile", description: "👤 Профиль" },
    { command: "shop", description: "🛒 Магазин" },
    { command: "casino", description: "🎰 Казино" },
    { command: "challenge", description: "🔫 Русская рулетка" },
    { command: "top", description: "🏆 Топ игроков" },
    { command: "daily", description: "🎁 Бонус" },
    { command: "donate", description: "⭐ Премиум" },
    { command: "ref", description: "🔗 Реферальная ссылка" },
    { command: "balance", description: "💰 Баланс" },
    { command: "promo", description: "🎟 Промокод" },
    { command: "pay", description: "💸 Перевод" },
    { command: "rob", description: "🔪 Ограбить" },
    { command: "topworld", description: "🌍 Мировой топ" },
    { command: "top_ref", description: "📊 Топ рефералов" },
    { command: "gift_open", description: "🎁 Открыть подарок" },
    { command: "business_shop", description: "🏭 Бизнесы" },
    { command: "my_buss", description: "📈 Мои бизнесы" },
    { command: "collect", description: "💵 Собрать прибыль" },
    { command: "si", description: "🔍 Поиск предметов" },
    { command: "items", description: "🎒 Инвентарь" },
    { command: "sell", description: "💎 Продать" },
    { command: "market", description: "🏪 Биржа предметов" },
    { command: "sell_market", description: "📤 Выставить на биржу" },
    { command: "my_listings", description: "📋 Мои лоты" },
    { command: "case", description: "📦 Кейсы" },
    { command: "clan", description: "🏰 Клан" },
    { command: "clans", description: "🏆 Топ кланов" },
    { command: "clan_create", description: "⚔️ Создать клан" },
    { command: "clan_join", description: "🚪 Вступить" },
    { command: "clan_leave", description: "🚶 Покинуть клан" },
    { command: "roulette", description: "🎲 Рулетка" },
  ];

  try {
    await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    console.log("Bot commands set successfully");
  } catch (error) {
    console.error("Error setting bot commands:", error);
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

// Helper function to check if update was already processed (using database)
async function isUpdateProcessed(supabase: any, updateId: number): Promise<boolean> {
  const { data } = await supabase
    .from("squid_processed_updates")
    .select("update_id")
    .eq("update_id", updateId)
    .single();
  return !!data;
}

async function markUpdateProcessed(supabase: any, updateId: number): Promise<void> {
  await supabase.from("squid_processed_updates").upsert({ update_id: updateId });
  
  // Clean up old entries (older than 1 hour) to prevent table bloat
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabase.from("squid_processed_updates").delete().lt("processed_at", oneHourAgo);
}

// Secondary deduplication for broadcast commands using message_id
// This prevents duplicates when Telegram sends same message with different update_ids
const broadcastProcessedMessages = new Set<string>();

function isBroadcastProcessed(chatId: number, messageId: number): boolean {
  const key = `${chatId}_${messageId}`;
  if (broadcastProcessedMessages.has(key)) {
    return true;
  }
  broadcastProcessedMessages.add(key);
  // Keep set size manageable
  if (broadcastProcessedMessages.size > 500) {
    const entries = Array.from(broadcastProcessedMessages);
    entries.slice(0, 250).forEach(k => broadcastProcessedMessages.delete(k));
  }
  return false;
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

    const update: TelegramUpdate & { update_id?: number } = await req.json();
    console.log("Received update:", JSON.stringify(update));
    
    // Deduplicate updates using database to prevent double processing across serverless instances
    if (update.update_id) {
      const alreadyProcessed = await isUpdateProcessed(supabaseClient, update.update_id);
      if (alreadyProcessed) {
        console.log(`Skipping duplicate update_id: ${update.update_id}`);
        return new Response("OK", { headers: corsHeaders });
      }
      await markUpdateProcessed(supabaseClient, update.update_id);
    }

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
          `🔫 <b>Русская Рулетка (Buckshot Roulette)</b>\n\n` +
          `Правила:\n` +
          `• В барабане смешаны холостые и боевые патроны\n` +
          `• Игроки по очереди выбирают: стрелять в себя или в противника\n` +
          `• Выстрел в себя холостым = ещё один ход\n` +
          `• Выстрел в противника боевым = урон\n` +
          `• Проигравший тот, у кого закончились жизни\n\n` +
          `<b>Чтобы вызвать на дуэль:</b>\n` +
          `<code>/challenge [ставка]</code> — ответом на сообщение\n` +
          `<code>/challenge [ID] [ставка]</code> — напрямую\n\n` +
          `🎮 Работает и в беседах с инлайн-кнопками!`,
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

        // Generate shells for Buckshot Roulette: 2-4 live + 2-4 blank = 4-8 total
        const liveCount = Math.floor(Math.random() * 3) + 2; // 2-4 боевых
        const blankCount = Math.floor(Math.random() * 3) + 2; // 2-4 холостых
        const shells: ("live" | "blank")[] = [
          ...Array(liveCount).fill("live"),
          ...Array(blankCount).fill("blank"),
        ];
        // Shuffle shells
        for (let i = shells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shells[i], shells[j]] = [shells[j], shells[i]];
        }

        // Initialize Buckshot Roulette game - preserve game_chat_id
        const prevGameData = session.game_data as any;
        const gameChatId = prevGameData?.game_chat_id || chatId;
        const gameData = {
          player1_hp: 3,
          player2_hp: 3,
          current_turn: "player1",
          shells: shells,
          shell_index: 0,
          initial_live: liveCount,
          initial_blank: blankCount,
          moves: [],
          game_chat_id: gameChatId,
          player1_telegram_id: player1TgId,
          player2_telegram_id: from.id,
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
        const player1TgId = (session.player1 as any).telegram_id;

        const shellInfo = `🔴 Боевых: ${liveCount} | ⚪ Холостых: ${blankCount}`;
        const gameInfo = 
          `🔫 <b>РУССКАЯ РУЛЕТКА</b>\n\n` +
          `👤 ${player1Name} VS ${player2Name}\n` +
          `💰 Ставка: ${session.bet_amount.toLocaleString()} монет\n\n` +
          `📦 В барабане ${shells.length} патронов:\n${shellInfo}\n\n` +
          `❤️ HP ${player1Name}: ${gameData.player1_hp}\n` +
          `❤️ HP ${player2Name}: ${gameData.player2_hp}`;

        // Send game message with buttons in the same chat where the game is happening
        await editMessage(
          chatId,
          message!.message_id,
          gameInfo + `\n\n🎯 Ход игрока ${player1Name}! Выбери действие:`,
          {
            inline_keyboard: [
              [
                { text: "🔫 Стрелять в себя", callback_data: `br_shoot_self_${sessionId}_p1_u${player1TgId}` },
                { text: "💀 Стрелять в противника", callback_data: `br_shoot_enemy_${sessionId}_p1_u${player1TgId}` },
              ],
            ],
          },
        );
      } else if (data.startsWith("br_shoot_")) {
        // Buckshot Roulette - shooting logic
        const brParts = data.split("_");
        const brAction = brParts[2]; // "self" or "enemy"
        const brSessionId = brParts[3];
        const brPlayerNum = brParts[4]; // p1 or p2

        const { data: brSession } = await supabaseClient
          .from("squid_game_sessions")
          .select(
            "*, player1:squid_players!player1_id(telegram_id, first_name), player2:squid_players!player2_id(telegram_id, first_name)",
          )
          .eq("id", brSessionId)
          .eq("status", "active")
          .single();

        if (!brSession) {
          await answerCallbackQuery(callbackId, "Игра не найдена или уже завершена");
          return new Response("OK", { headers: corsHeaders });
        }

        const brGameData = brSession.game_data as any;

        // Verify it's this player's turn
        const brExpectedTurn = brPlayerNum === "p1" ? "player1" : "player2";
        if (brGameData.current_turn !== brExpectedTurn) {
          await answerCallbackQuery(callbackId, "Не твой ход!");
          return new Response("OK", { headers: corsHeaders });
        }

        const brP1Name = (brSession.player1 as any).first_name;
        const brP2Name = (brSession.player2 as any).first_name;
        const brP1TgId = (brSession.player1 as any).telegram_id;
        const brP2TgId = (brSession.player2 as any).telegram_id;

        // Get current shell
        const brCurrentShell = brGameData.shells[brGameData.shell_index];
        brGameData.shell_index++;

        let brShotResult = "";
        let brExtraTurn = false;
        let brGameOver = false;
        let brWinnerId: string | null = null;
        let brWinnerName = "";
        let brLoserId: string | null = null;

        if (brAction === "self") {
          if (brCurrentShell === "live") {
            if (brPlayerNum === "p1") {
              brGameData.player1_hp -= 1;
              brShotResult = `💥 ${brP1Name} выстрелил в себя — <b>БОЕВОЙ!</b> (-1 HP)`;
            } else {
              brGameData.player2_hp -= 1;
              brShotResult = `💥 ${brP2Name} выстрелил в себя — <b>БОЕВОЙ!</b> (-1 HP)`;
            }
            brGameData.current_turn = brGameData.current_turn === "player1" ? "player2" : "player1";
          } else {
            brShotResult = brPlayerNum === "p1" 
              ? `💨 ${brP1Name} выстрелил в себя — <b>холостой!</b> Ещё один ход!`
              : `💨 ${brP2Name} выстрелил в себя — <b>холостой!</b> Ещё один ход!`;
            brExtraTurn = true;
          }
        } else {
          if (brCurrentShell === "live") {
            if (brPlayerNum === "p1") {
              brGameData.player2_hp -= 1;
              brShotResult = `💥 ${brP1Name} выстрелил в ${brP2Name} — <b>БОЕВОЙ!</b> (-1 HP)`;
            } else {
              brGameData.player1_hp -= 1;
              brShotResult = `💥 ${brP2Name} выстрелил в ${brP1Name} — <b>БОЕВОЙ!</b> (-1 HP)`;
            }
          } else {
            brShotResult = brPlayerNum === "p1"
              ? `💨 ${brP1Name} выстрелил в ${brP2Name} — <b>холостой!</b>`
              : `💨 ${brP2Name} выстрелил в ${brP1Name} — <b>холостой!</b>`;
          }
          brGameData.current_turn = brGameData.current_turn === "player1" ? "player2" : "player1";
        }

        brGameData.moves.push({ player: brPlayerNum, action: brAction, shell: brCurrentShell });

        if (brGameData.player1_hp <= 0) {
          brGameOver = true;
          brWinnerId = brSession.player2_id;
          brLoserId = brSession.player1_id;
          brWinnerName = brP2Name;
        } else if (brGameData.player2_hp <= 0) {
          brGameOver = true;
          brWinnerId = brSession.player1_id;
          brLoserId = brSession.player2_id;
          brWinnerName = brP1Name;
        }

        // Reload if barrel is empty
        if (!brGameOver && brGameData.shell_index >= brGameData.shells.length) {
          const newLive = Math.floor(Math.random() * 3) + 2;
          const newBlank = Math.floor(Math.random() * 3) + 2;
          const newShellsArr: ("live" | "blank")[] = [
            ...Array(newLive).fill("live"),
            ...Array(newBlank).fill("blank"),
          ];
          for (let i = newShellsArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newShellsArr[i], newShellsArr[j]] = [newShellsArr[j], newShellsArr[i]];
          }
          brGameData.shells = newShellsArr;
          brGameData.shell_index = 0;
          brGameData.initial_live = newLive;
          brGameData.initial_blank = newBlank;
          brShotResult += `\n\n🔄 <b>Перезарядка!</b>\n📦 Новый барабан: 🔴 ${newLive} боевых | ⚪ ${newBlank} холостых`;
        }

        if (brGameOver) {
          const brWinAmount = brSession.bet_amount * 2;

          await supabaseClient
            .from("squid_game_sessions")
            .update({ status: "finished", winner_id: brWinnerId, finished_at: new Date().toISOString() })
            .eq("id", brSessionId);

          const { data: brWinnerData } = await supabaseClient
            .from("squid_players")
            .select("balance, total_wins")
            .eq("id", brWinnerId)
            .single();

          await supabaseClient
            .from("squid_players")
            .update({
              balance: (brWinnerData?.balance || 0) + brWinAmount,
              total_wins: (brWinnerData?.total_wins || 0) + 1,
            })
            .eq("id", brWinnerId);

          const { data: brLoserData } = await supabaseClient
            .from("squid_players")
            .select("total_losses")
            .eq("id", brLoserId)
            .single();

          await supabaseClient
            .from("squid_players")
            .update({ total_losses: (brLoserData?.total_losses || 0) + 1 })
            .eq("id", brLoserId);

          const brEndMessage = 
            `🔫 <b>ИГРА ОКОНЧЕНА!</b>\n\n` +
            `${brShotResult}\n\n` +
            `🏆 Победитель: <b>${brWinnerName}</b>\n` +
            `💰 Выигрыш: ${brWinAmount.toLocaleString()} монет`;

          await sendMessage(brP1TgId, brEndMessage);
          await sendMessage(brP2TgId, brEndMessage);
        } else {
          await supabaseClient.from("squid_game_sessions").update({ game_data: brGameData }).eq("id", brSessionId);

          const brRemaining = brGameData.shells.slice(brGameData.shell_index);
          const brRemLive = brRemaining.filter((s: string) => s === "live").length;
          const brRemBlank = brRemaining.filter((s: string) => s === "blank").length;

          const brShellStatus = `📦 Осталось: 🔴 ${brRemLive} боевых | ⚪ ${brRemBlank} холостых`;

          const brNextIsP1 = brGameData.current_turn === "player1";
          const brNextPlayerId = brNextIsP1 ? brP1TgId : brP2TgId;
          const brNextPlayerName = brNextIsP1 ? brP1Name : brP2Name;
          const brNextPlayerNum = brNextIsP1 ? "p1" : "p2";

          const brStatusMsg = 
            `🔫 <b>Русская Рулетка</b>\n\n` +
            `${brShotResult}\n\n` +
            `❤️ HP ${brP1Name}: ${brGameData.player1_hp}\n` +
            `❤️ HP ${brP2Name}: ${brGameData.player2_hp}\n\n` +
            brShellStatus;

          if (brExtraTurn) {
            // Same player gets another turn - show buttons for them in same chat
            await editMessage(
              chatId,
              message!.message_id,
              brStatusMsg + `\n\n🎯 Ход игрока ${brPlayerNum === "p1" ? brP1Name : brP2Name} снова!`,
              {
                inline_keyboard: [
                  [
                    { text: "🔫 Стрелять в себя", callback_data: `br_shoot_self_${brSessionId}_${brPlayerNum}_u${from.id}` },
                    { text: "💀 Стрелять в противника", callback_data: `br_shoot_enemy_${brSessionId}_${brPlayerNum}_u${from.id}` },
                  ],
                ],
              },
            );
          } else {
            // Next player's turn - show buttons for them in same chat
            await editMessage(
              chatId,
              message!.message_id,
              brStatusMsg + `\n\n🎯 Ход игрока ${brNextPlayerName}!`,
              {
                inline_keyboard: [
                  [
                    { text: "🔫 Стрелять в себя", callback_data: `br_shoot_self_${brSessionId}_${brNextPlayerNum}_u${brNextPlayerId}` },
                    { text: "💀 Стрелять в противника", callback_data: `br_shoot_enemy_${brSessionId}_${brNextPlayerNum}_u${brNextPlayerId}` },
                  ],
                ],
              },
            );
          }
        }
      } else if (data.startsWith("cancel_listing_")) {
        // Cancel a marketplace listing
        const listingId = data.split("_u")[0].replace("cancel_listing_", "");
        
        const { data: listing } = await supabaseClient
          .from("squid_item_marketplace")
          .select("*")
          .eq("id", listingId)
          .single();

        if (!listing) {
          await answerCallbackQuery(callbackId, "Лот не найден или уже продан");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (!player || listing.seller_id !== player.id) {
          await answerCallbackQuery(callbackId, "Это не твой лот!");
          return new Response("OK", { headers: corsHeaders });
        }

        // Return item to inventory
        await supabaseClient.from("squid_player_items").insert({
          player_id: player.id,
          item_name: listing.item_name,
          item_rarity: listing.item_rarity,
          item_icon: listing.item_icon,
          sell_price: Math.floor(listing.price * 0.7),
        });

        // Remove from marketplace
        await supabaseClient.from("squid_item_marketplace").delete().eq("id", listingId);

        await editMessage(
          chatId,
          message!.message_id,
          `✅ Лот снят с биржи!\n\n${listing.item_icon || "📦"} ${listing.item_name} возвращён в инвентарь.`,
        );
      } else if (data === "open_casino") {
        await sendMessage(
          chatId,
          `🎰 <b>Веб-казино</b>\n\n🎡 Рулетка • 💣 Мины • 🪜 Лестница • 🎁 Джекпот • 📦 Кейсы\n\nНажми кнопку чтобы открыть:`,
          {
            inline_keyboard: [
              [{ text: "🎮 Открыть казино", web_app: { url: "https://punelittley.github.io/fashion-nest-creator/casino/" } }],
            ],
          },
        );
      } else if (data === "main_menu") {
        await editMessage(
          chatId,
          message!.message_id,
          `🦑 <b>Squid Game Bot</b>\n\n🎮 Выбери игру или используй /profile для просмотра профиля:`,
          {
            inline_keyboard: [
              [{ text: "🍬 Dalgona Challenge", callback_data: "play_dalgona" }],
              [{ text: "🌉 Стеклянный мост", callback_data: "play_glass_bridge" }],
              [{ text: "🔫 Русская рулетка (PvP)", callback_data: "play_squid_pvp" }],
              [{ text: "👤 Мой профиль", callback_data: "profile" }],
              [{ text: "🎰 Казино", callback_data: "open_casino" }],
            ],
          },
        );
      } else if (data === "profile") {
        // Full profile via callback
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "Профиль не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: clanMember } = await supabaseClient
          .from("squid_clan_members")
          .select("clan:squid_clans(name)")
          .eq("player_id", player.id)
          .single();

        const { data: businesses } = await supabaseClient
          .from("squid_player_businesses")
          .select("business_type, upgrade_level")
          .eq("player_id", player.id);

        const { count: itemsCount } = await supabaseClient
          .from("squid_player_items")
          .select("*", { count: "exact", head: true })
          .eq("player_id", player.id);

        const businessNames: Record<string, string> = {
          mask_factory: "🏭 Фабрика масок",
          vip_casino: "🎰 VIP Казино",
        };

        const businessList = businesses?.length
          ? businesses.map((b) => `${businessNames[b.business_type] || b.business_type} (ур. ${b.upgrade_level})`).join("\n")
          : "Нет бизнесов";

        const clanName = (clanMember?.clan as any)?.name || "Нет клана";
        const prefix = player.prefix || "Нет";
        const isPremium = player.is_premium && player.premium_expires_at && new Date(player.premium_expires_at) > new Date();

        const profileText = 
          `👤 <b>ПРОФИЛЬ</b>\n\n` +
          `┌ 🆔 ID: <code>${player.telegram_id}</code>\n` +
          `├ 📛 Имя: ${player.first_name || "Игрок"}\n` +
          `├ 🏷 Префикс: ${prefix}\n` +
          `├ ⭐ Премиум: ${isPremium ? "✅ Активен" : "❌ Нет"}\n` +
          `└ 🏰 Клан: ${clanName}\n\n` +
          `💰 <b>ЭКОНОМИКА</b>\n` +
          `┌ 💵 Баланс: ${(player.balance || 0).toLocaleString()} монет\n` +
          `├ 🎁 Подарков: ${player.gift_count || 0}\n` +
          `├ 👥 Рефералов: ${player.referral_count || 0}\n` +
          `└ 🎒 Предметов: ${itemsCount || 0}\n\n` +
          `📊 <b>СТАТИСТИКА</b>\n` +
          `┌ ✅ Выиграно: ${(player.total_wins || 0).toLocaleString()} монет\n` +
          `└ ❌ Проиграно: ${(player.total_losses || 0).toLocaleString()} монет\n\n` +
          `🏭 <b>БИЗНЕСЫ</b>\n${businessList}\n\n` +
          `📅 Регистрация: ${new Date(player.created_at || "").toLocaleDateString("ru-RU")}`;

        await editMessage(
          chatId,
          message!.message_id,
          profileText,
          {
            inline_keyboard: [
              [
                { text: "🎰 Казино", callback_data: "open_casino" },
                { text: "🛒 Магазин", callback_data: "shop_menu" },
              ],
              [
                { text: "🎒 Инвентарь", callback_data: "show_items" },
                { text: "🏭 Бизнесы", callback_data: "show_businesses" },
              ],
              [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
            ],
          },
        );
      } else if (data === "shop_menu") {
        await editMessage(
          chatId,
          message!.message_id,
          `🛒 <b>Магазин</b>\n\nВыбери раздел:`,
          {
            inline_keyboard: [
              [{ text: "🏷 Префиксы", callback_data: `shop_prefixes_u${from.id}` }],
              [{ text: "📦 Кейсы", callback_data: "open_casino" }],
              [{ text: "🏭 Бизнесы", callback_data: "show_businesses" }],
              [{ text: "⬅️ Назад", callback_data: "profile" }],
            ],
          },
        );
      } else if (data === "show_items") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: items } = await supabaseClient
          .from("squid_player_items")
          .select("*")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!items || items.length === 0) {
          await editMessage(
            chatId,
            message!.message_id,
            `🎒 <b>Инвентарь</b>\n\n📭 Инвентарь пуст.\n\nИспользуй /si для поиска предметов или открой кейсы в казино.`,
            {
              inline_keyboard: [
                [{ text: "🎰 Казино", callback_data: "open_casino" }],
                [{ text: "⬅️ Назад", callback_data: "profile" }],
              ],
            },
          );
        } else {
          const itemsList = items.map((item, i) => `${i + 1}. ${item.item_icon || "📦"} ${item.item_name} - ${item.sell_price.toLocaleString()} монет`).join("\n");
          await editMessage(
            chatId,
            message!.message_id,
            `🎒 <b>Инвентарь</b>\n\n${itemsList}\n\nИспользуй /sell [номер] для продажи`,
            {
              inline_keyboard: [
                [{ text: "💰 Продать всё", callback_data: `sell_all_items_u${from.id}` }],
                [{ text: "⬅️ Назад", callback_data: "profile" }],
              ],
            },
          );
        }
      } else if (data === "show_businesses") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id, balance")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: businesses } = await supabaseClient
          .from("squid_player_businesses")
          .select("*")
          .eq("player_id", player.id);

        const businessNames: Record<string, string> = {
          mask_factory: "🏭 Фабрика масок",
          vip_casino: "🎰 VIP Казино",
        };
        const businessIncomes: Record<string, number> = {
          mask_factory: 5000,
          vip_casino: 15000,
        };

        let businessText = `🏭 <b>Бизнесы</b>\n\n💰 Баланс: ${player.balance.toLocaleString()} монет\n\n`;

        if (!businesses || businesses.length === 0) {
          businessText += `У тебя нет бизнесов.\n\n<b>Доступные бизнесы:</b>\n🏭 Фабрика масок - 200,000 монет (5,000/час)\n🎰 VIP Казино - 500,000 монет (15,000/час)`;
        } else {
          businesses.forEach((b) => {
            const baseIncome = businessIncomes[b.business_type] || 5000;
            const income = baseIncome * b.upgrade_level;
            businessText += `${businessNames[b.business_type] || b.business_type}\nУровень: ${b.upgrade_level} | Доход: ${income.toLocaleString()}/час\n\n`;
          });
        }

        await editMessage(
          chatId,
          message!.message_id,
          businessText,
          {
            inline_keyboard: [
              [{ text: "🛒 Магазин бизнесов", callback_data: `business_shop_u${from.id}` }],
              [{ text: "💵 Собрать прибыль", callback_data: `collect_profit_u${from.id}` }],
              [{ text: "⬅️ Назад", callback_data: "profile" }],
            ],
          },
        );
      } else if (data === "show_ref") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("telegram_id, referral_count, gift_count")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await answerCallbackQuery(callbackId, "Игрок не найден");
          return new Response("OK", { headers: corsHeaders });
        }

        const refLink = `https://t.me/squid_roulette_bot?start=ref_${player.telegram_id}`;
        await editMessage(
          chatId,
          message!.message_id,
          `🔗 <b>Реферальная программа</b>\n\n👥 Приведено рефералов: ${player.referral_count || 0}\n🎁 Получено подарков: ${player.gift_count || 0}\n\n<b>Твоя ссылка:</b>\n<code>${refLink}</code>\n\nЗа каждого приглашённого ты получишь 🎁 подарок!`,
          {
            inline_keyboard: [
              [{ text: "🎁 Открыть подарок", callback_data: `open_gift_u${from.id}` }],
              [{ text: "⬅️ Назад", callback_data: "profile" }],
            ],
          },
        );
      }
    }

    // Handle text commands
    if (update.message) {
      const { chat, from, text } = update.message;

      if (!chat || !from) {
        return new Response("OK", { headers: corsHeaders });
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

      // Track chat activity
      if (chat.type !== "private") {
        await supabaseClient.from("squid_bot_chats").upsert(
          {
            chat_id: chat.id,
            chat_type: chat.type || "group",
            chat_title: chat.title,
            chat_username: chat.username,
            last_activity: new Date().toISOString(),
          },
          { onConflict: "chat_id" },
        );

        // Track player-chat relationship
        const { data: playerData } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (playerData) {
          await supabaseClient.from("squid_player_chats").upsert(
            {
              player_id: playerData.id,
              chat_id: chat.id,
              last_message_at: new Date().toISOString(),
            },
            { onConflict: "player_id,chat_id" },
          );
        }
      }

      // Skip if no text
      if (!text) {
        return new Response("OK", { headers: corsHeaders });
      }

      if (text === "/start" || text.startsWith("/start ")) {
        // Set bot commands for autocomplete menu
        await setBotCommands();
        
        // Welcome message with game selection
        await sendMessage(
          chat.id,
          `🦑 <b>Добро пожаловать в Squid Game Bot!</b>\n\n🎮 Выбери игру или используй /profile для просмотра профиля:`,
          {
            inline_keyboard: [
              [{ text: "🍬 Dalgona Challenge", callback_data: "play_dalgona" }],
              [{ text: "🌉 Стеклянный мост", callback_data: "play_glass_bridge" }],
              [{ text: "🔫 Русская рулетка (PvP)", callback_data: "play_squid_pvp" }],
              [{ text: "👤 Мой профиль", callback_data: "profile" }],
              [{ text: "🎰 Казино", callback_data: "open_casino" }],
            ],
          },
        );
      } else if (text === "/profile") {
        // Full profile with all user info
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Профиль не найден. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }

        // Get clan info
        const { data: clanMember } = await supabaseClient
          .from("squid_clan_members")
          .select("clan:squid_clans(name)")
          .eq("player_id", player.id)
          .single();

        // Get businesses
        const { data: businesses } = await supabaseClient
          .from("squid_player_businesses")
          .select("business_type, upgrade_level")
          .eq("player_id", player.id);

        // Get items count
        const { count: itemsCount } = await supabaseClient
          .from("squid_player_items")
          .select("*", { count: "exact", head: true })
          .eq("player_id", player.id);

        const businessNames: Record<string, string> = {
          mask_factory: "🏭 Фабрика масок",
          vip_casino: "🎰 VIP Казино",
        };

        const businessList = businesses?.length
          ? businesses.map((b) => `${businessNames[b.business_type] || b.business_type} (ур. ${b.upgrade_level})`).join("\n")
          : "Нет бизнесов";

        const clanName = (clanMember?.clan as any)?.name || "Нет клана";
        const prefix = player.prefix || "Нет";
        const isPremium = player.is_premium && player.premium_expires_at && new Date(player.premium_expires_at) > new Date();

        const profileText = 
          `👤 <b>ПРОФИЛЬ</b>\n\n` +
          `┌ 🆔 ID: <code>${player.telegram_id}</code>\n` +
          `├ 📛 Имя: ${player.first_name || "Игрок"}\n` +
          `├ 🏷 Префикс: ${prefix}\n` +
          `├ ⭐ Премиум: ${isPremium ? "✅ Активен" : "❌ Нет"}\n` +
          `└ 🏰 Клан: ${clanName}\n\n` +
          `💰 <b>ЭКОНОМИКА</b>\n` +
          `┌ 💵 Баланс: ${(player.balance || 0).toLocaleString()} монет\n` +
          `├ 🎁 Подарков: ${player.gift_count || 0}\n` +
          `├ 👥 Рефералов: ${player.referral_count || 0}\n` +
          `└ 🎒 Предметов: ${itemsCount || 0}\n\n` +
          `📊 <b>СТАТИСТИКА</b>\n` +
          `┌ ✅ Выиграно: ${(player.total_wins || 0).toLocaleString()} монет\n` +
          `└ ❌ Проиграно: ${(player.total_losses || 0).toLocaleString()} монет\n\n` +
          `🏭 <b>БИЗНЕСЫ</b>\n${businessList}\n\n` +
          `📅 Регистрация: ${new Date(player.created_at || "").toLocaleDateString("ru-RU")}`;

        await sendMessage(
          chat.id,
          profileText,
          {
            inline_keyboard: [
              [
                { text: "🎰 Казино", callback_data: "open_casino" },
                { text: "🛒 Магазин", callback_data: "shop_menu" },
              ],
              [
                { text: "🎒 Инвентарь", callback_data: "show_items" },
                { text: "🏭 Бизнесы", callback_data: "show_businesses" },
              ],
              [{ text: "🔗 Реферальная ссылка", callback_data: "show_ref" }],
            ],
          },
        );
      } else if (text === "/casino") {
        // Works in both private and group chats
        await sendMessage(
          chat.id,
          `🎰 <b>Веб-казино</b>\n\n🎡 Рулетка • 💣 Мины • 🪜 Лестница • 🎁 Джекпот\n\nНажми кнопку чтобы открыть:`,
          {
            inline_keyboard: [
              [{ text: "🎮 Открыть казино", web_app: { url: "https://punelittley.github.io/fashion-nest-creator/casino/" } }],
            ],
          },
        );
      } else if (text === "/help") {
        await sendMessage(
          chat.id,
          `📋 <b>Список команд</b>\n\n<b>🎮 Игры:</b>\n🍬 Dalgona Challenge - вырезай фигурки из печенья\n🌉 Стеклянный мост - пройди по опасному мосту\n🔫 Русская Рулетка (PvP) - дуэль с дробовиком\n\n<b>⚔️ Дуэли (Русская Рулетка):</b>\n/challenge [ставка] - ответь на сообщение игрока\n/challenge [ID] [ставка] - вызов по ID\nИнлайн-кнопки для принятия/отказа\nРаботает в беседах и ЛС!\n\n<b>💰 Команды:</b>\n/balance - проверить баланс\n/profile - твой профиль\n/daily - получить ежедневный бонус\n/promo [код] - использовать промокод\n/pay [ID] [сумма] - перевести монеты игроку\n/rob - ограбить игрока (раз в час)\n/top - топ 10 богатых игроков в чате\n/topworld - топ 10 богатых игроков глобально\n/shop - магазин префиксов\n/case - магазин кейсов\n/donate - премиум и донат\n\n<b>🔗 Рефералы:</b>\n/ref - твоя реферальная ссылка\n/top_ref - топ 10 по рефералам\n/gift_open - открыть подарок\n\n<b>🏭 Бизнес:</b>\n/business_shop - магазин бизнесов\n/my_buss - мои бизнесы и улучшения\n/collect - собрать прибыль (макс. 1 час)\n\n<b>📦 Предметы:</b>\n/si - искать предметы (раз в час)\n/items - показать инвентарь\n/sell [номер] - продать предмет\n/sell all - продать все предметы\n\n<b>🏪 Биржа:</b>\n/market - просмотр биржи\n/sell_market [номер] [цена] - выставить предмет\n/buy_market [номер] - купить с биржи\n/my_listings - мои лоты\n\n<b>🏰 Кланы:</b>\n/clan - информация о твоём клане\n/clans - список топ кланов\n/clan_create [название] - создать клан (500k)\n/clan_join [название] - вступить в клан\n/clan_leave - покинуть клан\n/clan_delete - удалить свой клан\n\n<b>🎲 Казино:</b>\n/casino - открыть веб-казино (Кейсы тоже тут!)\n🎰 Рулетка • 💣 Мины • 🪜 Лестница • 🎁 Джекпот • 🚀 Краш • 📦 Кейсы\n/roulette [цвет] [ставка] - сыграть в рулетку\nЦвета: red, black, green\n\n<b>ℹ️ Помощь:</b>\n/help - список всех команд`,
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
      } else if (text.startsWith("/challenge") && (text === "/challenge" || text.startsWith("/challenge "))) {
        // Support both /challenge ID bet and reply with /challenge bet
        const replyTo = update.message?.reply_to_message;
        const args = text.split(" ").filter(a => a.length > 0);
        
        let targetTelegramId: number | null = null;
        let betAmount: number | null = null;
        
        if (replyTo && replyTo.from) {
          // Reply mode: /challenge [ставка]
          targetTelegramId = replyTo.from.id;
          if (args.length >= 2) {
            betAmount = parseInt(args[1]);
          }
        } else {
          // Direct mode: /challenge [ID] [ставка]
          if (args.length >= 3) {
            targetTelegramId = parseInt(args[1]);
            betAmount = parseInt(args[2]);
          }
        }
        
        if (!targetTelegramId || !betAmount || isNaN(betAmount) || betAmount <= 0) {
          await sendMessage(
            chat.id, 
            "❌ <b>Формат команды:</b>\n\n" +
            "1️⃣ Ответь на сообщение игрока и напиши:\n<code>/challenge [ставка]</code>\n\n" +
            "2️⃣ Или напиши напрямую:\n<code>/challenge [Telegram_ID] [ставка]</code>\n\n" +
            "Например: /challenge 100 (в ответ на сообщение)\nИли: /challenge 123456789 100"
          );
          return new Response("OK", { headers: corsHeaders });
        }

        if (targetTelegramId === from.id) {
          await sendMessage(chat.id, "❌ Ты не можешь вызвать сам себя!");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: challenger } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name, prefix")
          .eq("telegram_id", from.id)
          .single();

        if (!challenger) {
          await sendMessage(chat.id, "❌ Ты не зарегистрирован. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }

        if (challenger.balance < betAmount) {
          await sendMessage(chat.id, `❌ Недостаточно монет для ставки!\n\nТвой баланс: ${challenger.balance.toLocaleString()} монет\nНужно: ${betAmount.toLocaleString()} монет`);
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name, prefix, telegram_id")
          .eq("telegram_id", targetTelegramId)
          .single();

        if (!target) {
          await sendMessage(chat.id, "❌ Игрок не найден! Он должен сначала использовать /start в боте.");
          return new Response("OK", { headers: corsHeaders });
        }

        if (target.balance < betAmount) {
          await sendMessage(chat.id, `❌ У противника недостаточно монет!\n\nЕго баланс: ${target.balance.toLocaleString()} монет\nНужно: ${betAmount.toLocaleString()} монет`);
          return new Response("OK", { headers: corsHeaders });
        }

        // Create game session - store chat_id for group play
        const { data: session, error: sessionError } = await supabaseClient
          .from("squid_game_sessions")
          .insert({
            player1_id: challenger.id,
            game_type: "buckshot_roulette",
            bet_amount: betAmount,
            status: "waiting",
            game_data: { challenger_telegram_id: from.id, target_telegram_id: targetTelegramId, game_chat_id: chat.id }
          })
          .select()
          .single();

        if (sessionError || !session) {
          console.error("Error creating challenge session:", sessionError);
          await sendMessage(chat.id, "❌ Ошибка при создании вызова. Попробуй позже.");
          return new Response("OK", { headers: corsHeaders });
        }

        const challengerName = challenger.prefix 
          ? `[${challenger.prefix}] ${challenger.first_name}` 
          : challenger.first_name;
        
        const targetName = target.prefix 
          ? `[${target.prefix}] ${target.first_name}` 
          : target.first_name;

        await sendMessage(chat.id, `✅ Вызов на дуэль отправлен игроку ${targetName}!\n\n💰 Ставка: ${betAmount.toLocaleString()} монет\n⏳ Ожидание ответа...`);

        // Send challenge to target player - in same chat if it's a group, or DM if private
        const challengeMessage = 
          `🔫 <b>ВЫЗОВ НА РУССКУЮ РУЛЕТКУ!</b> 🔫\n\n` +
          `👤 ${challengerName} вызывает тебя на дуэль с дробовиком!\n\n` +
          `💰 Ставка: <b>${betAmount.toLocaleString()} монет</b>\n` +
          `🎮 Игра: Buckshot Roulette\n` +
          `❤️ У каждого по 3 HP\n` +
          `🔴 Боевые и ⚪ холостые патроны в барабане\n\n` +
          `Принимаешь вызов?`;
        
        const challengeButtons = {
          inline_keyboard: [
            [
              { text: "✅ Принять вызов", callback_data: `accept_challenge_${session.id}_u${targetTelegramId}` },
              { text: "❌ Отказаться", callback_data: `decline_challenge_${session.id}_u${targetTelegramId}` }
            ],
          ],
        };

        // Always send in same chat (group or private)
        await sendMessage(chat.id, challengeMessage, challengeButtons);
      } else if (text === "/accept") {
        // Accept challenge by replying to the challenge message
        const replyTo = update.message?.reply_to_message;
        
        if (!replyTo) {
          await sendMessage(chat.id, "❌ Ответь на сообщение с вызовом на дуэль, чтобы принять его!");
          return new Response("OK", { headers: corsHeaders });
        }
        
        // Find active challenge for this player
        const { data: playerData } = await supabaseClient
          .from("squid_players")
          .select("id, balance, first_name")
          .eq("telegram_id", from.id)
          .single();
          
        if (!playerData) {
          await sendMessage(chat.id, "❌ Ты не зарегистрирован. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }
        
        // Find waiting challenge where this player is the target
        const { data: sessions } = await supabaseClient
          .from("squid_game_sessions")
          .select("*, player1:squid_players!player1_id(telegram_id, first_name)")
          .eq("status", "waiting")
          .eq("game_type", "buckshot_roulette");
          
        // Find session where this player was challenged
        const session = sessions?.find((s: any) => {
          const gameData = s.game_data as any;
          return gameData?.target_telegram_id === from.id;
        });
        
        if (!session) {
          await sendMessage(chat.id, "❌ Активный вызов не найден!");
          return new Response("OK", { headers: corsHeaders });
        }
        
        if (playerData.balance < session.bet_amount) {
          await sendMessage(chat.id, `❌ Недостаточно монет! Нужно ${session.bet_amount.toLocaleString()} монет.`);
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
          .update({ balance: playerData.balance - session.bet_amount })
          .eq("id", playerData.id);
          
        await supabaseClient
          .from("squid_players")
          .update({ balance: (player1Data?.balance || 0) - session.bet_amount })
          .eq("id", session.player1_id);
          
        // Generate shells for Buckshot Roulette: 2-4 live + 2-4 blank = 4-8 total
        const acceptLiveCount = Math.floor(Math.random() * 3) + 2; // 2-4 боевых
        const acceptBlankCount = Math.floor(Math.random() * 3) + 2; // 2-4 холостых
        const acceptShells: ("live" | "blank")[] = [
          ...Array(acceptLiveCount).fill("live"),
          ...Array(acceptBlankCount).fill("blank"),
        ];
        // Shuffle shells
        for (let i = acceptShells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [acceptShells[i], acceptShells[j]] = [acceptShells[j], acceptShells[i]];
        }

        // Initialize Buckshot Roulette game
        const gameData = {
          player1_hp: 3,
          player2_hp: 3,
          current_turn: "player1",
          shells: acceptShells,
          shell_index: 0,
          initial_live: acceptLiveCount,
          initial_blank: acceptBlankCount,
          moves: [],
          game_chat_id: chat.id,
          player1_telegram_id: player1TgId,
          player2_telegram_id: from.id,
        };
        
        await supabaseClient
          .from("squid_game_sessions")
          .update({
            player2_id: playerData.id,
            status: "active",
            game_data: gameData,
          })
          .eq("id", session.id);
          
        const player1Name = (session.player1 as any).first_name;
        const player2Name = playerData.first_name;
        const player1TgId = (session.player1 as any).telegram_id;
        
        const acceptShellInfo = `🔴 Боевых: ${acceptLiveCount} | ⚪ Холостых: ${acceptBlankCount}`;
        const acceptGameInfo = 
          `🔫 <b>РУССКАЯ РУЛЕТКА</b>\n\n` +
          `👤 ${player1Name} VS ${player2Name}\n` +
          `💰 Ставка: ${session.bet_amount.toLocaleString()} монет\n\n` +
          `📦 В барабане ${acceptShells.length} патронов:\n${acceptShellInfo}\n\n` +
          `❤️ HP ${player1Name}: ${gameData.player1_hp}\n` +
          `❤️ HP ${player2Name}: ${gameData.player2_hp}`;

        // Send game with buttons in the same chat
        await sendMessage(
          chat.id,
          acceptGameInfo + `\n\n🎯 Ход игрока ${player1Name}! Выбери действие:`,
          {
            inline_keyboard: [
              [
                { text: "🔫 Стрелять в себя", callback_data: `br_shoot_self_${session.id}_p1_u${player1TgId}` },
                { text: "💀 Стрелять в противника", callback_data: `br_shoot_enemy_${session.id}_p1_u${player1TgId}` },
              ],
            ],
          },
        );
      } else if (text === "/decline") {
        // Decline challenge
        const { data: playerData } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();
          
        if (!playerData) {
          await sendMessage(chat.id, "❌ Ты не зарегистрирован. Используй /start");
          return new Response("OK", { headers: corsHeaders });
        }
        
        // Find waiting challenge where this player is the target
        const { data: sessions } = await supabaseClient
          .from("squid_game_sessions")
          .select("*, player1:squid_players!player1_id(telegram_id, first_name)")
          .eq("status", "waiting")
          .eq("game_type", "buckshot_roulette");
          
        const session = sessions?.find((s: any) => {
          const gameData = s.game_data as any;
          return gameData?.target_telegram_id === from.id;
        });
        
        if (!session) {
          await sendMessage(chat.id, "❌ Активный вызов не найден!");
          return new Response("OK", { headers: corsHeaders });
        }
        
        await supabaseClient
          .from("squid_game_sessions")
          .update({ status: "cancelled" })
          .eq("id", session.id);
          
        const player1TgId = (session.player1 as any).telegram_id;
        await sendMessage(player1TgId, `❌ ${from.first_name} отказался от вызова.`);
        await sendMessage(chat.id, `❌ Ты отказался от вызова.`);
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
          `🎰 <b>Режим админа казино ${modeText}</b>\n\n${newMode ? "Теперь ты будешь всегда выигрывать в казино (включая веб-казино и джекпот)!" : "Обычный режим игры восстановлен."}`,
        );
      } else if (text.startsWith("/casino_down ")) {
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const targetId = parseInt(text.split(" ")[1]);
        if (isNaN(targetId)) {
          await sendMessage(chat.id, "❌ Формат: /casino_down [ID]");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: target } = await supabaseClient
          .from("squid_players")
          .select("id, first_name, casino_downgrade, telegram_id")
          .eq("telegram_id", targetId)
          .single();

        if (!target) {
          await sendMessage(chat.id, "❌ Игрок не найден!");
          return new Response("OK", { headers: corsHeaders });
        }

        const newDowngrade = target.casino_downgrade ? false : true;
        
        const { error: updateError } = await supabaseClient
          .from("squid_players")
          .update({ casino_downgrade: newDowngrade })
          .eq("telegram_id", targetId);

        if (updateError) {
          console.error("Error updating casino_downgrade:", updateError);
          await sendMessage(chat.id, `❌ Ошибка при обновлении: ${updateError.message}`);
          return new Response("OK", { headers: corsHeaders });
        }

        const statusText = newDowngrade ? "🔻 АКТИВИРОВАН РЕЖИМ ПОЛНОГО ПРОИГРЫША" : "✅ ВОССТАНОВЛЕНЫ";
        await sendMessage(
          chat.id,
          `🎰 <b>Шансы казино ${statusText}</b>\n\n👤 Игрок: ${target.first_name} (${targetId})\n${newDowngrade ? "⛔ Теперь игрок ГАРАНТИРОВАННО ПРОИГРЫВАЕТ во всех играх казино (100% loss)!" : "Шансы игрока восстановлены до нормальных."}`,
        );
        
        console.log(`Casino downgrade set to ${newDowngrade} for player ${targetId}`);
      } else if (text === "/clan_delete") {
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

        if (membership.role !== "owner") {
          await sendMessage(chat.id, "❌ Только владелец клана может его удалить!");
          return new Response("OK", { headers: corsHeaders });
        }

        const clan = membership.squid_clans;

        // Delete all clan members
        await supabaseClient
          .from("squid_clan_members")
          .delete()
          .eq("clan_id", clan.id);

        // Delete the clan
        await supabaseClient
          .from("squid_clans")
          .delete()
          .eq("id", clan.id);

        await sendMessage(
          chat.id,
          `✅ <b>Клан удалён!</b>\n\n🏰 Клан "${clan.name}" был расформирован.\n👥 Все ${clan.member_count} участников были исключены.`,
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
          `👑 <b>Команды администратора</b>\n\n<b>💰 Управление балансом:</b>\n/admin_add_coins [ID] [сумма] - добавить монеты\n/admin_set_balance [ID] [сумма] - установить баланс\n\n<b>✨ Префиксы:</b>\n/create_prefix [название] [цена] - создать префикс\n/prefix_delete [название] - удалить префикс\n/get_prefix [название] [ID] - выдать префикс\n/prefix_delete_player [ID] [название] - удалить префикс у игрока\n\n<b>🎟️ Промокоды:</b>\n/admin_create_promo [код] [сумма] [кол-во]\n/admin_delete_promo [код]\n\n<b>🎁 Подарки:</b>\n/gift [ID] [кол-во] - выдать подарки игроку\n/gift_all [кол-во] [текст] - подарки всем (можно прикрепить медиа)\n/remove_gifts [кол-во] - убрать подарки у всех игроков\n\n<b>📢 Рассылка:</b>\n/all [текст] - сообщение всем в ЛС\n/dep_all [сумма] [текст] - монеты + сообщение всем (можно прикрепить медиа)\n\n<b>🎰 Казино:</b>\n/casino_admin - режим всегда выигрывать (работает и в веб-казино)\n/casino_down [ID] - ухудшить шансы игроку\n\n<b>🏭 Бизнесы:</b>\n/admin_del_bus [ID] [тип] - удалить бизнес\n\n<b>⚙️ Управление ботом:</b>\n/off - выключить бот для всех\n/on - включить бот для всех\n\n<b>📊 Информация:</b>\n/servers - список чатов\n/admin_search [страница] - список игроков\n/admin_commands - эта справка`,
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
        // Secondary deduplication using message_id to prevent duplicate broadcasts
        const messageId = update.message?.message_id;
        if (messageId && isBroadcastProcessed(chat.id, messageId)) {
          console.log(`Skipping duplicate broadcast /all - chat:${chat.id} msg:${messageId}`);
          return new Response("OK", { headers: corsHeaders });
        }

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
      } else if (text.startsWith("/dep_all ") || (update.message?.caption?.startsWith("/dep_all ") && (update.message?.photo || update.message?.video || update.message?.animation))) {
        // Secondary deduplication using message_id to prevent duplicate broadcasts
        const messageId = update.message?.message_id;
        if (messageId && isBroadcastProcessed(chat.id, messageId)) {
          console.log(`Skipping duplicate broadcast /dep_all - chat:${chat.id} msg:${messageId}`);
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        // Check for attached media
        const hasPhoto = update.message?.photo && update.message.photo.length > 0;
        const hasVideo = !!update.message?.video;
        const hasAnimation = !!update.message?.animation;
        
        let mediaFileId: string | null = null;
        let mediaType: 'photo' | 'video' | 'animation' | null = null;
        
        if (hasPhoto && update.message?.photo) {
          mediaFileId = update.message.photo[update.message.photo.length - 1].file_id;
          mediaType = 'photo';
        } else if (hasVideo && update.message?.video) {
          mediaFileId = update.message.video.file_id;
          mediaType = 'video';
        } else if (hasAnimation && update.message?.animation) {
          mediaFileId = update.message.animation.file_id;
          mediaType = 'animation';
        }

        const commandText = (hasPhoto || hasVideo || hasAnimation) ? (update.message?.caption || "") : (text || "");
        const args = commandText.replace("/dep_all ", "").trim();
        const firstSpace = args.indexOf(" ");

        if (firstSpace === -1) {
          await sendMessage(chat.id, "❌ Формат: /dep_all [сумма] [текст]\n\n💡 Прикрепите фото/видео/GIF для рассылки с медиа!");
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
        const fullMessage = `🎁 <b>Подарок от создателя!</b>\n\n💰 Тебе начислено: ${amount.toLocaleString()} монет\n\n📢 ${messageText}`;

        for (const player of allPlayers) {
          try {
            await supabaseClient
              .from("squid_players")
              .update({ balance: player.balance + amount })
              .eq("id", player.id);

            const telegramId = Number(player.telegram_id);
            if (mediaFileId && mediaType) {
              await sendMediaByFileId(telegramId, mediaFileId, mediaType, fullMessage);
            } else {
              await sendMessage(telegramId, fullMessage);
            }
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
            `💵 Всего выдано: ${(sent * amount).toLocaleString()} монет` +
            (mediaFileId ? `\n📎 С прикреплённым медиа` : ""),
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

        // Item drop chances - REDUCED + Ultramythical
        const itemChance = Math.random() * 100;
        let itemFound: { name: string; rarity: string; sellPrice: number; icon?: string } | null = null;

        if (itemChance < 0.05) {
          // 0.05% - Золотой кубок Создателя (Ультрамифическая)
          itemFound = { name: "🏆 Золотой кубок Создателя", rarity: "Ультрамифическая", sellPrice: 500000, icon: "🏆" };
        } else if (itemChance < 0.15) {
          // 0.1% - Корона 001 (Ультрамифическая)
          itemFound = { name: "👑 Корона 001", rarity: "Ультрамифическая", sellPrice: 300000, icon: "👑" };
        } else if (itemChance < 0.65) {
          // 0.5% - Маска Фронтман (Мифическая)
          itemFound = { name: "🎭 Маска Фронтман", rarity: "Мифическая", sellPrice: 25000 };
        } else if (itemChance < 2.65) {
          // 2% - Карта VIP (Эпическая)
          itemFound = { name: "💳 Карта VIP", rarity: "Эпическая", sellPrice: 9000 };
        } else if (itemChance < 7.65) {
          // 5% - Маска квадрат (Раритет)
          itemFound = { name: "🟥 Маска квадрат", rarity: "Раритет", sellPrice: 5000 };
        } else if (itemChance < 17.65) {
          // 10% - Печенька Зонт (Обычная)
          itemFound = { name: "🍪 Печенька Зонт", rarity: "Обычная", sellPrice: 2000 };
        } else if (itemChance < 25.15) {
          // 7.5% - Зипка 456 (Обычная)
          itemFound = { name: "🧥 Зипка 456", rarity: "Обычная", sellPrice: 3000 };
        }
        // ~75% - nothing

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
            item_icon: itemFound.icon || null,
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
      } else if (text === "/market") {
        // Browse marketplace
        const { data: listings } = await supabaseClient
          .from("squid_item_marketplace")
          .select("*, seller:squid_players!seller_id(first_name, telegram_id)")
          .order("created_at", { ascending: false })
          .limit(20);

        if (!listings || listings.length === 0) {
          await sendMessage(chat.id, "🏪 <b>Биржа предметов</b>\n\n📭 Пока нет лотов на продажу.\n\nВыставь свой предмет: /sell_market [номер] [цена]");
          return new Response("OK", { headers: corsHeaders });
        }

        const rarityEmoji: Record<string, string> = {
          "Ультрамифическая": "🌟",
          "Мифическая": "🔮",
          "Эпическая": "💎",
          "Раритет": "🟣",
          "Обычная": "⚪",
        };

        let marketText = "🏪 <b>Биржа предметов</b>\n\n";
        listings.forEach((listing, index) => {
          const seller = (listing.seller as any);
          const rEmoji = rarityEmoji[listing.item_rarity] || "📦";
          marketText += `${index + 1}. ${listing.item_icon || rEmoji} <b>${listing.item_name}</b>\n`;
          marketText += `   ${rEmoji} ${listing.item_rarity} | 💰 ${listing.price.toLocaleString()} монет\n`;
          marketText += `   👤 ${seller?.first_name || "Неизвестно"}\n`;
          marketText += `   Купить: <code>/buy_market ${index + 1}</code>\n\n`;
        });

        marketText += "📤 Выставить: /sell_market [номер] [цена]\n📋 Мои лоты: /my_listings";

        // Store listing IDs in a temp way (we'll use index-based lookup)
        await sendMessage(chat.id, marketText);
      } else if (text.startsWith("/sell_market ")) {
        const args = text.split(" ");
        if (args.length !== 3) {
          await sendMessage(chat.id, "❌ Формат: /sell_market [номер предмета из /items] [цена]");
          return new Response("OK", { headers: corsHeaders });
        }

        const itemIndex = parseInt(args[1]) - 1;
        const price = parseInt(args[2]);

        if (isNaN(price) || price <= 0) {
          await sendMessage(chat.id, "❌ Цена должна быть положительным числом!");
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

        const { data: items } = await supabaseClient
          .from("squid_player_items")
          .select("*")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false });

        if (!items || items.length === 0 || itemIndex < 0 || itemIndex >= items.length) {
          await sendMessage(chat.id, "❌ Предмет не найден! Используй /items чтобы увидеть список.");
          return new Response("OK", { headers: corsHeaders });
        }

        const item = items[itemIndex];

        // Add to marketplace
        await supabaseClient.from("squid_item_marketplace").insert({
          item_id: item.id,
          item_name: item.item_name,
          item_rarity: item.item_rarity,
          item_icon: item.item_icon,
          item_source: "bot",
          price: price,
          seller_id: player.id,
        });

        // Remove from inventory
        await supabaseClient.from("squid_player_items").delete().eq("id", item.id);

        await sendMessage(
          chat.id,
          `✅ <b>Предмет выставлен на биржу!</b>\n\n${item.item_icon || "📦"} ${item.item_name}\n💰 Цена: ${price.toLocaleString()} монет\n\nУбрать с биржи: /my_listings`,
        );
      } else if (text.startsWith("/buy_market ")) {
        const listingIndex = parseInt(text.split(" ")[1]) - 1;

        if (isNaN(listingIndex) || listingIndex < 0) {
          await sendMessage(chat.id, "❌ Формат: /buy_market [номер из /market]");
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

        const { data: listings } = await supabaseClient
          .from("squid_item_marketplace")
          .select("*, seller:squid_players!seller_id(first_name, telegram_id, id, balance)")
          .order("created_at", { ascending: false })
          .limit(20);

        if (!listings || listingIndex >= listings.length) {
          await sendMessage(chat.id, "❌ Лот не найден! Используй /market");
          return new Response("OK", { headers: corsHeaders });
        }

        const listing = listings[listingIndex];
        const seller = listing.seller as any;

        if (seller?.id === player.id) {
          await sendMessage(chat.id, "❌ Ты не можешь купить свой же предмет!");
          return new Response("OK", { headers: corsHeaders });
        }

        if (player.balance < listing.price) {
          await sendMessage(chat.id, `❌ Недостаточно монет! Нужно: ${listing.price.toLocaleString()}, у тебя: ${player.balance.toLocaleString()}`);
          return new Response("OK", { headers: corsHeaders });
        }

        // Transfer money
        await supabaseClient
          .from("squid_players")
          .update({ balance: player.balance - listing.price })
          .eq("id", player.id);

        await supabaseClient
          .from("squid_players")
          .update({ balance: (seller?.balance || 0) + listing.price })
          .eq("id", seller?.id);

        // Add item to buyer's inventory
        await supabaseClient.from("squid_player_items").insert({
          player_id: player.id,
          item_name: listing.item_name,
          item_rarity: listing.item_rarity,
          item_icon: listing.item_icon,
          sell_price: Math.floor(listing.price * 0.7),
        });

        // Remove from marketplace
        await supabaseClient.from("squid_item_marketplace").delete().eq("id", listing.id);

        await sendMessage(
          chat.id,
          `✅ <b>Предмет куплен!</b>\n\n${listing.item_icon || "📦"} ${listing.item_name}\n💰 Цена: ${listing.price.toLocaleString()} монет\n💵 Баланс: ${(player.balance - listing.price).toLocaleString()} монет`,
        );

        // Notify seller
        if (seller?.telegram_id) {
          try {
            await sendMessage(
              seller.telegram_id,
              `💰 <b>Твой предмет продан!</b>\n\n${listing.item_icon || "📦"} ${listing.item_name}\n💰 +${listing.price.toLocaleString()} монет`,
            );
          } catch (e) { /* seller might have blocked bot */ }
        }
      } else if (text === "/my_listings") {
        const { data: player } = await supabaseClient
          .from("squid_players")
          .select("id")
          .eq("telegram_id", from.id)
          .single();

        if (!player) {
          await sendMessage(chat.id, "❌ Игрок не найден.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: listings } = await supabaseClient
          .from("squid_item_marketplace")
          .select("*")
          .eq("seller_id", player.id)
          .order("created_at", { ascending: false });

        if (!listings || listings.length === 0) {
          await sendMessage(chat.id, "📋 <b>Мои лоты</b>\n\n📭 У тебя нет активных лотов.\n\nВыставь: /sell_market [номер] [цена]");
          return new Response("OK", { headers: corsHeaders });
        }

        let listText = "📋 <b>Мои лоты на бирже</b>\n\n";
        const buttons: any[] = [];

        listings.forEach((listing, index) => {
          listText += `${index + 1}. ${listing.item_icon || "📦"} ${listing.item_name}\n`;
          listText += `   💰 ${listing.price.toLocaleString()} монет\n\n`;
          buttons.push([{ text: `❌ Снять ${listing.item_name}`, callback_data: `cancel_listing_${listing.id}_u${from.id}` }]);
        });

        await sendMessage(chat.id, listText, {
          inline_keyboard: buttons,
        });
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
      } else if (text === "/top_ref") {
        // Top players by referral count
        const { data: topReferrers } = await supabaseClient
          .from("squid_players")
          .select("telegram_id, first_name, username, referral_count")
          .gt("referral_count", 0)
          .order("referral_count", { ascending: false })
          .limit(10);

        if (!topReferrers || topReferrers.length === 0) {
          await sendMessage(chat.id, "👥 Пока никто не пригласил рефералов!");
          return new Response("OK", { headers: corsHeaders });
        }

        let topText = "👥 <b>Топ 10 по рефералам</b>\n\n";
        const medals = ["🥇", "🥈", "🥉"];

        topReferrers.forEach((p, index) => {
          const medal = index < 3 ? medals[index] : `${index + 1}.`;
          const name = p.first_name || p.username || `ID: ${p.telegram_id}`;
          topText += `${medal} <b>${name}</b> — ${p.referral_count} 👥\n`;
        });

        await sendMessage(chat.id, topText);
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

        // Get bot chat invites count (groups/supergroups the bot was added to)
        const { count: botChatInvites } = await supabaseClient
          .from("squid_bot_chats")
          .select("*", { count: "exact", head: true })
          .neq("chat_type", "private");

        const botUsername = "squid_game_russia_bot";
        const refLink = `https://t.me/${botUsername}?start=ref${player.telegram_id}`;

        await sendMessage(
          chat.id,
          `🔗 <b>Реферальная программа</b>\n\n` +
            `Приглашай друзей и получай награды!\n\n` +
            `💰 За каждого друга: <b>100,000 монет</b>\n` +
            `🎁 За каждого друга: <b>1 подарок</b>\n\n` +
            `👥 Приглашено друзей: <b>${player.referral_count || 0}</b>\n` +
            `🎁 Доступно подарков: <b>${player.gift_count || 0}</b>\n` +
            `🤖 Бот добавлен в беседы: <b>${botChatInvites || 0}</b>\n\n` +
            `📎 <b>Твоя ссылка:</b>\n<code>${refLink}</code>\n\n` +
            `Используй /gift_open чтобы открыть подарок!\n` +
            `Смотри топ рефереров: /top_ref`,
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
      } else if (text.startsWith("/gift_all ") || (update.message?.caption?.startsWith("/gift_all ") && (update.message?.photo || update.message?.video || update.message?.animation))) {
        // Secondary deduplication using message_id to prevent duplicate broadcasts
        const messageId = update.message?.message_id;
        if (messageId && isBroadcastProcessed(chat.id, messageId)) {
          console.log(`Skipping duplicate broadcast /gift_all - chat:${chat.id} msg:${messageId}`);
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        // Check for attached media
        const hasPhoto = update.message?.photo && update.message.photo.length > 0;
        const hasVideo = !!update.message?.video;
        const hasAnimation = !!update.message?.animation;
        const hasAttachedMedia = hasPhoto || hasVideo || hasAnimation;
        
        let mediaFileId: string | null = null;
        let mediaType: 'photo' | 'video' | 'animation' | null = null;
        
        if (hasPhoto && update.message?.photo) {
          mediaFileId = update.message.photo[update.message.photo.length - 1].file_id;
          mediaType = 'photo';
        } else if (hasVideo && update.message?.video) {
          mediaFileId = update.message.video.file_id;
          mediaType = 'video';
        } else if (hasAnimation && update.message?.animation) {
          mediaFileId = update.message.animation.file_id;
          mediaType = 'animation';
        }

        // Use caption if media attached, otherwise use text
        const commandText = hasAttachedMedia ? (update.message?.caption || "") : (text || "");
        const args = commandText.replace("/gift_all ", "").trim();
        const firstSpace = args.indexOf(" ");

        if (firstSpace === -1) {
          await sendMessage(chat.id, "❌ Формат: /gift_all [количество] [сообщение]\n\n💡 Прикрепите фото/видео/GIF к сообщению для рассылки с медиа!");
          return new Response("OK", { headers: corsHeaders });
        }

        const amount = parseInt(args.substring(0, firstSpace));
        let messageText = args.substring(firstSpace + 1).trim();
        
        // Also check for URL in text for backward compatibility
        let mediaUrl: string | null = null;
        const urlMatch = messageText.match(/(https?:\/\/[^\s]+)$/);
        if (urlMatch && !hasAttachedMedia) {
          mediaUrl = urlMatch[1];
          messageText = messageText.replace(mediaUrl, "").trim();
        }

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

        const fullMessage = `🎁 <b>Подарок от создателя!</b>\n\n🎁 Тебе начислено: ${amount} ${amount === 1 ? "подарок" : amount < 5 ? "подарка" : "подарков"}\n\n📢 ${messageText}\n\nОткрой подарки: /gift_open`;

        for (const player of allPlayers) {
          try {
            // Add gifts to player
            await supabaseClient
              .from("squid_players")
              .update({ gift_count: (player.gift_count || 0) + amount })
              .eq("id", player.id);

            // Convert telegram_id to number (might be BigInt from DB)
            const telegramId = Number(player.telegram_id);
            
            if (mediaFileId && mediaType) {
              await sendMediaByFileId(telegramId, mediaFileId, mediaType, fullMessage);
            } else if (mediaUrl) {
              await sendMediaWithText(telegramId, mediaUrl, fullMessage);
            } else {
              await sendMessage(telegramId, fullMessage);
            }
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
            `🎁 Всего выдано: ${sent * amount} подарков` +
            (mediaFileId ? `\n📎 С прикреплённым медиа` : mediaUrl ? `\n📎 С медиа: ${mediaUrl}` : ""),
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
      } else if (text.startsWith("/remove_gifts ")) {
        // Admin command to remove gifts from all players
        const { data: admin } = await supabaseClient
          .from("squid_admins")
          .select("*")
          .eq("telegram_id", from.id)
          .single();

        if (!admin) {
          return new Response("OK", { headers: corsHeaders });
        }

        const amount = parseInt(text.replace("/remove_gifts ", "").trim());

        if (isNaN(amount) || amount <= 0) {
          await sendMessage(chat.id, "❌ Формат: /remove_gifts [количество]\n\nУберёт указанное количество подарков у всех игроков.");
          return new Response("OK", { headers: corsHeaders });
        }

        const { data: allPlayers } = await supabaseClient.from("squid_players").select("id, gift_count");

        if (!allPlayers || allPlayers.length === 0) {
          await sendMessage(chat.id, "❌ Нет игроков");
          return new Response("OK", { headers: corsHeaders });
        }

        let affected = 0;
        let totalRemoved = 0;

        for (const player of allPlayers) {
          const currentGifts = player.gift_count || 0;
          if (currentGifts > 0) {
            const toRemove = Math.min(amount, currentGifts);
            await supabaseClient
              .from("squid_players")
              .update({ gift_count: currentGifts - toRemove })
              .eq("id", player.id);
            affected++;
            totalRemoved += toRemove;
          }
        }

        await sendMessage(
          chat.id,
          `✅ <b>Подарки убраны!</b>\n\n` +
            `🎁 Убрано у каждого: до ${amount} ${amount === 1 ? "подарок" : amount < 5 ? "подарка" : "подарков"}\n` +
            `👥 Затронуто игроков: ${affected}\n` +
            `🎁 Всего убрано: ${totalRemoved} подарков`,
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

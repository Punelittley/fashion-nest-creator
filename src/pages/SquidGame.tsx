import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Player {
  id: string;
  telegram_id: number;
  balance: number;
  username?: string;
  first_name?: string;
  is_premium?: boolean;
}

const ROULETTE_NUMBERS = [
  { num: 0, color: "green" },
  { num: 32, color: "red" }, { num: 15, color: "black" }, { num: 19, color: "red" }, { num: 4, color: "black" },
  { num: 21, color: "red" }, { num: 2, color: "black" }, { num: 25, color: "red" }, { num: 17, color: "black" },
  { num: 34, color: "red" }, { num: 6, color: "black" }, { num: 27, color: "red" }, { num: 13, color: "black" },
  { num: 36, color: "red" }, { num: 11, color: "black" }, { num: 30, color: "red" }, { num: 8, color: "black" },
  { num: 23, color: "red" }, { num: 10, color: "black" }, { num: 5, color: "red" }, { num: 24, color: "black" },
  { num: 16, color: "red" }, { num: 33, color: "black" }, { num: 1, color: "red" }, { num: 20, color: "black" },
  { num: 14, color: "red" }, { num: 31, color: "black" }, { num: 9, color: "red" }, { num: 22, color: "black" },
  { num: 18, color: "red" }, { num: 29, color: "black" }, { num: 7, color: "red" }, { num: 28, color: "black" },
  { num: 12, color: "red" }, { num: 35, color: "black" }, { num: 3, color: "red" }, { num: 26, color: "black" },
];

export default function SquidGame() {
  const [telegramId, setTelegramId] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("roulette");

  // Roulette state
  const [rouletteBet, setRouletteBet] = useState("");
  const [rouletteBetType, setRouletteBetType] = useState<"red" | "black" | "green">("red");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastResult, setLastResult] = useState<{ num: number; color: string } | null>(null);

  // Ladder state
  const [ladderBet, setLadderBet] = useState("");
  const [ladderChance, setLadderChance] = useState(50);
  const [ladderMultiplier, setLadderMultiplier] = useState(1.9);
  const [ladderResult, setLadderResult] = useState<"win" | "lose" | null>(null);
  const [ladderPlaying, setLadderPlaying] = useState(false);

  // Calculate multiplier based on chance
  useEffect(() => {
    const mult = (95 / ladderChance).toFixed(2);
    setLadderMultiplier(parseFloat(mult));
  }, [ladderChance]);

  const loginPlayer = async () => {
    if (!telegramId) {
      toast.error("Введите ваш Telegram ID");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("squid_players")
        .select("id, telegram_id, balance, username, first_name, is_premium")
        .eq("telegram_id", parseInt(telegramId))
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("Игрок не найден. Сначала напишите /start боту.");
        return;
      }

      setPlayer(data);
      toast.success(`Добро пожаловать, ${data.first_name || data.username || "Игрок"}!`);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!player) return;
    const { data } = await supabase
      .from("squid_players")
      .select("balance")
      .eq("id", player.id)
      .single();
    
    if (data) {
      setPlayer({ ...player, balance: data.balance });
    }
  };

  const spinRoulette = async () => {
    if (!player) return;
    const bet = parseInt(rouletteBet);
    if (isNaN(bet) || bet <= 0) {
      toast.error("Введите корректную ставку");
      return;
    }
    if (bet > player.balance) {
      toast.error("Недостаточно монет");
      return;
    }

    setIsSpinning(true);
    
    // Deduct bet
    const { error: updateError } = await supabase
      .from("squid_players")
      .update({ balance: player.balance - bet })
      .eq("id", player.id);

    if (updateError) {
      toast.error("Ошибка обновления баланса");
      setIsSpinning(false);
      return;
    }

    // Determine result (fair odds: red 48.5%, black 48.5%, green 3%)
    const rand = Math.random() * 100;
    let resultColor: string;
    if (rand < 3) {
      resultColor = "green";
    } else if (rand < 51.5) {
      resultColor = "red";
    } else {
      resultColor = "black";
    }

    // Find a number with this color
    const possibleNumbers = ROULETTE_NUMBERS.filter(n => n.color === resultColor);
    const resultNumber = possibleNumbers[Math.floor(Math.random() * possibleNumbers.length)];
    const resultIndex = ROULETTE_NUMBERS.findIndex(n => n.num === resultNumber.num);

    // Calculate rotation (multiple full spins + landing on result)
    const sliceAngle = 360 / ROULETTE_NUMBERS.length;
    const targetAngle = resultIndex * sliceAngle;
    const spins = 5 + Math.floor(Math.random() * 3);
    const newRotation = rotation + (360 * spins) + (360 - targetAngle) + sliceAngle / 2;
    
    setRotation(newRotation);

    // Wait for animation
    setTimeout(async () => {
      setLastResult(resultNumber);
      setIsSpinning(false);

      const won = rouletteBetType === resultNumber.color;
      let winAmount = 0;
      
      if (won) {
        if (resultNumber.color === "green") {
          winAmount = bet * 14;
        } else {
          winAmount = bet * 2;
        }
        
        // Apply premium bonus
        if (player.is_premium) {
          winAmount = Math.floor(winAmount * 2);
        }

        const { error } = await supabase
          .from("squid_players")
          .update({ balance: player.balance - bet + winAmount })
          .eq("id", player.id);

        if (!error) {
          toast.success(`🎉 Выигрыш! +${winAmount.toLocaleString()} монет`);
        }
      } else {
        toast.error(`💀 Проигрыш! Выпало: ${resultNumber.num} (${resultNumber.color === "red" ? "🔴" : resultNumber.color === "black" ? "⚫" : "🟢"})`);
      }

      await refreshBalance();
    }, 5000);
  };

  const playLadder = async () => {
    if (!player) return;
    const bet = parseInt(ladderBet);
    if (isNaN(bet) || bet <= 0) {
      toast.error("Введите корректную ставку");
      return;
    }
    if (bet > player.balance) {
      toast.error("Недостаточно монет");
      return;
    }

    setLadderPlaying(true);
    setLadderResult(null);

    // Deduct bet
    await supabase
      .from("squid_players")
      .update({ balance: player.balance - bet })
      .eq("id", player.id);

    // Determine result based on chance
    const rand = Math.random() * 100;
    const won = rand < ladderChance;

    setTimeout(async () => {
      setLadderResult(won ? "win" : "lose");
      setLadderPlaying(false);

      if (won) {
        let winAmount = Math.floor(bet * ladderMultiplier);
        
        // Apply premium bonus
        if (player.is_premium) {
          winAmount = Math.floor(winAmount * 2);
        }

        await supabase
          .from("squid_players")
          .update({ balance: player.balance - bet + winAmount })
          .eq("id", player.id);
        
        toast.success(`🎉 Выигрыш! +${winAmount.toLocaleString()} монет (x${ladderMultiplier})`);
      } else {
        toast.error(`💀 Проигрыш! Шанс был ${ladderChance}%`);
      }

      await refreshBalance();
    }, 1500);
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-600 via-red-600 to-orange-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/80 border-pink-500 border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-pink-500">🦑 Squid Game Casino</CardTitle>
            <p className="text-gray-400">Введите ваш Telegram ID для входа</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="number"
              placeholder="Telegram ID"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              className="bg-gray-900 border-pink-500 text-white text-center text-xl"
            />
            <Button
              onClick={loginPlayer}
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-lg py-6"
            >
              {loading ? "Загрузка..." : "Войти"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Узнать Telegram ID можно написав /start боту @squid_game_russia_bot
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-600 via-red-600 to-orange-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <h1 className="text-2xl font-bold">🦑 Squid Game Casino</h1>
            <p className="text-pink-200">
              {player.first_name || player.username || "Игрок"}
              {player.is_premium && " 👑"}
            </p>
          </div>
          <div className="bg-black/50 rounded-lg px-4 py-2">
            <p className="text-sm text-gray-400">Баланс</p>
            <p className="text-2xl font-bold text-yellow-400">
              💰 {player.balance.toLocaleString()}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/50">
            <TabsTrigger value="roulette" className="text-white data-[state=active]:bg-pink-600">
              🎰 Рулетка
            </TabsTrigger>
            <TabsTrigger value="ladder" className="text-white data-[state=active]:bg-pink-600">
              📈 Лесенка
            </TabsTrigger>
          </TabsList>

          {/* Roulette Tab */}
          <TabsContent value="roulette">
            <Card className="bg-black/80 border-pink-500 border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-6">
                  {/* Roulette Wheel */}
                  <div className="relative w-72 h-72">
                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                      <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-400" />
                    </div>
                    
                    {/* Wheel */}
                    <div 
                      className="w-full h-full rounded-full relative overflow-hidden shadow-2xl transition-transform"
                      style={{ 
                        transform: `rotate(${rotation}deg)`,
                        transition: isSpinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none"
                      }}
                    >
                      {ROULETTE_NUMBERS.map((slot, index) => {
                        const angle = (360 / ROULETTE_NUMBERS.length) * index;
                        const bgColor = slot.color === "red" ? "#dc2626" : slot.color === "black" ? "#1f2937" : "#16a34a";
                        return (
                          <div
                            key={index}
                            className="absolute w-full h-full flex items-start justify-center"
                            style={{ transform: `rotate(${angle}deg)` }}
                          >
                            <div 
                              className="w-6 h-36 flex items-start justify-center pt-2 text-white text-xs font-bold"
                              style={{ 
                                background: bgColor,
                                clipPath: "polygon(30% 0, 70% 0, 100% 100%, 0 100%)"
                              }}
                            >
                              {slot.num}
                            </div>
                          </div>
                        );
                      })}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-gray-800 rounded-full border-4 border-yellow-400 flex items-center justify-center">
                          <span className="text-yellow-400 font-bold">🎰</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Last Result */}
                  {lastResult && (
                    <div className="text-center">
                      <p className="text-gray-400">Последний результат:</p>
                      <p className={`text-3xl font-bold ${
                        lastResult.color === "red" ? "text-red-500" : 
                        lastResult.color === "black" ? "text-gray-300" : "text-green-500"
                      }`}>
                        {lastResult.num} {lastResult.color === "red" ? "🔴" : lastResult.color === "black" ? "⚫" : "🟢"}
                      </p>
                    </div>
                  )}

                  {/* Betting Controls */}
                  <div className="w-full space-y-4">
                    <Input
                      type="number"
                      placeholder="Сумма ставки"
                      value={rouletteBet}
                      onChange={(e) => setRouletteBet(e.target.value)}
                      className="bg-gray-900 border-pink-500 text-white text-center text-xl"
                      disabled={isSpinning}
                    />
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => setRouletteBetType("red")}
                        className={`${rouletteBetType === "red" ? "ring-2 ring-yellow-400" : ""} bg-red-600 hover:bg-red-700 text-white font-bold`}
                        disabled={isSpinning}
                      >
                        🔴 Красное (x2)
                      </Button>
                      <Button
                        onClick={() => setRouletteBetType("green")}
                        className={`${rouletteBetType === "green" ? "ring-2 ring-yellow-400" : ""} bg-green-600 hover:bg-green-700 text-white font-bold`}
                        disabled={isSpinning}
                      >
                        🟢 Зелёное (x14)
                      </Button>
                      <Button
                        onClick={() => setRouletteBetType("black")}
                        className={`${rouletteBetType === "black" ? "ring-2 ring-yellow-400" : ""} bg-gray-700 hover:bg-gray-600 text-white font-bold`}
                        disabled={isSpinning}
                      >
                        ⚫ Чёрное (x2)
                      </Button>
                    </div>

                    <Button
                      onClick={spinRoulette}
                      disabled={isSpinning}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xl py-6"
                    >
                      {isSpinning ? "🎰 Крутится..." : "🎲 Крутить!"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ladder Tab */}
          <TabsContent value="ladder">
            <Card className="bg-black/80 border-pink-500 border-2">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Visual Ladder */}
                  <div className="relative h-64 bg-gradient-to-t from-green-900 via-yellow-900 to-red-900 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex flex-col justify-between p-4">
                      {[90, 70, 50, 30, 10].map((chance, index) => (
                        <div 
                          key={chance}
                          className={`flex justify-between items-center ${
                            ladderChance === chance ? "bg-pink-600/50 rounded px-2" : ""
                          }`}
                        >
                          <span className="text-white font-bold">{chance}%</span>
                          <span className="text-yellow-400 font-bold">x{(95 / chance).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Result Indicator */}
                    {ladderPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-pink-500 rounded-full animate-ping" />
                      </div>
                    )}
                    
                    {ladderResult && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className={`text-6xl ${ladderResult === "win" ? "animate-bounce" : ""}`}>
                          {ladderResult === "win" ? "🎉" : "💀"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Ставка</label>
                      <Input
                        type="number"
                        placeholder="Сумма ставки"
                        value={ladderBet}
                        onChange={(e) => setLadderBet(e.target.value)}
                        className="bg-gray-900 border-pink-500 text-white text-center text-xl"
                        disabled={ladderPlaying}
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">
                        Шанс: {ladderChance}% | Множитель: x{ladderMultiplier}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={ladderChance}
                        onChange={(e) => setLadderChance(parseInt(e.target.value))}
                        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        disabled={ladderPlaying}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5% (x19.00)</span>
                        <span>95% (x1.00)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {[10, 25, 50, 75, 90].map((chance) => (
                        <Button
                          key={chance}
                          onClick={() => setLadderChance(chance)}
                          size="sm"
                          variant={ladderChance === chance ? "default" : "outline"}
                          className={ladderChance === chance ? "bg-pink-600" : "border-pink-500 text-pink-500"}
                          disabled={ladderPlaying}
                        >
                          {chance}%
                        </Button>
                      ))}
                    </div>

                    <Button
                      onClick={playLadder}
                      disabled={ladderPlaying}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xl py-6"
                    >
                      {ladderPlaying ? "⏳ Игра..." : `🎲 Играть (x${ladderMultiplier})`}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick bet buttons */}
        <div className="mt-4 flex gap-2 flex-wrap justify-center">
          {[1000, 5000, 10000, 50000, 100000].map((amount) => (
            <Button
              key={amount}
              size="sm"
              variant="outline"
              className="border-pink-500 text-pink-500"
              onClick={() => {
                if (activeTab === "roulette") {
                  setRouletteBet(amount.toString());
                } else {
                  setLadderBet(amount.toString());
                }
              }}
            >
              {amount >= 1000 ? `${amount / 1000}K` : amount}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-500 text-yellow-500"
            onClick={() => {
              const allIn = player.balance.toString();
              if (activeTab === "roulette") {
                setRouletteBet(allIn);
              } else {
                setLadderBet(allIn);
              }
            }}
          >
            ALL IN
          </Button>
        </div>

        <p className="text-center text-pink-200 text-xs mt-4">
          {player.is_premium && "👑 Premium активен - x2 ко всем выигрышам!"}
        </p>
      </div>
    </div>
  );
}

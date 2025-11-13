import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_type: 'user' | 'support';
  message: string;
  created_at: string;
}

const Support = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuthAndInitialize();
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [navigate]);

  const checkAuthAndInitialize = async () => {
    if (!localApi.isAuthenticated()) {
      navigate("/auth");
      return;
    }

    initializeChat();
  };

  useEffect(() => {
    if (!chatId) return;

    loadMessages();

    // Polling для новых сообщений каждые 3 секунды
    pollingInterval.current = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeChat = async () => {
    try {
      const chat = await localApi.getOrCreateSupportChat();
      setChatId(chat.id);
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error("Не удалось инициализировать чат");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!chatId) return;
    
    try {
      const data = await localApi.getSupportMessages(chatId);
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId || sending) return;

    setSending(true);
    try {
      await localApi.sendSupportMessage(chatId, newMessage.trim());
      setNewMessage("");
      await loadMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <div className="animate-fade-in">Загрузка чата...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
        <div className="animate-fade-in">
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "500",
            marginBottom: "1rem",
            color: "hsl(var(--foreground))"
          }}>
            Поддержка
          </h1>
          <p style={{
            fontSize: "1rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "2rem"
          }}>
            Задайте вопрос нашей службе поддержки
          </p>

          <div style={{
            backgroundColor: "hsl(var(--card))",
            height: "500px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  Начните разговор с нашей службой поддержки
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      maxWidth: "70%",
                      alignSelf: message.sender_type === 'user' ? 'flex-end' : 'flex-start',
                      padding: "1rem",
                      backgroundColor: message.sender_type === 'user' 
                        ? "hsl(var(--primary))" 
                        : "hsl(var(--muted))",
                      color: message.sender_type === 'user'
                        ? "hsl(var(--primary-foreground))"
                        : "hsl(var(--foreground))"
                    }}
                  >
                    <p style={{ marginBottom: "0.5rem", wordWrap: "break-word" }}>
                      {message.message}
                    </p>
                    <p style={{
                      fontSize: "0.75rem",
                      opacity: 0.7,
                      textAlign: "right"
                    }}>
                      {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{
              padding: "1.5rem",
              borderTop: "1px solid hsl(var(--border))",
              display: "flex",
              gap: "1rem"
            }}>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите ваше сообщение..."
                disabled={sending}
                style={{ flex: 1 }}
              />
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || sending}
              >
                {sending ? "Отправка..." : "Отправить"}
              </Button>
            </form>
          </div>

          <div style={{
            marginTop: "2rem",
            padding: "1.5rem",
            backgroundColor: "hsl(var(--muted))",
            color: "hsl(var(--foreground))"
          }}>
            <h3 style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "0.75rem"
            }}>
              Часто задаваемые вопросы
            </h3>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}>
              <li>• Время доставки: 3-7 рабочих дней</li>
              <li>• Возврат товара возможен в течение 14 дней</li>
              <li>• Оплата: наличными, картой, онлайн</li>
              <li>• Консультация по размерам: пишите в чат</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Support;

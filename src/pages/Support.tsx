import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    checkAuthAndInitialize();
  }, [navigate]);

  const checkAuthAndInitialize = async () => {
    // Проверяем авторизацию через Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const token = localStorage.getItem("auth_token");
    
    if (!session && !token) {
      navigate("/auth");
      return;
    }

    initializeChat();
  };

  useEffect(() => {
    if (!chatId) return;

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          console.log('New message:', payload);
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has existing chat
      const { data: existingChat, error: chatError } = await supabase
        .from('support_chats')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle();

      if (chatError && chatError.code !== 'PGRST116') {
        throw chatError;
      }

      if (existingChat) {
        setChatId(existingChat.id);
      } else {
        // Create new chat
        const { data: newChat, error: createError } = await supabase
          .from('support_chats')
          .insert({
            user_id: user.id,
            status: 'open'
          })
          .select()
          .single();

        if (createError) throw createError;

        setChatId(newChat.id);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error("Не удалось инициализировать чат");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error("Не удалось загрузить сообщения");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId || sending) return;

    setSending(true);
    const messageText = newMessage;
    setNewMessage("");

    try {
      // Save message to database
      const { error: insertError } = await supabase
        .from('support_messages')
        .insert({
          chat_id: chatId,
          sender_type: 'user',
          message: messageText,
        });

      if (insertError) throw insertError;

      // Send to Telegram
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'telegram-support?action=send',
        {
          body: { chatId, message: messageText },
          method: 'POST',
        }
      );

      if (functionError) {
        console.error('Telegram send error:', functionError);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Не удалось отправить сообщение");
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "hsl(var(--muted-foreground))"
        }}>
          Загрузка чата...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "2rem 1rem"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "2rem"
          }}>
            <div>
              <h1 style={{
              fontSize: "2rem",
              fontWeight: "600",
              color: "hsl(var(--foreground))",
              margin: 0
            }}>
              Техническая поддержка
            </h1>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.95rem",
              margin: "0.25rem 0 0 0"
            }}>
              Наша команда ответит вам в ближайшее время
            </p>
          </div>
        </div>

        <div style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "12px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "600px"
        }}>
          {/* Messages area */}
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
                padding: "3rem 1rem",
                color: "hsl(var(--muted-foreground))"
              }}>
                <p>Начните разговор, задав свой вопрос</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender_type === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      background: msg.sender_type === 'user' 
                        ? 'hsl(var(--primary))' 
                        : 'hsl(var(--muted))',
                      color: msg.sender_type === 'user'
                        ? 'hsl(var(--primary-foreground))'
                        : 'hsl(var(--foreground))',
                    }}
                  >
                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                      {msg.message}
                    </p>
                    <span style={{
                      fontSize: "0.75rem",
                      opacity: 0.7,
                      marginTop: "0.25rem",
                      display: "block"
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "1.5rem",
              borderTop: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
              display: "flex",
              gap: "1rem"
            }}
          >
            <Input
              type="text"
              placeholder="Напишите ваше сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              style={{
                flex: 1,
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))"
              }}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              style={{
                minWidth: "100px",
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))"
              }}
            >
              {sending ? "Отправка..." : "Отправить"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Support;
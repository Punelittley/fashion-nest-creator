import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { User, Package, LogOut, Calendar, MapPin, Mail, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  birth_date: string;
  gender: string;
  city: string;
  postal_code: string;
  avatar_url: string;
  bio: string;
}

interface OrderStats {
  total: number;
  pending: number;
  completed: number;
  totalSpent: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    birth_date: "",
    gender: "",
    city: "",
    postal_code: "",
    avatar_url: "",
    bio: ""
  });
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    completed: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');

  useEffect(() => {
    checkAuthAndLoadData();
  }, [navigate]);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      loadProfile();
      loadOrderStats();
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          birth_date: data.birth_date || "",
          gender: data.gender || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || ""
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error("Ошибка загрузки профиля");
    }
  };

  const loadOrderStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, total_amount')
        .eq('user_id', session.user.id);

      if (error) throw error;

      if (orders) {
        const stats = {
          total: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          completed: orders.filter(o => o.status === 'completed').length,
          totalSpent: orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
        };
        setOrderStats(stats);
      }
    } catch (error) {
      console.error('Error loading order stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          birth_date: profile.birth_date || null,
          gender: profile.gender || null,
          city: profile.city || null,
          postal_code: profile.postal_code || null,
          avatar_url: profile.avatar_url || null,
          bio: profile.bio || null
        })
        .eq('id', session.user.id);

      if (error) throw error;
      toast.success("Профиль обновлен");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Ошибка при обновлении профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли из аккаунта");
    navigate("/auth");
  };

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "1rem",
          color: "hsl(var(--foreground))"
        }}>
          Личный кабинет
        </h1>
        
        <p style={{
          fontSize: "1.125rem",
          color: "hsl(var(--muted-foreground))",
          marginBottom: "3rem"
        }}>
          Управление профилем и заказами
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginBottom: "3rem"
        }}>
          <button
            onClick={() => navigate("/orders")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1.5rem",
              backgroundColor: "hsl(var(--secondary))",
              border: "none",
              cursor: "pointer",
              transition: "var(--transition)",
              textAlign: "left"
            }}
          >
            <Package size={24} style={{ color: "hsl(var(--accent))" }} />
            <div>
              <h3 style={{
                fontSize: "1.125rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))",
                marginBottom: "0.25rem"
              }}>
                Мои заказы
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.9rem"
              }}>
                История покупок
              </p>
            </div>
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1.5rem",
              backgroundColor: "hsl(var(--secondary))",
              border: "none",
              cursor: "pointer",
              transition: "var(--transition)",
              textAlign: "left"
            }}
          >
            <LogOut size={24} style={{ color: "hsl(var(--accent))" }} />
            <div>
              <h3 style={{
                fontSize: "1.125rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))",
                marginBottom: "0.25rem"
              }}>
                Выйти
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.9rem"
              }}>
                Завершить сеанс
              </p>
            </div>
          </button>
        </div>

        <div style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          borderBottom: "1px solid hsl(var(--border))"
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: "1rem 2rem",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === 'profile' ? "2px solid hsl(var(--primary))" : "none",
              color: activeTab === 'profile' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            style={{
              padding: "1rem 2rem",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === 'stats' ? "2px solid hsl(var(--primary))" : "none",
              color: activeTab === 'stats' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            Статистика
          </button>
        </div>

        {activeTab === 'profile' && (
          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--card))",
            boxShadow: "var(--shadow-soft)"
          }}>
            <form onSubmit={handleSubmit} style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem"
            }}>
              <div>
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "500",
                  marginBottom: "1.5rem",
                  color: "hsl(var(--foreground))",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <User size={20} />
                  Личная информация
                </h3>
                
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem"
                }}>
                  <div>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Полное имя
                    </label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        fontSize: "1rem"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Дата рождения
                    </label>
                    <input
                      type="date"
                      value={profile.birth_date}
                      onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        fontSize: "1rem"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Пол
                    </label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        fontSize: "1rem"
                      }}
                    >
                      <option value="">Не указан</option>
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                      <option value="other">Другой</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "500",
                  marginBottom: "1.5rem",
                  color: "hsl(var(--foreground))",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <Mail size={20} />
                  Контактная информация
                </h3>
                
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem"
                }}>
                  <div>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--muted))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--muted-foreground))",
                        fontSize: "1rem",
                        cursor: "not-allowed"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Телефон
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+7 (999) 999-99-99"
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        fontSize: "1rem"
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "500",
                  marginBottom: "1.5rem",
                  color: "hsl(var(--foreground))",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <MapPin size={20} />
                  Адрес доставки
                </h3>
                
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem"
                }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Адрес
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Улица, дом, квартира"
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        fontSize: "1rem"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Город
                    </label>
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        fontSize: "1rem"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "hsl(var(--foreground))"
                    }}>
                      Индекс
                    </label>
                    <input
                      type="text"
                      value={profile.postal_code}
                      onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                      placeholder="123456"
                      style={{
                        width: "100%",
                        padding: "0.875rem",
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        fontSize: "1rem"
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "500",
                  marginBottom: "1.5rem",
                  color: "hsl(var(--foreground))",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <FileText size={20} />
                  О себе
                </h3>
                
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Расскажите немного о себе..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "1rem",
                    resize: "vertical"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "1rem 2rem",
                  backgroundColor: loading ? "hsl(var(--muted))" : "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "var(--transition)",
                  alignSelf: "flex-start"
                }}
              >
                {loading ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              <div style={{
                padding: "2rem",
                backgroundColor: "hsl(var(--card))",
                boxShadow: "var(--shadow-soft)",
                textAlign: "center"
              }}>
                <Package size={32} style={{ color: "hsl(var(--accent))", margin: "0 auto 1rem" }} />
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "600",
                  color: "hsl(var(--foreground))",
                  marginBottom: "0.5rem"
                }}>
                  {orderStats.total}
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  Всего заказов
                </div>
              </div>

              <div style={{
                padding: "2rem",
                backgroundColor: "hsl(var(--card))",
                boxShadow: "var(--shadow-soft)",
                textAlign: "center"
              }}>
                <Calendar size={32} style={{ color: "hsl(var(--accent))", margin: "0 auto 1rem" }} />
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "600",
                  color: "hsl(var(--foreground))",
                  marginBottom: "0.5rem"
                }}>
                  {orderStats.pending}
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  В обработке
                </div>
              </div>

              <div style={{
                padding: "2rem",
                backgroundColor: "hsl(var(--card))",
                boxShadow: "var(--shadow-soft)",
                textAlign: "center"
              }}>
                <Package size={32} style={{ color: "hsl(var(--accent))", margin: "0 auto 1rem" }} />
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "600",
                  color: "hsl(var(--foreground))",
                  marginBottom: "0.5rem"
                }}>
                  {orderStats.completed}
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  Завершено
                </div>
              </div>

              <div style={{
                padding: "2rem",
                backgroundColor: "hsl(var(--card))",
                boxShadow: "var(--shadow-soft)",
                textAlign: "center"
              }}>
                <Package size={32} style={{ color: "hsl(var(--accent))", margin: "0 auto 1rem" }} />
                <div style={{
                  fontSize: "2rem",
                  fontWeight: "600",
                  color: "hsl(var(--foreground))",
                  marginBottom: "0.5rem"
                }}>
                  {orderStats.totalSpent.toLocaleString('ru-RU')} ₽
                </div>
                <div style={{
                  fontSize: "0.95rem",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  Потрачено
                </div>
              </div>
            </div>

            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--card))",
              boxShadow: "var(--shadow-soft)",
              textAlign: "center"
            }}>
              <h3 style={{
                fontSize: "1.25rem",
                fontWeight: "500",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Ваша активность
              </h3>
              <p style={{
                color: "hsl(var(--muted-foreground))",
                marginBottom: "1.5rem"
              }}>
                Спасибо за покупки в нашем магазине!
              </p>
              <button
                onClick={() => navigate("/catalog")}
                style={{
                  padding: "0.875rem 2rem",
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "var(--transition)"
                }}
              >
                Продолжить покупки
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
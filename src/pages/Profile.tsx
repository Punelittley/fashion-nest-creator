import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { User, Package } from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  phone: string;
  address: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    phone: "",
    address: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        loadProfile(session.user.id);
      }
    });
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || ""
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address
        })
        .eq("id", session.user.id);

      if (error) throw error;
      toast.success("Профиль обновлен");
    } catch (error) {
      toast.error("Ошибка при обновлении профиля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "3rem",
          color: "hsl(var(--foreground))"
        }}>
          Личный кабинет
        </h1>

        <div style={{
          display: "grid",
          gap: "2rem",
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
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "hsl(var(--muted))"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "hsl(var(--secondary))"}
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
                История и статус заказов
              </p>
            </div>
          </button>
        </div>

        <div style={{
          padding: "2rem",
          backgroundColor: "hsl(var(--card))",
          boxShadow: "var(--shadow-soft)"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "2rem"
          }}>
            <User size={24} style={{ color: "hsl(var(--accent))" }} />
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "500",
              color: "hsl(var(--foreground))"
            }}>
              Информация профиля
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{
            display: "flex",
            flexDirection: "column",
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
                placeholder="+7 (999) 123-45-67"
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
                Адрес доставки
              </label>
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Город, улица, дом, квартира"
                rows={3}
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
                fontSize: "1.05rem",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "hsl(var(--accent)))")}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "hsl(var(--primary)))")}
            >
              {loading ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
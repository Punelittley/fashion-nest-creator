import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

const UsersList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error("Ошибка загрузки пользователей");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Загрузка пользователей...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: "hsl(var(--card))",
      padding: "2rem",
      borderRadius: "8px",
      boxShadow: "var(--shadow-soft)"
    }}>
      <h2 style={{
        fontSize: "1.5rem",
        fontWeight: "600",
        marginBottom: "1.5rem",
        color: "hsl(var(--foreground))",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
      }}>
        <User size={24} />
        Зарегистрированные пользователи ({users.length})
      </h2>

      <div style={{
        display: "grid",
        gap: "1rem"
      }}>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              padding: "1rem",
              backgroundColor: "hsl(var(--background))",
              borderRadius: "6px",
              border: "1px solid hsl(var(--border))"
            }}
          >
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem"
            }}>
              <div>
                <div style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.25rem"
                }}>
                  Email
                </div>
                <div style={{
                  fontWeight: "500",
                  color: "hsl(var(--foreground))"
                }}>
                  {user.email}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.25rem"
                }}>
                  Имя
                </div>
                <div style={{
                  fontWeight: "500",
                  color: "hsl(var(--foreground))"
                }}>
                  {user.full_name || "—"}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.25rem"
                }}>
                  Телефон
                </div>
                <div style={{
                  fontWeight: "500",
                  color: "hsl(var(--foreground))"
                }}>
                  {user.phone || "—"}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.25rem"
                }}>
                  Дата регистрации
                </div>
                <div style={{
                  fontWeight: "500",
                  color: "hsl(var(--foreground))"
                }}>
                  {new Date(user.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersList;

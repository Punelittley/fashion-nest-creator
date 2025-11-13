import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        checkAdmin(session.user.id);
      }
    });
  }, [navigate]);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();
    
    if (!data) {
      toast.error("Доступ запрещен");
      navigate("/");
    } else {
      setIsAdmin(true);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          Проверка прав доступа...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "3rem",
          color: "hsl(var(--foreground))"
        }}>
          Админ-панель
        </h1>
        
        <div style={{
          padding: "2rem",
          backgroundColor: "hsl(var(--card))",
          boxShadow: "var(--shadow-soft)",
          textAlign: "center"
        }}>
          <p style={{
            fontSize: "1.125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "1.5rem"
          }}>
            Управление магазином через Cloud
          </p>
          <button
            onClick={() => window.open('https://lovable.dev', '_blank')}
            style={{
              padding: "1rem 2rem",
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              border: "none",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            Открыть Cloud панель
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
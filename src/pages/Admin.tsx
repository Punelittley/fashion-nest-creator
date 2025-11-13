import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, [navigate]);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Требуется авторизация");
        navigate("/auth");
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (error || !roles || roles.length === 0) {
        toast.error("Доступ запрещен");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      toast.error("Ошибка проверки прав доступа");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isAdmin) {
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
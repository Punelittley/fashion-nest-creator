import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { z } from "zod";
import { Session } from "@supabase/supabase-js";

const authSchema = z.object({
  email: z.string().email({ message: "Некорректный email адрес" }),
  password: z.string().min(6, { message: "Пароль должен быть не менее 6 символов" }),
  fullName: z.string().min(2, { message: "Имя должно содержать не менее 2 символов" }).optional()
});

const Auth = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: ""
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.fullName
            }
          }
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Пользователь с таким email уже существует");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Регистрация успешна! Добро пожаловать!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Неверный email или пароль");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Вход выполнен успешно!");
        }
      }
    } catch (error) {
      toast.error("Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{
        minHeight: "calc(100vh - 200px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "hsl(var(--card))",
          padding: "2.5rem",
          boxShadow: "var(--shadow-soft)"
        }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "500",
            marginBottom: "0.5rem",
            color: "hsl(var(--foreground))",
            textAlign: "center"
          }}>
            {isSignUp ? "Регистрация" : "Вход"}
          </h1>
          <p style={{
            color: "hsl(var(--muted-foreground))",
            textAlign: "center",
            marginBottom: "2rem"
          }}>
            {isSignUp ? "Создайте аккаунт для совершения покупок" : "Войдите в свой аккаунт"}
          </p>

          <form onSubmit={handleSubmit} style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            {isSignUp && (
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: "hsl(var(--foreground))"
                }}>
                  Полное имя
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "1rem",
                    outline: "none"
                  }}
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))"
              }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "1rem",
                  outline: "none"
                }}
                required
              />
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))"
              }}>
                Пароль
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "1rem",
                  outline: "none"
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.875rem",
                backgroundColor: loading ? "hsl(var(--muted))" : "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                border: "none",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "hsl(var(--accent))")}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "hsl(var(--primary))")}
            >
              {loading ? "Загрузка..." : (isSignUp ? "Зарегистрироваться" : "Войти")}
            </button>
          </form>

          <div style={{
            marginTop: "1.5rem",
            textAlign: "center"
          }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: "none",
                border: "none",
                color: "hsl(var(--accent))",
                cursor: "pointer",
                fontSize: "0.9rem",
                textDecoration: "underline"
              }}
            >
              {isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
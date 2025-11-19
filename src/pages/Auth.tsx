import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { z } from "zod";
import { authApi, setToken } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const signUpSchema = z.object({
  email: z.string().email({ message: "Некорректный email адрес" }),
  password: z.string().min(6, { message: "Пароль должен быть не менее 6 символов" }),
  firstName: z.string().min(2, { message: "Имя должно содержать не менее 2 символов" }),
  lastName: z.string().min(2, { message: "Фамилия должна содержать не менее 2 символов" }),
  middleName: z.string().optional(),
  birthDate: z.string().min(1, { message: "Укажите дату рождения" })
});

const signInSchema = z.object({
  email: z.string().email({ message: "Некорректный email адрес" }),
  password: z.string().min(6, { message: "Пароль должен быть не менее 6 символов" })
});

const Auth = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    middleName: "",
    birthDate: ""
  });

  useEffect(() => {
    let isMounted = true;

    // 1) Если есть активная облачная сессия — уводим на главную
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) navigate("/");
    });

    // 2) Если в localStorage лежит токен локального сервера — проверяем его через /auth/me
    const token = localStorage.getItem('auth_token');
    if (token && token !== 'supabase') {
      authApi.me()
        .then(() => { if (isMounted) navigate("/"); })
        .catch(() => {/* игнор, остаёмся на странице авторизации */});
    }

    return () => { isMounted = false; };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = isSignUp 
      ? signUpSchema.safeParse(formData)
      : signInSchema.safeParse(formData);
      
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // 1) Пытаемся через локальный Express (если доступен)
        try {
          const response = await authApi.signup(
            formData.email,
            formData.password,
            `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim()
          );
          setToken(response.token);
          toast.success("Регистрация успешна! Добро пожаловать!");
          navigate("/");
          return;
        } catch (err) {
          // 2) Фолбэк на облачную авторизацию (Lovable Cloud)
          const redirectUrl = `${window.location.origin}/`;
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              emailRedirectTo: redirectUrl,
              data: { 
                first_name: formData.firstName,
                last_name: formData.lastName,
                middle_name: formData.middleName || undefined,
                birth_date: formData.birthDate
              },
            },
          });
          if (error) throw error;
          // Если автоподтверждение включено, будет сессия; если нет — письмо отправлено
          if (data.session) {
            setToken('supabase');
            toast.success("Регистрация успешна!");
            navigate("/");
          } else {
            toast.success("Письмо для подтверждения отправлено. Проверьте почту.");
          }
        }
      } else {
        // Вход: сначала пробуем локальный Express
        console.log('🔐 Попытка входа через SQLite для:', formData.email);
        try {
          const response = await authApi.signin(
            formData.email,
            formData.password
          );
          console.log('✅ Вход через SQLite успешен, токен получен');
          setToken(response.token);
          console.log('✅ Токен сохранён в localStorage:', response.token.substring(0, 30) + '...');
          toast.success("Вход выполнен успешно!");
          navigate("/");
          return;
        } catch (err) {
          console.error('❌ Ошибка входа через SQLite:', err);
          // Фолбэк на облачный вход
          console.log('📦 Переключаюсь на Supabase для входа...');
          const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          if (error) throw error;
          if (data.session) {
            setToken('supabase');
            console.log('✅ Вход через Supabase успешен');
            toast.success("Вход выполнен успешно!");
            navigate("/");
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Произошла ошибка. Попробуйте снова.");
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
              <>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    color: "hsl(var(--foreground))"
                  }}>
                    Фамилия
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                    Имя
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                    Отчество (необязательно)
                  </label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                      fontSize: "1rem",
                      outline: "none"
                    }}
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
                    Дата рождения
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
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
              </>
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
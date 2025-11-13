import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X, LayoutDashboard, Heart, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { authApi, cartApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Слушаем изменения состояния авторизации Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setTimeout(() => loadCartCount(), 0);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setCartCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token === 'supabase') {
      // Проверяем Supabase сессию
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        loadCartCount();
        // Можно проверить роль админа через user_roles таблицу
        setIsAdmin(false);
      } else {
        setIsAuthenticated(false);
      }
    } else if (token) {
      // Локальный Express токен — проверяем валидность через /auth/me
      try {
        await authApi.me();
        setIsAuthenticated(true);
        loadCartCount();
        setIsAdmin(false);
      } catch {
        // Токен недействителен или сервер недоступен — считаем, что не авторизованы
        setIsAuthenticated(false);
      }
    }
  };

  const loadCartCount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token === 'supabase') {
        // Используем Supabase для корзины
        const { data, error } = await supabase
          .from('cart_items')
          .select('quantity');
        if (!error && data) {
          const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(total);
        } else {
          setCartCount(0);
        }
      } else {
        // Используем Express API
        const data = await cartApi.get();
        const total = data.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(total);
      }
    } catch (error) {
      // Игнорируем ошибки загрузки корзины
      setCartCount(0);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    if (token === 'supabase') {
      await supabase.auth.signOut();
    } else {
      authApi.signout();
    }
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCartCount(0);
    navigate("/");
  };

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      backgroundColor: "hsl(var(--background))",
      borderBottom: "1px solid hsl(var(--border))",
      boxShadow: "var(--shadow-soft)"
    }}>
      <nav style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Link to="/" style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          color: "hsl(var(--foreground))",
          textDecoration: "none",
          letterSpacing: "0.05em"
        }}>
          FASHION
        </Link>

        {/* Desktop Menu */}
        <div style={{
          display: "flex",
          gap: "2rem",
          alignItems: "center"
        }} className="desktop-menu">
          <Link to="/catalog" style={{
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            fontSize: "0.95rem",
            transition: "var(--transition)"
          }} onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
             onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
            Каталог
          </Link>
          <Link to="/delivery" style={{
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            fontSize: "0.95rem",
            transition: "var(--transition)"
          }} onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
             onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
            Доставка
          </Link>
          <Link to="/support" style={{
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            fontSize: "0.95rem",
            transition: "var(--transition)"
          }} onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
             onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
            Поддержка
          </Link>
          <Link to="/contacts" style={{
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            fontSize: "0.95rem",
            transition: "var(--transition)"
          }} onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
             onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
            Контакты
          </Link>
          <Link to="/about" style={{
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            fontSize: "0.95rem",
            transition: "var(--transition)"
          }} onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
             onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
            О нас
          </Link>
        </div>

        <div style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "center"
        }}>
          {isAuthenticated ? (
            <>
              <Link to="/wishlist" style={{
                position: "relative",
                color: "hsl(var(--foreground))",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
              onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
                <Heart size={22} />
              </Link>
              <Link to="/support" style={{
                position: "relative",
                color: "hsl(var(--foreground))",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
              onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
                <MessageCircle size={22} />
              </Link>
              <Link to="/cart" style={{
                position: "relative",
                color: "hsl(var(--foreground))",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
              onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    backgroundColor: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    fontSize: "0.7rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600"
                  }}>
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link to="/profile" style={{ 
                color: "hsl(var(--foreground))", 
                transition: "var(--transition)" 
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
              onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
                <User size={22} />
              </Link>
              {isAdmin && (
                <Link to="/admin" style={{ color: "hsl(var(--accent))", transition: "var(--transition)" }}>
                  <LayoutDashboard size={22} />
                </Link>
              )}
              <button onClick={handleLogout} style={{
                background: "none",
                border: "none",
                color: "hsl(var(--foreground))",
                cursor: "pointer",
                padding: 0,
                transition: "var(--transition)"
              }}>
                <LogOut size={22} />
              </button>
            </>
          ) : (
            <Link to="/auth" style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              textDecoration: "none",
              fontSize: "0.9rem",
              transition: "var(--transition)",
              display: "inline-block"
            }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "hsl(var(--accent))"}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "hsl(var(--primary))"}>
              Войти
            </Link>
          )}
          
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
            display: "none",
            background: "none",
            border: "none",
            color: "hsl(var(--foreground))",
            cursor: "pointer",
            padding: 0
          }} className="mobile-menu-btn">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: "hsl(var(--background))",
          borderTop: "1px solid hsl(var(--border))",
          padding: "1rem 2rem"
        }} className="mobile-menu-content">
          <Link to="/catalog" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            padding: "0.75rem 0",
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            borderBottom: "1px solid hsl(var(--border))"
          }}>
            Каталог
          </Link>
          <Link to="/delivery" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            padding: "0.75rem 0",
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            borderBottom: "1px solid hsl(var(--border))"
          }}>
            Доставка
          </Link>
          <Link to="/contacts" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            padding: "0.75rem 0",
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            borderBottom: "1px solid hsl(var(--border))"
          }}>
            Контакты
          </Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            padding: "0.75rem 0",
            color: "hsl(var(--foreground))",
            textDecoration: "none"
          }}>
            О нас
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-menu {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
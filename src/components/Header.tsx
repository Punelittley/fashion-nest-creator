import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

const Header = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
        loadCartCount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
        loadCartCount(session.user.id);
      } else {
        setIsAdmin(false);
        setCartCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();
    
    setIsAdmin(!!data);
  };

  const loadCartCount = async (userId: string) => {
    const { data } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", userId);
    
    if (data) {
      const total = data.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(total);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
          {session ? (
            <>
              <Link to="/cart" style={{
                position: "relative",
                color: "hsl(var(--foreground))",
                transition: "var(--transition)"
              }}>
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
              <Link to="/profile" style={{ color: "hsl(var(--foreground))", transition: "var(--transition)" }}>
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
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X, LayoutDashboard, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { authApi, cartApi, roleApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.svg";

const Header = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setTimeout(() => {
          loadCartCount();
          checkAdminRole(session.user.id);
        }, 0);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        loadCartCount();
        checkAdminRole(session.user.id);
      } else {
        setIsAuthenticated(false);
      }
    } else if (token) {
      try {
        await authApi.me();
        setIsAuthenticated(true);
        loadCartCount();
        checkAdminRoleSQLite();
      } catch {
        setIsAuthenticated(false);
      }
    }
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!data && !error);
    } catch {
      setIsAdmin(false);
    }
  };

  const checkAdminRoleSQLite = async () => {
    try {
      const response = await roleApi.checkAdmin();
      setIsAdmin(response.isAdmin);
    } catch {
      setIsAdmin(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token === 'supabase') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCartCount(0);
          return;
        }

        const { data, error } = await supabase
          .from('cart_items')
          .select('quantity')
          .eq('user_id', session.user.id);
        
        if (!error && data) {
          const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(total);
        } else {
          setCartCount(0);
        }
      } else {
        const data = await cartApi.get();
        const total = data.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(total);
      }
    } catch (error) {
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
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/20 shadow-lg shadow-primary/5">
      <nav className="max-w-[1400px] mx-auto px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-xl font-orbitron font-bold text-gradient-gold hidden sm:block">
            CASINO
          </span>
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          <Link to="/catalog" className="text-foreground/80 hover:text-accent transition-colors duration-300 font-medium">
            Каталог
          </Link>
          <Link to="/delivery" className="text-foreground/80 hover:text-accent transition-colors duration-300 font-medium">
            Доставка
          </Link>
          <Link to="/support" className="text-foreground/80 hover:text-accent transition-colors duration-300 font-medium">
            Поддержка
          </Link>
          <Link to="/contacts" className="text-foreground/80 hover:text-accent transition-colors duration-300 font-medium">
            Контакты
          </Link>
          <Link to="/about" className="text-foreground/80 hover:text-accent transition-colors duration-300 font-medium">
            О нас
          </Link>
        </div>

        <div className="flex gap-4 items-center">
          {isAuthenticated ? (
            <>
              <Link to="/wishlist" className="text-foreground/80 hover:text-accent transition-colors duration-300 p-2 rounded-lg hover:bg-primary/10">
                <Heart size={22} />
              </Link>
              <Link to="/cart" className="relative text-foreground/80 hover:text-accent transition-colors duration-300 p-2 rounded-lg hover:bg-primary/10">
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold animate-pulse-glow">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="text-foreground/80 hover:text-accent transition-colors duration-300 p-2 rounded-lg hover:bg-primary/10">
                <User size={22} />
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-accent hover:text-accent/80 transition-colors duration-300 p-2 rounded-lg hover:bg-accent/10">
                  <LayoutDashboard size={22} />
                </Link>
              )}
              <button onClick={handleLogout} className="text-foreground/80 hover:text-destructive transition-colors duration-300 p-2 rounded-lg hover:bg-destructive/10">
                <LogOut size={22} />
              </button>
            </>
          ) : (
            <Link to="/auth" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5">
              Войти
            </Link>
          )}
          
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-foreground p-2">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-t border-primary/20 px-8 py-4">
          <Link to="/catalog" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-foreground/80 hover:text-accent border-b border-border/50">
            Каталог
          </Link>
          <Link to="/delivery" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-foreground/80 hover:text-accent border-b border-border/50">
            Доставка
          </Link>
          <Link to="/support" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-foreground/80 hover:text-accent border-b border-border/50">
            Поддержка
          </Link>
          <Link to="/contacts" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-foreground/80 hover:text-accent border-b border-border/50">
            Контакты
          </Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-foreground/80 hover:text-accent">
            О нас
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Heart, Trash2, ShoppingCart } from "lucide-react";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  stock: number;
}

const Wishlist = () => {
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate("/auth");
    } else {
      loadWishlist();
    }
  }, [navigate]);

  const loadWishlist = () => {
    // Временно загружаем из localStorage
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      setWishlistItems(JSON.parse(saved));
    }
    setLoading(false);
  };

  const removeFromWishlist = (productId: string) => {
    const updated = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    toast.success("Товар удален из избранного");
  };

  const addToCart = (product: WishlistItem) => {
    toast.success(`${product.name} добавлен в корзину`);
    // В реальном приложении здесь будет API запрос
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <div className="animate-fade-in">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div className="animate-fade-in">
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "3rem"
          }}>
            <Heart size={36} style={{ color: "hsl(var(--accent))" }} />
            <h1 style={{
              fontSize: "3rem",
              fontWeight: "500",
              color: "hsl(var(--foreground))"
            }}>
              Избранное
            </h1>
          </div>

          {wishlistItems.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "4rem 2rem",
              backgroundColor: "hsl(var(--secondary))"
            }} className="animate-scale-in">
              <Heart size={64} style={{ 
                color: "hsl(var(--muted-foreground))",
                margin: "0 auto 2rem",
                opacity: 0.5
              }} />
              <p style={{
                fontSize: "1.25rem",
                color: "hsl(var(--muted-foreground))",
                marginBottom: "2rem"
              }}>
                В избранном пока ничего нет
              </p>
              <Link
                to="/catalog"
                style={{
                  display: "inline-block",
                  padding: "1rem 2rem",
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  textDecoration: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                  transition: "var(--transition)"
                }}
                className="hover-scale"
              >
                Перейти в каталог
              </Link>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "2rem"
            }}>
              {wishlistItems.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    boxShadow: "var(--shadow-soft)",
                    overflow: "hidden",
                    position: "relative",
                    transition: "var(--transition)",
                    animationDelay: `${index * 0.1}s`
                  }}
                  className="animate-fade-in hover-scale"
                >
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      zIndex: 10,
                      background: "hsl(var(--background))",
                      border: "none",
                      padding: "0.5rem",
                      cursor: "pointer",
                      borderRadius: "50%",
                      boxShadow: "var(--shadow-medium)",
                      transition: "var(--transition)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(var(--destructive))";
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(var(--background))";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <Trash2 size={18} style={{ color: "hsl(var(--destructive))" }} />
                  </button>

                  <Link to={`/product/${item.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      position: "relative",
                      paddingBottom: "125%",
                      backgroundColor: "hsl(var(--muted))"
                    }}>
                      <img
                        src={item.image_url || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b"}
                        alt={item.name}
                        style={{
                          position: "absolute",
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    </div>
                  </Link>

                  <div style={{ padding: "1.5rem" }}>
                    <Link
                      to={`/product/${item.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit"
                      }}
                    >
                      <h3 style={{
                        fontSize: "1.125rem",
                        fontWeight: "500",
                        marginBottom: "0.5rem",
                        color: "hsl(var(--foreground))",
                        transition: "var(--transition)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "hsl(var(--accent))"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}>
                        {item.name}
                      </h3>
                    </Link>
                    
                    <p style={{
                      fontSize: "1.25rem",
                      fontWeight: "500",
                      color: "hsl(var(--accent))",
                      marginBottom: "1rem"
                    }}>
                      {item.price.toLocaleString()} ₽
                    </p>

                    {item.stock > 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          padding: "0.75rem",
                          backgroundColor: "hsl(var(--primary))",
                          color: "hsl(var(--primary-foreground))",
                          border: "none",
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "var(--transition)"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                      >
                        <ShoppingCart size={18} />
                        В корзину
                      </button>
                    ) : (
                      <p style={{
                        textAlign: "center",
                        color: "hsl(var(--destructive))",
                        fontSize: "0.9rem"
                      }}>
                        Нет в наличии
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Wishlist;

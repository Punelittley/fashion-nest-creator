import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mockProducts } from "@/data/mockProducts";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  stock: number;
  product_id: string;
}

const Wishlist = () => {
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadWishlist();
  }, [navigate]);

  const checkAuthAndLoadWishlist = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      loadWishlist();
    }
  };

  const loadWishlist = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('favorite_products')
        .select('id, product_id')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const formattedItems = data?.map((item: any) => {
        const product = mockProducts.find(p => p.id === item.product_id);
        return product ? {
          id: item.id,
          product_id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock: product.stock
        } : null;
      }).filter(Boolean) || [];

      setWishlistItems(formattedItems as WishlistItem[]);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      toast.error("Ошибка загрузки избранного");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (favoriteId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('favorite_products')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.id !== favoriteId));
      toast.success("Товар удален из избранного");
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error("Ошибка удаления из избранного");
    }
  };

  const addToCart = async (item: WishlistItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Войдите для добавления в корзину");
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: session.user.id,
          product_id: item.product_id,
          quantity: 1
        });

      if (error) throw error;

      toast.success(`${item.name} добавлен в корзину`);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error(error.message || "Ошибка добавления в корзину");
    }
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
                    overflow: "hidden",
                    boxShadow: "var(--shadow-soft)",
                    display: "flex",
                    flexDirection: "column"
                  }}
                  className="animate-slide-up"
                  data-delay={index * 100}
                >
                  <Link
                    to={`/product/${item.product_id}`}
                    style={{
                      aspectRatio: "3/4",
                      backgroundColor: "hsl(var(--muted))",
                      overflow: "hidden",
                      display: "block",
                      textDecoration: "none"
                    }}
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    )}
                  </Link>

                  <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                    <Link
                      to={`/product/${item.product_id}`}
                      style={{
                        textDecoration: "none",
                        color: "hsl(var(--foreground))",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}
                    >
                      <h3 style={{
                        fontSize: "1.125rem",
                        fontWeight: "500",
                        marginBottom: "0.5rem"
                      }}>
                        {item.name}
                      </h3>
                    </Link>

                    <p style={{
                      fontSize: "1.25rem",
                      color: "hsl(var(--accent))",
                      fontWeight: "600",
                      marginBottom: "1rem"
                    }}>
                      {item.price.toLocaleString('ru-RU')} ₽
                    </p>

                    {item.stock > 0 ? (
                      <p style={{
                        fontSize: "0.9rem",
                        color: "hsl(var(--muted-foreground))",
                        marginBottom: "1rem"
                      }}>
                        В наличии: {item.stock} шт.
                      </p>
                    ) : (
                      <p style={{
                        fontSize: "0.9rem",
                        color: "hsl(var(--destructive))",
                        marginBottom: "1rem"
                      }}>
                        Нет в наличии
                      </p>
                    )}

                    <div style={{
                      display: "flex",
                      gap: "0.75rem",
                      marginTop: "auto"
                    }}>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={item.stock === 0}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          backgroundColor: item.stock === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))",
                          color: "hsl(var(--primary-foreground))",
                          border: "none",
                          fontSize: "0.9rem",
                          fontWeight: "500",
                          cursor: item.stock === 0 ? "not-allowed" : "pointer",
                          transition: "var(--transition)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        gap: "0.5rem"
                      }}
                    >
                      В корзину
                    </button>

                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: "hsl(var(--secondary))",
                          color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "var(--transition)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="Удалить"
                      >
                        Удалить
                      </button>
                    </div>
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

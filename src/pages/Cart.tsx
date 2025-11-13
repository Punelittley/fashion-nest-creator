import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
}

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadCart();
  }, [navigate]);

  const checkAuthAndLoadCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      loadCart();
    }
  };

  const loadCart = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: cartData, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product_id,
          products (
            id,
            name,
            price,
            image_url,
            stock
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;

      const formattedItems = cartData?.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        product_id: item.product_id,
        name: item.products.name,
        price: item.products.price,
        image_url: item.products.image_url,
        stock: item.products.stock
      })) || [];

      setCartItems(formattedItems);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error("Ошибка загрузки корзины");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(cartItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error("Ошибка обновления количества");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(cartItems.filter(item => item.id !== itemId));
      toast.success("Товар удален из корзины");
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error("Ошибка удаления товара");
    }
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          Загрузка...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "3rem",
          color: "hsl(var(--foreground))"
        }}>
          Корзина
        </h1>

        {cartItems.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "4rem 2rem",
            backgroundColor: "hsl(var(--secondary))"
          }}>
            <p style={{
              fontSize: "1.125rem",
              color: "hsl(var(--muted-foreground))",
              marginBottom: "2rem"
            }}>
              Ваша корзина пуста
            </p>
            <button
              onClick={() => navigate("/catalog")}
              style={{
                padding: "0.875rem 2rem",
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                border: "none",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "var(--transition)"
              }}
            >
              Перейти в каталог
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              marginBottom: "3rem"
            }}>
              {cartItems.map(item => (
                <div key={item.id} style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr auto",
                  gap: "1.5rem",
                  padding: "1.5rem",
                  backgroundColor: "hsl(var(--card))",
                  boxShadow: "var(--shadow-soft)"
                }}>
                  <div style={{
                    aspectRatio: "3/4",
                    backgroundColor: "hsl(var(--muted))",
                    overflow: "hidden"
                  }}>
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
                  </div>

                  <div>
                    <h3 style={{
                      fontSize: "1.25rem",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                      color: "hsl(var(--foreground))"
                    }}>
                      {item.name}
                    </h3>
                    <p style={{
                      fontSize: "1.125rem",
                      color: "hsl(var(--accent))",
                      fontWeight: "600",
                      marginBottom: "1rem"
                    }}>
                      {item.price.toLocaleString('ru-RU')} ₽
                    </p>

                    <div style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center"
                    }}>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "hsl(var(--secondary))",
                          border: "none",
                          cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                          fontSize: "1.25rem",
                          color: "hsl(var(--foreground))"
                        }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: "40px", textAlign: "center" }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "hsl(var(--secondary))",
                          border: "none",
                          cursor: item.quantity >= item.stock ? "not-allowed" : "pointer",
                          fontSize: "1.25rem",
                          color: "hsl(var(--foreground))"
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "flex-end"
                  }}>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "hsl(var(--destructive))",
                        cursor: "pointer",
                        padding: "0.5rem",
                        transition: "var(--transition)"
                      }}
                    >
                      <Trash2 size={20} />
                    </button>
                    <p style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: "hsl(var(--foreground))"
                    }}>
                      {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--secondary))"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem"
              }}>
                <span style={{
                  fontSize: "1.5rem",
                  fontWeight: "500",
                  color: "hsl(var(--foreground))"
                }}>
                  Итого:
                </span>
                <span style={{
                  fontSize: "2rem",
                  fontWeight: "600",
                  color: "hsl(var(--accent))"
                }}>
                  {total.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                style={{
                  width: "100%",
                  padding: "1rem 2rem",
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  border: "none",
                  fontSize: "1.05rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "var(--transition)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "hsl(var(--accent))"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "hsl(var(--primary))"}
              >
                Оформить заказ
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Cart;
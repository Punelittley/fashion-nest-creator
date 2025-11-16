import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { mockProducts } from "@/data/mockProducts";

const checkoutSchema = z.object({
  phone: z.string().min(10, { message: "Введите корректный номер телефона" }),
  address: z.string().min(10, { message: "Введите полный адрес доставки" })
});

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    address: ""
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, [navigate]);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      loadData();
    }
  };

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load cart items with product data from DB
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('id, quantity, product_id')
        .eq('user_id', session.user.id);

      if (cartError) throw cartError;

      const formattedItems = cartData?.map((item: any) => {
        const product = mockProducts.find(p => p.id === item.product_id);
        return product ? {
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          name: product.name,
          price: product.price,
          image_url: product.image_url
        } : null;
      }).filter(Boolean) || [];

      setCartItems(formattedItems as CartItem[]);

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('phone, address')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setFormData({
          phone: profileData.phone || "",
          address: profileData.address || ""
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Ошибка загрузки данных");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const validation = checkoutSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (cartItems.length === 0) {
        toast.error("Корзина пуста");
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Необходима авторизация");
        navigate("/auth");
        return;
      }

      const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          shipping_address: formData.address,
          phone: formData.phone,
          total_amount: total,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', session.user.id);

      if (clearError) throw clearError;

      toast.success("Заказ успешно оформлен!");
      navigate("/orders");
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || "Ошибка оформления заказа");
    } finally {
      setLoading(false);
    }
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "3rem",
          color: "hsl(var(--foreground))"
        }}>
          Оформление заказа
        </h1>

        <form onSubmit={handleSubmit} style={{
          display: "flex",
          flexDirection: "column",
          gap: "2rem"
        }}>
          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--card))",
            boxShadow: "var(--shadow-soft)"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "500",
              marginBottom: "1.5rem",
              color: "hsl(var(--foreground))"
            }}>
              Контактная информация
            </h2>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.95rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))"
              }}>
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "1rem"
                }}
                required
              />
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.95rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))"
              }}>
                Адрес доставки
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Город, улица, дом, квартира"
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "1rem",
                  resize: "vertical"
                }}
                required
              />
            </div>
          </div>

          <div style={{
            padding: "2rem",
            backgroundColor: "hsl(var(--secondary))"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "500",
              marginBottom: "1.5rem",
              color: "hsl(var(--foreground))"
            }}>
              Детали заказа
            </h2>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "2rem"
            }}>
              {cartItems.map(item => (
                <div key={item.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  <span>{item.name} × {item.quantity}</span>
                  <span>{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "1.5rem",
              borderTop: "2px solid hsl(var(--border))"
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
          </div>

          <button
            type="submit"
            disabled={loading || cartItems.length === 0}
            style={{
              padding: "1rem 2rem",
              backgroundColor: loading || cartItems.length === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              border: "none",
              fontSize: "1.05rem",
              fontWeight: "500",
              cursor: loading || cartItems.length === 0 ? "not-allowed" : "pointer",
              transition: "var(--transition)"
            }}
            onMouseEnter={(e) => {
              if (!loading && cartItems.length > 0) {
                e.currentTarget.style.backgroundColor = "hsl(var(--accent))";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && cartItems.length > 0) {
                e.currentTarget.style.backgroundColor = "hsl(var(--primary))";
              }
            }}
          >
            {loading ? "Оформление..." : "Подтвердить заказ"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
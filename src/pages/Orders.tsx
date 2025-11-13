import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  quantity: number;
  price: number;
  name: string;
  image_url: string;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address: string;
  order_items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pending: "В обработке",
  processing: "Обрабатывается",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменен"
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadOrders();
  }, [navigate]);

  const checkAuthAndLoadOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      loadOrders();
    }
  };

  const loadOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          shipping_address,
          order_items (
            quantity,
            price,
            products (
              name,
              image_url
            )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data?.map(order => ({
        ...order,
        order_items: order.order_items.map((item: any) => ({
          quantity: item.quantity,
          price: item.price,
          name: item.products.name,
          image_url: item.products.image_url
        }))
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error("Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "3rem",
          color: "hsl(var(--foreground))"
        }}>
          Мои заказы
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-foreground))" }}>
            Загрузка...
          </div>
        ) : orders.length === 0 ? (
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
              У вас пока нет заказов
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
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "2rem"
          }}>
            {orders.map(order => (
              <div key={order.id} style={{
                padding: "2rem",
                backgroundColor: "hsl(var(--card))",
                boxShadow: "var(--shadow-soft)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "1.5rem",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <div>
                    <p style={{
                      fontSize: "0.9rem",
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: "0.25rem"
                    }}>
                      Заказ от {new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </p>
                    <p style={{
                      fontSize: "1.5rem",
                      fontWeight: "600",
                      color: "hsl(var(--accent))"
                    }}>
                      {order.total_amount.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <span style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: order.status === "delivered" ? "hsl(120 50% 90%)" : "hsl(var(--secondary))",
                    color: order.status === "delivered" ? "hsl(120 50% 30%)" : "hsl(var(--foreground))",
                    fontSize: "0.9rem",
                    fontWeight: "500"
                  }}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>

                <div style={{
                  padding: "1rem",
                  backgroundColor: "hsl(var(--secondary))",
                  marginBottom: "1.5rem",
                  fontSize: "0.95rem",
                  color: "hsl(var(--muted-foreground))"
                }}>
                  <strong>Адрес доставки:</strong> {order.shipping_address}
                </div>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem"
                }}>
                  {order.order_items.map((item, index) => (
                    <div key={index} style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr auto",
                      gap: "1rem",
                      alignItems: "center"
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
                        <p style={{
                          fontWeight: "500",
                          color: "hsl(var(--foreground))",
                          marginBottom: "0.25rem"
                        }}>
                          {item.name}
                        </p>
                        <p style={{
                          fontSize: "0.9rem",
                          color: "hsl(var(--muted-foreground))"
                        }}>
                          Количество: {item.quantity}
                        </p>
                      </div>
                      <p style={{
                        fontWeight: "600",
                        color: "hsl(var(--foreground))"
                      }}>
                        {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;
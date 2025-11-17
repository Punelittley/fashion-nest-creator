import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { ordersApi } from "@/lib/api";

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
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate("/auth");
    } else {
      loadOrders();
    }
  };

  const loadOrders = async () => {
    try {
      const data = await ordersApi.get();
      setOrders(data || []);
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
            <p style={{ fontSize: "1.125rem", color: "hsl(var(--muted-foreground))", marginBottom: "2rem" }}>
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
                cursor: "pointer"
              }}
            >
              Перейти в каталог
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {orders.map((order) => (
              <div key={order.id} style={{
                padding: "2rem",
                backgroundColor: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", marginBottom: "0.25rem" }}>
                      Заказ #{order.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}>
                      {new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      display: "inline-block",
                      padding: "0.375rem 0.75rem",
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                      color: "hsl(var(--primary))",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      marginBottom: "0.5rem"
                    }}>
                      {statusLabels[order.status] || order.status}
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "500" }}>
                      {order.total_amount.toLocaleString()} ₽
                    </div>
                  </div>
                </div>

                {order.order_items && order.order_items.length > 0 && (
                  <div style={{ marginBottom: "1rem", paddingTop: "1rem", borderTop: "1px solid hsl(var(--border))" }}>
                    {order.order_items.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: "60px", height: "60px", objectFit: "cover" }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>{item.name}</div>
                          <div style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}>
                            {item.quantity} шт. × {item.price.toLocaleString()} ₽
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {order.shipping_address && (
                  <div style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", paddingTop: "1rem", borderTop: "1px solid hsl(var(--border))" }}>
                    <strong>Адрес доставки:</strong> {order.shipping_address}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;
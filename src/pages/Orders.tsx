import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { localApi } from "@/lib/localApi";

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
  is_favorite?: boolean;
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
  const [favoriteOrderIds, setFavoriteOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuthAndLoadOrders();
  }, [navigate]);

  const checkAuthAndLoadOrders = async () => {
    if (!localApi.isAuthenticated()) {
      navigate("/auth");
    } else {
      loadOrders();
    }
  };

  const loadOrders = async () => {
    try {
      const [ordersData, favoritesData] = await Promise.all([
        localApi.getOrders(),
        localApi.getFavoriteOrders()
      ]);

      const favoriteIds = new Set<string>(favoritesData?.map((f: any) => f.order_id) || []);
      setFavoriteOrderIds(favoriteIds);

      const formattedOrders = ordersData?.map((order: any) => ({
        ...order,
        is_favorite: favoriteIds.has(order.id)
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error("Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (orderId: string) => {
    try {
      const isFavorite = favoriteOrderIds.has(orderId);

      if (isFavorite) {
        await localApi.removeFavoriteOrder(orderId);
        setFavoriteOrderIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, is_favorite: false } : order
        ));
        toast.success("Удалено из избранного");
      } else {
        await localApi.addFavoriteOrder(orderId);
        setFavoriteOrderIds(prev => new Set(prev).add(orderId));
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, is_favorite: true } : order
        ));
        toast.success("Добавлено в избранное");
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || "Ошибка при обновлении избранного");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{
          padding: "4rem 2rem",
          textAlign: "center",
          color: "hsl(var(--muted-foreground))"
        }}>
          Загрузка...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "1rem",
          color: "hsl(var(--foreground))"
        }}>
          Мои заказы
        </h1>
        <p style={{
          fontSize: "1.125rem",
          color: "hsl(var(--muted-foreground))",
          marginBottom: "3rem"
        }}>
          История ваших заказов
        </p>

        {orders.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "4rem",
            backgroundColor: "hsl(var(--card))",
            color: "hsl(var(--muted-foreground))"
          }}>
            <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
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
              Перейти к покупкам
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  backgroundColor: "hsl(var(--card))",
                  padding: "2rem",
                  position: "relative"
                }}
              >
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
                      fontSize: "0.875rem",
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: "0.5rem"
                    }}>
                      Заказ #{order.id.slice(0, 8)}
                    </p>
                    <p style={{
                      fontSize: "0.875rem",
                      color: "hsl(var(--muted-foreground))"
                    }}>
                      {new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <span style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "hsl(var(--accent))",
                      color: "hsl(var(--accent-foreground))",
                      fontSize: "0.875rem",
                      fontWeight: "500"
                    }}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    
                    <button
                      onClick={() => toggleFavorite(order.id)}
                      style={{
                        padding: "0.5rem",
                        backgroundColor: order.is_favorite ? "hsl(var(--primary))" : "transparent",
                        border: `2px solid ${order.is_favorite ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                        cursor: "pointer",
                        fontSize: "1.25rem"
                      }}
                      title={order.is_favorite ? "Удалить из избранного" : "Добавить в избранное"}
                    >
                      {order.is_favorite ? "❤️" : "🤍"}
                    </button>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "1.5rem"
                }}>
                  {order.order_items?.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center"
                      }}
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          backgroundColor: "hsl(var(--muted))"
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: "1rem",
                          fontWeight: "500",
                          color: "hsl(var(--foreground))",
                          marginBottom: "0.25rem"
                        }}>
                          {item.name}
                        </h3>
                        <p style={{
                          fontSize: "0.875rem",
                          color: "hsl(var(--muted-foreground))"
                        }}>
                          Количество: {item.quantity}
                        </p>
                      </div>
                      <p style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "hsl(var(--primary))"
                      }}>
                        {(item.price * item.quantity).toLocaleString()} ₽
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{
                  borderTop: "1px solid hsl(var(--border))",
                  paddingTop: "1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <p style={{
                      fontSize: "0.875rem",
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: "0.25rem"
                    }}>
                      Адрес доставки:
                    </p>
                    <p style={{
                      fontSize: "0.875rem",
                      color: "hsl(var(--foreground))"
                    }}>
                      {order.shipping_address}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{
                      fontSize: "0.875rem",
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: "0.25rem"
                    }}>
                      Итого:
                    </p>
                    <p style={{
                      fontSize: "1.5rem",
                      fontWeight: "600",
                      color: "hsl(var(--primary))"
                    }}>
                      {order.total_amount.toLocaleString()} ₽
                    </p>
                  </div>
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

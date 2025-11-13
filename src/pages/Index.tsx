import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import HeroSlider from "@/components/HeroSlider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

const Index = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .eq("is_active", true)
      .limit(3);
    
    if (data) {
      setFeaturedProducts(data);
    }
  };

  return (
    <Layout>
      {/* Hero Slider */}
      <HeroSlider />

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section style={{
          padding: "6rem 2rem",
          maxWidth: "1400px",
          margin: "0 auto"
        }}>
          <h2 style={{
            fontSize: "2.5rem",
            fontWeight: "500",
            textAlign: "center",
            marginBottom: "3rem",
            color: "hsl(var(--foreground))"
          }}>
            Популярные товары
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem"
          }}>
            {featuredProducts.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
                transition: "var(--transition)"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}>
                <div style={{
                  aspectRatio: "3/4",
                  backgroundColor: "hsl(var(--muted))",
                  marginBottom: "1rem",
                  overflow: "hidden",
                  position: "relative"
                }}>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }} />
                  )}
                </div>
                <h3 style={{
                  fontSize: "1.125rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                  color: "hsl(var(--foreground))"
                }}>
                  {product.name}
                </h3>
                <p style={{
                  fontSize: "1rem",
                  color: "hsl(var(--accent))",
                  fontWeight: "600"
                }}>
                  {product.price.toLocaleString('ru-RU')} ₽
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section style={{
        backgroundColor: "hsl(var(--secondary))",
        padding: "6rem 2rem"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "3rem"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "2rem",
              marginBottom: "1rem"
            }}>🚚</div>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
              color: "hsl(var(--foreground))"
            }}>
              Быстрая доставка
            </h3>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.6"
            }}>
              Доставим ваш заказ в течение 1-3 дней по всей России
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "2rem",
              marginBottom: "1rem"
            }}>✨</div>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
              color: "hsl(var(--foreground))"
            }}>
              Качество
            </h3>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.6"
            }}>
              Работаем только с проверенными брендами и поставщиками
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "2rem",
              marginBottom: "1rem"
            }}>💳</div>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
              color: "hsl(var(--foreground))"
            }}>
              Безопасная оплата
            </h3>
            <p style={{
              color: "hsl(var(--muted-foreground))",
              lineHeight: "1.6"
            }}>
              Принимаем все виды оплаты с защитой данных
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import HeroSlider from "@/components/HeroSlider";
import { useEffect, useState } from "react";
import { productsApi } from "@/lib/api";

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
    try {
      const products = await productsApi.getAll();
      setFeaturedProducts(products.slice(0, 3));
    } catch (error) {
      console.error('Error loading featured products:', error);
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

      {/* Promo Banner */}
      <section style={{
        backgroundColor: "hsl(var(--accent))",
        padding: "4rem 2rem",
        textAlign: "center"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto"
        }}>
          <h2 style={{
            fontSize: "2.5rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: "hsl(var(--accent-foreground))"
          }}>
            Скидка 30% на новую коллекцию
          </h2>
          <p style={{
            fontSize: "1.25rem",
            marginBottom: "2rem",
            color: "hsl(var(--accent-foreground))",
            opacity: 0.9
          }}>
            Успейте приобрести лучшие модели сезона по специальной цене
          </p>
          <Link to="/catalog" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 2.5rem",
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            textDecoration: "none",
            fontSize: "1.125rem",
            fontWeight: "500",
            transition: "var(--transition)",
            border: "2px solid transparent"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "hsl(var(--accent-foreground))";
            e.currentTarget.style.borderColor = "hsl(var(--accent-foreground))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "hsl(var(--background))";
            e.currentTarget.style.color = "hsl(var(--foreground))";
            e.currentTarget.style.borderColor = "transparent";
          }}>
            Перейти в каталог
          </Link>
        </div>
      </section>

      {/* Reviews */}
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
          Отзывы клиентов
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem"
        }}>
          <div style={{
            backgroundColor: "hsl(var(--secondary))",
            padding: "2rem",
            borderRadius: "8px"
          }}>
            <div style={{
              display: "flex",
              gap: "0.25rem",
              marginBottom: "1rem"
            }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ color: "hsl(var(--accent))", fontSize: "1.25rem" }}>★</span>
              ))}
            </div>
            <p style={{
              marginBottom: "1rem",
              lineHeight: "1.6",
              color: "hsl(var(--foreground))"
            }}>
              "Отличное качество одежды! Все соответствует описанию. Доставка быстрая, упаковка аккуратная."
            </p>
            <p style={{
              fontWeight: "500",
              color: "hsl(var(--muted-foreground))"
            }}>
              — Анна К.
            </p>
          </div>
          <div style={{
            backgroundColor: "hsl(var(--secondary))",
            padding: "2rem",
            borderRadius: "8px"
          }}>
            <div style={{
              display: "flex",
              gap: "0.25rem",
              marginBottom: "1rem"
            }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ color: "hsl(var(--accent))", fontSize: "1.25rem" }}>★</span>
              ))}
            </div>
            <p style={{
              marginBottom: "1rem",
              lineHeight: "1.6",
              color: "hsl(var(--foreground))"
            }}>
              "Впервые заказываю здесь и очень довольна! Стильные вещи по приятным ценам. Обязательно вернусь за покупками."
            </p>
            <p style={{
              fontWeight: "500",
              color: "hsl(var(--muted-foreground))"
            }}>
              — Мария С.
            </p>
          </div>
          <div style={{
            backgroundColor: "hsl(var(--secondary))",
            padding: "2rem",
            borderRadius: "8px"
          }}>
            <div style={{
              display: "flex",
              gap: "0.25rem",
              marginBottom: "1rem"
            }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ color: "hsl(var(--accent))", fontSize: "1.25rem" }}>★</span>
              ))}
            </div>
            <p style={{
              marginBottom: "1rem",
              lineHeight: "1.6",
              color: "hsl(var(--foreground))"
            }}>
              "Прекрасный сервис! Консультанты помогли с выбором размера. Товар пришел точно в срок."
            </p>
            <p style={{
              fontWeight: "500",
              color: "hsl(var(--muted-foreground))"
            }}>
              — Елена В.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
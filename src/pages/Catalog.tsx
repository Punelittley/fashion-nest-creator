import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true),
      supabase.from("categories").select("*")
    ]);

    if (productsData) setProducts(productsData);
    if (categoriesData) setCategories(categoriesData);
    setLoading(false);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "1rem",
          color: "hsl(var(--foreground))"
        }}>
          Каталог
        </h1>
        <p style={{
          fontSize: "1.125rem",
          color: "hsl(var(--muted-foreground))",
          marginBottom: "3rem"
        }}>
          Полная коллекция товаров
        </p>

        {/* Filters */}
        <div style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "3rem",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: selectedCategory === null ? "hsl(var(--primary))" : "hsl(var(--secondary))",
              color: selectedCategory === null ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              border: "none",
              cursor: "pointer",
              fontSize: "0.95rem",
              transition: "var(--transition)"
            }}
          >
            Все
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                padding: "0.5rem 1.5rem",
                backgroundColor: selectedCategory === category.id ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                color: selectedCategory === category.id ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                border: "none",
                cursor: "pointer",
                fontSize: "0.95rem",
                transition: "var(--transition)"
              }}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-foreground))" }}>
            Загрузка...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-foreground))" }}>
            Товары не найдены
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "2rem"
          }}>
            {filteredProducts.map(product => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  transition: "var(--transition)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-8px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{
                  aspectRatio: "3/4",
                  backgroundColor: "hsl(var(--muted))",
                  marginBottom: "1rem",
                  overflow: "hidden"
                }}>
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
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
        )}
      </div>
    </Layout>
  );
};

export default Catalog;
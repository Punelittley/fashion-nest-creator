import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockProducts, mockCategories } from "@/data/mockProducts";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  images?: string[] | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: dbProducts, error: pErr } = await supabase
          .from('products')
          .select('id, name, price, image_url, images, category_id, is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (pErr) throw pErr;

        const { data: dbCategories, error: cErr } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');

        if (cErr) throw cErr;

        setProducts((dbProducts || []) as any);
        setCategories((dbCategories || []) as any);
      } catch (e) {
        // Фолбэк на мок-данные
        setProducts(mockProducts as any);
        setCategories(mockCategories as any);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const refresh = () => {
      // перезагрузить данные каталога после добавления из админки
      (async () => {
        const { data: dbProducts } = await supabase
          .from('products')
          .select('id, name, price, image_url, images, category_id, is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (dbProducts) setProducts(dbProducts as any);
      })();
    };
    // @ts-ignore
    window.addEventListener('products:refresh', refresh);
    return () => {
      // @ts-ignore
      window.removeEventListener('products:refresh', refresh);
    };
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  // Apply search filter
  const searchedProducts = searchQuery
    ? filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredProducts;

  // Apply sorting
  const sortedProducts = [...searchedProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

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
          marginBottom: "2rem",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <Input
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: "300px" }}
          />
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger style={{ width: "200px" }}>
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">По названию</SelectItem>
              <SelectItem value="price-asc">Цена: по возрастанию</SelectItem>
              <SelectItem value="price-desc">Цена: по убыванию</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
        ) : sortedProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-foreground))" }}>
            Товары не найдены
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "2rem"
          }}>
            {sortedProducts.map(product => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block"
                }}
              >
                <div style={{
                  aspectRatio: "3/4",
                  backgroundColor: "hsl(var(--muted))",
                  overflow: "hidden",
                  marginBottom: "1rem"
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
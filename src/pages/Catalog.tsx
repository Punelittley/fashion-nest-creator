import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productsApi, categoriesApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { ProductImageSlider } from "@/components/ProductImageSlider";

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
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data || []);
    } catch (error) {
      console.log('📦 SQLite недоступен, загружаю из Supabase...');
      try {
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);
        
        if (supabaseError) throw supabaseError;
        setProducts(data || []);
      } catch (supabaseErr) {
        console.error('Error loading products:', supabaseErr);
      }
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data || []);
    } catch (error) {
      console.log('📦 SQLite недоступен, загружаю категории из Supabase...');
      try {
        const { data, error: supabaseError } = await supabase
          .from('categories')
          .select('*');
        
        if (supabaseError) throw supabaseError;
        setCategories(data || []);
      } catch (supabaseErr) {
        console.error('Error loading categories:', supabaseErr);
      }
    }
  };

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
            {sortedProducts.map(product => {
              const images = product.images 
                ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images)
                : (product.image_url ? [product.image_url] : []);

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block"
                  }}
                >
                  <ProductImageSlider 
                    images={images}
                    alt={product.name}
                  />
                  <h3 style={{
                    fontSize: "1.125rem",
                    fontWeight: "500",
                    marginTop: "1rem",
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
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Catalog;
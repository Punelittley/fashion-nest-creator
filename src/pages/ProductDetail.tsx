import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { ProductImageSlider } from "@/components/ProductImageSlider";
import { productsApi, cartApi } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  images?: string[] | null;
  stock: number;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
      checkFavoriteStatus();
    }
  }, [id]);

  useEffect(() => {
    const refresh = () => {
      if (id) {
        loadProduct();
      }
    };
    // @ts-ignore
    window.addEventListener('products:refresh', refresh);
    return () => {
      // @ts-ignore
      window.removeEventListener('products:refresh', refresh);
    };
  }, [id]);

  const loadProduct = async () => {
    if (!id) return;
    
    setLoading(true);
    
    try {
      const data = await productsApi.getById(id);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Товар не найден');
      navigate("/catalog");
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!id) return;
    try {
      const stored = localStorage.getItem('wishlist');
      const productIds = stored ? JSON.parse(stored) : [];
      setIsFavorite(productIds.includes(id));
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      toast.error("Войдите для добавления в избранное");
      navigate("/auth");
      return;
    }

    if (!product) return;

    setCheckingFavorite(true);
    try {
      const stored = localStorage.getItem('wishlist');
      const productIds = stored ? JSON.parse(stored) : [];
      
      if (isFavorite) {
        const updated = productIds.filter((pid: string) => pid !== product.id);
        localStorage.setItem('wishlist', JSON.stringify(updated));
        setIsFavorite(false);
        toast.success("Удалено из избранного");
      } else {
        if (!productIds.includes(product.id)) {
          productIds.push(product.id);
          localStorage.setItem('wishlist', JSON.stringify(productIds));
        }
        setIsFavorite(true);
        toast.success("Добавлено в избранное");
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || "Ошибка изменения избранного");
    } finally {
      setCheckingFavorite(false);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      toast.error("Войдите для добавления в корзину");
      navigate("/auth");
      return;
    }

    if (!product) return;

    setAddingToCart(true);
    try {
      await cartApi.add(product.id, quantity);
      toast.success("Товар добавлен в корзину");
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error(error.message || "Ошибка добавления в корзину");
    } finally {
      setAddingToCart(false);
    }
  };

  if (!product) {
    return (
      <Layout>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          {loading ? "Загрузка..." : "Товар не найден"}
        </div>
      </Layout>
    );
  }

  const images = product.images || (product.image_url ? [product.image_url] : []);

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <button
          onClick={() => navigate("/catalog")}
          style={{
            marginBottom: "2rem",
            padding: "0.75rem 1.5rem",
            backgroundColor: "hsl(var(--secondary))",
            color: "hsl(var(--secondary-foreground))",
            border: "none",
            fontSize: "1rem",
            cursor: "pointer"
          }}
        >
          ← Назад к каталогу
        </button>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem"
        }}>
          <div>
            <ProductImageSlider images={images} alt={product.name} />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "2.5rem", fontWeight: "500", marginBottom: "0" }}>
                {product.name}
              </h1>
              <button
                onClick={toggleFavorite}
                disabled={checkingFavorite}
                style={{
                  background: "none",
                  border: "1px solid hsl(var(--border))",
                  padding: "0.75rem",
                  cursor: "pointer"
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill={isFavorite ? "hsl(var(--primary))" : "none"}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            <div style={{ fontSize: "2rem", fontWeight: "500", color: "hsl(var(--primary))", marginBottom: "2rem" }}>
              {product.price.toLocaleString()} ₽
            </div>

            {product.description && (
              <p style={{ fontSize: "1.125rem", lineHeight: "1.8", marginBottom: "2rem" }}>
                {product.description}
              </p>
            )}

            <div style={{ padding: "1.5rem", backgroundColor: "hsl(var(--secondary))", marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>В наличии:</span>
                <span style={{ fontWeight: "500" }}>
                  {product.stock > 0 ? `${product.stock} шт.` : "Нет в наличии"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ display: "flex", border: "1px solid hsl(var(--border))" }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ padding: "0.75rem 1.25rem", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  −
                </button>
                <span style={{ padding: "0 1.5rem", fontSize: "1.125rem", display: "flex", alignItems: "center" }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  style={{ padding: "0.75rem 1.25rem", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || addingToCart}
              style={{
                width: "100%",
                padding: "1.25rem",
                backgroundColor: product.stock === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))",
                color: product.stock === 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
                border: "none",
                fontSize: "1.125rem",
                fontWeight: "500",
                cursor: product.stock === 0 ? "not-allowed" : "pointer"
              }}
            >
              {addingToCart ? "Добавление..." : product.stock === 0 ? "Нет в наличии" : "Добавить в корзину"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
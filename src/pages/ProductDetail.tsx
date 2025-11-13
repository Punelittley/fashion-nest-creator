import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { productsApi, cartApi } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const data = await productsApi.getById(id!);
      setProduct(data);
    } catch (error) {
      toast.error("Товар не найден");
      navigate("/catalog");
    } finally {
      setLoading(false);
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
      toast.error(error.message || "Ошибка добавления в корзину");
    } finally {
      setAddingToCart(false);
    }
  };

  if (!product) {
    return (
      <Layout>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          Загрузка...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "4rem",
          alignItems: "start"
        }}>
          <div style={{
            aspectRatio: "3/4",
            backgroundColor: "hsl(var(--muted))",
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

          <div>
            <h1 style={{
              fontSize: "2.5rem",
              fontWeight: "500",
              marginBottom: "1rem",
              color: "hsl(var(--foreground))"
            }}>
              {product.name}
            </h1>

            <p style={{
              fontSize: "2rem",
              color: "hsl(var(--accent))",
              fontWeight: "600",
              marginBottom: "2rem"
            }}>
              {product.price.toLocaleString('ru-RU')} ₽
            </p>

            <p style={{
              lineHeight: "1.8",
              color: "hsl(var(--muted-foreground))",
              marginBottom: "2rem",
              fontSize: "1.05rem"
            }}>
              {product.description || "Описание товара отсутствует"}
            </p>

            <div style={{
              padding: "1.5rem",
              backgroundColor: "hsl(var(--secondary))",
              marginBottom: "2rem"
            }}>
              <p style={{ color: "hsl(var(--muted-foreground))" }}>
                <strong>В наличии:</strong> {product.stock} шт.
              </p>
            </div>

            <div style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              marginBottom: "2rem"
            }}>
              <label style={{
                fontSize: "1rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))"
              }}>
                Количество:
              </label>
              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                style={{
                  width: "80px",
                  padding: "0.5rem",
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "1rem"
                }}
              />
            </div>

            <button
              onClick={handleAddToCart}
              disabled={loading || product.stock === 0}
              style={{
                width: "100%",
                padding: "1rem 2rem",
                backgroundColor: loading || product.stock === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                border: "none",
                fontSize: "1.05rem",
                fontWeight: "500",
                cursor: loading || product.stock === 0 ? "not-allowed" : "pointer",
                transition: "var(--transition)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem"
              }}
              onMouseEnter={(e) => {
                if (!loading && product.stock > 0) {
                  e.currentTarget.style.backgroundColor = "hsl(var(--accent))";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && product.stock > 0) {
                  e.currentTarget.style.backgroundColor = "hsl(var(--primary))";
                }
              }}
            >
              <ShoppingCart size={20} />
              {product.stock === 0 ? "Нет в наличии" : (loading ? "Добавление..." : "Добавить в корзину")}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
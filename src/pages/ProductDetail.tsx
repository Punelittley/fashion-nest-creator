import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProductImageSlider } from "@/components/ProductImageSlider";
import { mockProducts } from "@/data/mockProducts";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
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

  const loadProduct = async () => {
    try {
      // Используем моковые данные вместо загрузки из базы
      const foundProduct = mockProducts.find(p => p.id === id && p.is_active);

      if (!foundProduct) {
        throw new Error('Product not found');
      }

      setProduct(foundProduct);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error("Товар не найден");
      navigate("/catalog");
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !id) return;

      const { data } = await supabase
        .from('favorite_products')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('product_id', id)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Войдите для добавления в избранное");
      navigate("/auth");
      return;
    }

    if (!product) return;

    setCheckingFavorite(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorite_products')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', product.id);

        if (error) throw error;

        setIsFavorite(false);
        toast.success("Удалено из избранного");
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorite_products')
          .insert({
            user_id: session.user.id,
            product_id: product.id
          });

        if (error) throw error;

        setIsFavorite(true);
        toast.success("Добавлено в избранное");
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || "Ошибка при обновлении избранного");
    } finally {
      setCheckingFavorite(false);
    }
  };

  const handleAddToCart = async () => {
    // Check Supabase auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Войдите для добавления в корзину");
      navigate("/auth");
      return;
    }

    if (!product) return;

    setAddingToCart(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: session.user.id,
          product_id: product.id,
          quantity: quantity
        });

      if (error) throw error;

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
          Загрузка...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ 
        padding: "6rem 2rem", 
        maxWidth: "1600px", 
        margin: "0 auto"
      }}>
        {/* Breadcrumb */}
        <div style={{ 
          marginBottom: "3rem", 
          fontSize: "0.95rem",
          color: "hsl(var(--muted-foreground))"
        }}>
          <button 
            onClick={() => navigate('/catalog')}
            style={{
              background: "none",
              border: "none",
              color: "hsl(var(--muted-foreground))",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            Каталог
          </button>
          {" "} / {" "}
          <span style={{ color: "hsl(var(--foreground))" }}>{product.name}</span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "5rem",
          alignItems: "start"
        }}>
          {/* Image Section */}
          <div>
            <ProductImageSlider 
              images={product.images || (product.image_url ? [product.image_url] : [])}
              alt={product.name}
            />
          </div>

          {/* Product Info Section */}
          <div style={{
            position: "sticky",
            top: "2rem"
          }}>
            <h1 style={{
              fontSize: "3.5rem",
              fontWeight: "600",
              marginBottom: "1.5rem",
              color: "hsl(var(--foreground))",
              lineHeight: "1.2"
            }}>
              {product.name}
            </h1>

            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: "1rem",
              marginBottom: "2.5rem"
            }}>
              <p style={{
                fontSize: "3rem",
                color: "hsl(var(--accent))",
                fontWeight: "700"
              }}>
                {product.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>

            {/* Description */}
            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--secondary))",
              borderRadius: "0.5rem",
              marginBottom: "2.5rem"
            }}>
              <h3 style={{
                fontSize: "1.2rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Описание
              </h3>
              <p style={{
                lineHeight: "1.8",
                color: "hsl(var(--muted-foreground))",
                fontSize: "1.1rem"
              }}>
                {product.description || "Описание товара отсутствует"}
              </p>
            </div>

            {/* Stock & Availability */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "2.5rem"
            }}>
              <div style={{
                padding: "1.5rem",
                backgroundColor: "hsl(var(--muted))",
                borderRadius: "0.5rem",
                textAlign: "center"
              }}>
                <p style={{ 
                  fontSize: "0.9rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.5rem"
                }}>
                  В наличии
                </p>
                <p style={{ 
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: "hsl(var(--foreground))"
                }}>
                  {product.stock} шт
                </p>
              </div>
              <div style={{
                padding: "1.5rem",
                backgroundColor: "hsl(var(--muted))",
                borderRadius: "0.5rem",
                textAlign: "center"
              }}>
                <p style={{ 
                  fontSize: "0.9rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.5rem"
                }}>
                  Статус
                </p>
                <p style={{ 
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  color: product.stock > 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"
                }}>
                  {product.stock > 0 ? "✓ Доступно" : "✗ Нет в наличии"}
                </p>
              </div>
            </div>

            {/* Quantity Selector */}
            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--secondary))",
              borderRadius: "0.5rem",
              marginBottom: "2rem"
            }}>
              <label style={{
                display: "block",
                fontSize: "1.1rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "hsl(var(--foreground))"
              }}>
                Количество:
              </label>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem"
              }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: "hsl(var(--background))",
                    border: "2px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "1.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    borderRadius: "0.25rem",
                    transition: "var(--transition)"
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                  style={{
                    flex: 1,
                    height: "50px",
                    padding: "0 1rem",
                    backgroundColor: "hsl(var(--background))",
                    border: "2px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    textAlign: "center",
                    borderRadius: "0.25rem"
                  }}
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: quantity >= product.stock ? "hsl(var(--muted))" : "hsl(var(--background))",
                    border: "2px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "1.5rem",
                    fontWeight: "600",
                    cursor: quantity >= product.stock ? "not-allowed" : "pointer",
                    borderRadius: "0.25rem",
                    transition: "var(--transition)"
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "2rem"
            }}>
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || product.stock === 0}
                style={{
                  flex: 1,
                  padding: "1.5rem 2rem",
                  backgroundColor: addingToCart || product.stock === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  border: "none",
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  cursor: addingToCart || product.stock === 0 ? "not-allowed" : "pointer",
                  transition: "var(--transition)",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                }}
              >
                {addingToCart ? "Добавление..." : product.stock === 0 ? "Нет в наличии" : "🛒 Добавить в корзину"}
              </button>

              <button
                onClick={toggleFavorite}
                disabled={checkingFavorite}
                style={{
                  padding: "1.5rem",
                  backgroundColor: isFavorite ? "hsl(var(--accent))" : "hsl(var(--secondary))",
                  color: isFavorite ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: checkingFavorite ? "wait" : "pointer",
                  transition: "var(--transition)",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                }}
              >
                {isFavorite ? "❤️" : "🤍"}
              </button>
            </div>

            {/* Features */}
            <div style={{
              padding: "2rem",
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "0.5rem"
            }}>
              <h3 style={{
                fontSize: "1.1rem",
                fontWeight: "600",
                marginBottom: "1.5rem",
                color: "hsl(var(--foreground))"
              }}>
                Преимущества
              </h3>
              <div style={{
                display: "grid",
                gap: "1rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>🚚</span>
                  <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "1rem" }}>
                    Бесплатная доставка от 5000 ₽
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>↩️</span>
                  <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "1rem" }}>
                    Возврат в течение 14 дней
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>✨</span>
                  <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "1rem" }}>
                    Гарантия качества
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
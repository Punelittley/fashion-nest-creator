import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProductImageSlider } from "@/components/ProductImageSlider";
import { productsApi, cartApi, favoritesApi } from "@/lib/api";

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
  const [dataSource, setDataSource] = useState<'sqlite' | 'supabase' | null>(null);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  useEffect(() => {
    if (id && dataSource) {
      checkFavoriteStatus();
    }
  }, [id, dataSource]);

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
      setDataSource('sqlite');
      console.log('✅ Товар загружен из SQLite, dataSource=sqlite');
    } catch (error) {
      console.log('📦 SQLite недоступен, загружаю товар из Supabase...');
      try {
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (supabaseError || !data) {
          toast.error('Товар не найден');
          navigate("/catalog");
          return;
        }
        
        setProduct(data);
        setDataSource('supabase');
        console.log('✅ Товар загружен из Supabase, dataSource=supabase');
      } catch (supabaseErr) {
        console.error('Error loading product:', supabaseErr);
        toast.error('Товар не найден');
        navigate("/catalog");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!id || !dataSource) return;
    try {
      if (dataSource === 'sqlite') {
        const result = await favoritesApi.check(id);
        setIsFavorite(result.isFavorite);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
    if (!product || !dataSource) return;

    // Проверка авторизации
    if (dataSource === 'sqlite') {
      const authToken = localStorage.getItem('auth_token');
      console.log('🔍 Проверка токена для избранного:', authToken ? `${authToken.substring(0, 20)}...` : 'отсутствует');
      console.log('🔍 dataSource:', dataSource);
      if (!authToken || authToken === 'supabase') {
        toast.error("Войдите для добавления в избранное");
        navigate("/auth");
        return;
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Войдите для добавления в избранное");
        navigate("/auth");
        return;
      }
    }

    setCheckingFavorite(true);
    try {
      if (isFavorite) {
        if (dataSource === 'sqlite') {
          await favoritesApi.removeByProductId(product.id);
          setIsFavorite(false);
          toast.success("Удалено из избранного");
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error("Войдите для добавления в избранное");
            navigate("/auth");
            return;
          }
          const { error: supabaseError } = await supabase
            .from('favorite_products')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_id', product.id);
          if (supabaseError) throw supabaseError;
          setIsFavorite(false);
          toast.success("Удалено из избранного");
        }
      } else {
        if (dataSource === 'sqlite') {
          await favoritesApi.add(product.id);
          setIsFavorite(true);
          toast.success("Добавлено в избранное");
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error("Войдите для добавления в избранное");
            navigate("/auth");
            return;
          }
          const { error: supabaseError } = await supabase
            .from('favorite_products')
            .insert({
              user_id: session.user.id,
              product_id: product.id
            });
          if (supabaseError) {
            // @ts-ignore
            if ((supabaseError as any).code === '23505') {
              setIsFavorite(true);
              toast.success("Уже в избранном");
            } else {
              throw supabaseError;
            }
          } else {
            setIsFavorite(true);
            toast.success("Добавлено в избранное");
          }
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || "Ошибка при обновлении избранного");
    } finally {
      setCheckingFavorite(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product || !dataSource) return;

    // Проверка авторизации
    if (dataSource === 'sqlite') {
      const authToken = localStorage.getItem('auth_token');
      console.log('🔍 Проверка токена для корзины:', authToken ? `${authToken.substring(0, 20)}...` : 'отсутствует');
      console.log('🔍 dataSource:', dataSource);
      if (!authToken || authToken === 'supabase') {
        toast.error("Войдите для добавления в корзину");
        navigate("/auth");
        return;
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Войдите для добавления в корзину");
        navigate("/auth");
        return;
      }
    }

    setAddingToCart(true);
    try {
      if (dataSource === 'sqlite') {
        await cartApi.add(product.id, quantity);
        toast.success("Товар добавлен в корзину");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Войдите для добавления в корзину");
        navigate("/auth");
        return;
      }

      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity
          });
        if (insertError) throw insertError;
      }

      toast.success("Товар добавлен в корзину");
    } catch (e: any) {
      console.error('Error adding to cart:', e);
      toast.error(e.message || "Ошибка добавления в корзину");
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
          <ProductImageSlider 
            images={product.images || (product.image_url ? [product.image_url] : [])}
            alt={product.name}
          />

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

            <div style={{
              display: "flex",
              gap: "1rem"
            }}>
              <button
                onClick={handleAddToCart}
                disabled={loading || product.stock === 0}
                style={{
                  flex: 1,
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
                {product.stock === 0 ? "Нет в наличии" : (loading ? "Добавление..." : "Добавить в корзину")}
              </button>

              <button
                onClick={toggleFavorite}
                disabled={checkingFavorite}
                style={{
                  padding: "1rem 1.5rem",
                  backgroundColor: isFavorite ? "hsl(var(--accent))" : "hsl(var(--secondary))",
                  color: isFavorite ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "1.05rem",
                  fontWeight: "500",
                  cursor: checkingFavorite ? "not-allowed" : "pointer",
                  transition: "var(--transition)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseEnter={(e) => {
                  if (!checkingFavorite) {
                    e.currentTarget.style.backgroundColor = isFavorite ? "hsl(var(--primary))" : "hsl(var(--accent))";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!checkingFavorite) {
                    e.currentTarget.style.backgroundColor = isFavorite ? "hsl(var(--accent))" : "hsl(var(--secondary))";
                  }
                }}
                title={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
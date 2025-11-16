import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

const ProductsManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    image_url: "",
    is_active: true
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      toast.error('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
      toast.error('Ошибка загрузки категорий');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      category_id: product.category_id || "",
      image_url: product.image_url || "",
      is_active: product.is_active
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct) return;

    try {
      setUploading(true);

      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          category_id: formData.category_id || null,
          image_url: formData.image_url || null,
          is_active: formData.is_active
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast.success('Товар успешно обновлен');
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        stock: "",
        category_id: "",
        image_url: "",
        is_active: true
      });
      loadProducts();
    } catch (error) {
      console.error('Ошибка обновления товара:', error);
      toast.error('Ошибка обновления товара');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Товар успешно удален');
      loadProducts();
    } catch (error) {
      console.error('Ошибка удаления товара:', error);
      toast.error('Ошибка удаления товара');
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Загрузка...</div>;
  }

  return (
    <div style={{
      backgroundColor: "hsl(var(--card))",
      padding: "2rem",
      borderRadius: "8px",
      boxShadow: "var(--shadow-soft)"
    }}>
      <h2 style={{
        fontSize: "1.5rem",
        fontWeight: "600",
        marginBottom: "1.5rem",
        color: "hsl(var(--foreground))"
      }}>
        Управление товарами
      </h2>

      <div style={{
        display: "grid",
        gap: "1rem"
      }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              padding: "1.5rem",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "hsl(var(--background))"
            }}
          >
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flex: 1 }}>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{
                    width: "60px",
                    height: "60px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    border: "1px solid hsl(var(--border))"
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "hsl(var(--foreground))",
                  marginBottom: "0.25rem"
                }}>
                  {product.name}
                </h3>
                <p style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.5rem"
                }}>
                  {product.description}
                </p>
                <div style={{
                  display: "flex",
                  gap: "1rem",
                  fontSize: "0.875rem",
                  color: "hsl(var(--foreground))"
                }}>
                  <span>Цена: {product.price} ₽</span>
                  <span>В наличии: {product.stock}</span>
                  <span>Статус: {product.is_active ? "Активен" : "Неактивен"}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => handleEdit(product)}
                style={{
                  padding: "0.5rem",
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                style={{
                  padding: "0.5rem",
                  backgroundColor: "hsl(var(--destructive))",
                  color: "hsl(var(--destructive-foreground))",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent 
          className="max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: "hsl(var(--card))",
            maxWidth: "600px"
          }}
        >
          <DialogHeader>
            <DialogTitle>Редактировать товар</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} style={{
            display: "grid",
            gap: "1rem"
          }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
                color: "hsl(var(--foreground))"
              }}>
                Название товара
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))"
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
                color: "hsl(var(--foreground))"
              }}>
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem"
            }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                  color: "hsl(var(--foreground))"
                }}>
                  Цена (₽)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))"
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                  color: "hsl(var(--foreground))"
                }}>
                  Количество
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))"
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
                color: "hsl(var(--foreground))"
              }}>
                Категория
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))"
                }}
              >
                <option value="">Выберите категорию</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
                color: "hsl(var(--foreground))"
              }}>
                URL изображения
              </label>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="/images/category/image.jpg"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))"
                }}
              />
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  style={{ 
                    marginTop: "0.5rem", 
                    maxWidth: "200px", 
                    borderRadius: "6px",
                    border: "1px solid hsl(var(--border))"
                  }} 
                />
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ width: "20px", height: "20px" }}
              />
              <label style={{
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "hsl(var(--foreground))"
              }}>
                Активный товар
              </label>
            </div>

            <button
              type="submit"
              style={{
                padding: "1rem",
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                border: "none",
                borderRadius: "6px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Сохранить изменения
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsManagement;

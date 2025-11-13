import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackagePlus, Upload } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

const AddProductForm = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    image_url: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      toast.error("Ошибка загрузки категорий");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.stock || !formData.category_id) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          category_id: formData.category_id,
          image_url: formData.image_url || null,
          is_active: true
        }]);

      if (error) throw error;

      toast.success("Товар успешно добавлен");
      setFormData({
        name: "",
        description: "",
        price: "",
        stock: "",
        category_id: "",
        image_url: ""
      });
    } catch (error) {
      toast.error("Ошибка добавления товара");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
        color: "hsl(var(--foreground))",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
      }}>
        <PackagePlus size={24} />
        Добавить товар
      </h2>

      <form onSubmit={handleSubmit} style={{
        display: "grid",
        gap: "1.5rem"
      }}>
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "500",
            marginBottom: "0.5rem",
            color: "hsl(var(--foreground))"
          }}>
            Название товара *
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
            rows={4}
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
              Цена (₽) *
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
              Количество *
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
            Категория *
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
            <Upload size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
            URL изображения
          </label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
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

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "1rem",
            backgroundColor: loading ? "hsl(var(--muted))" : "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "var(--transition)"
          }}
        >
          {loading ? "Добавление..." : "Добавить товар"}
        </button>
      </form>
    </div>
  );
};

export default AddProductForm;

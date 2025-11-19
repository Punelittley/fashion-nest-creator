import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { productsApi, categoriesApi, uploadApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
}

interface AddProductFormProps {
  onProductAdded: () => void;
}

const AddProductForm = ({ onProductAdded }: AddProductFormProps) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImageFiles(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.stock) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    // Требуем либо загруженный файл, либо URL изображения
    if ((!imageFiles || imageFiles.length === 0)) {
      toast({
        title: "Ошибка",
        description: "Загрузите хотя бы одно изображение",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let uploadedImages: string[] = [];

      // Загружаем файлы если они выбраны
      if (imageFiles && imageFiles.length > 0) {
        try {
          // Пытаемся загрузить через SQLite API
          const categoryName = categories.find(c => c.id === formData.category_id)?.name.toLowerCase() || 'other';
          const result = await uploadApi.uploadImages(imageFiles, categoryName);
          uploadedImages = result.images;
          console.log('✅ Изображения загружены через SQLite');
        } catch (uploadError) {
          console.log('📦 SQLite недоступен, загружаю в Supabase Storage...');
          
          // Fallback на Lovable Cloud Storage
          try {
            const uploadPromises = Array.from(imageFiles).map(async (file) => {
              const fileExt = file.name.split('.').pop();
              const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
              const filePath = `${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

              return publicUrl;
            });

            uploadedImages = await Promise.all(uploadPromises);
            console.log('✅ Изображения загружены в Lovable Cloud Storage');
          } catch (supabaseUploadError) {
            console.error('Ошибка загрузки в хранилище:', supabaseUploadError);
            toast({
              title: "Ошибка",
              description: "Не удалось загрузить изображения",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      const finalImages = uploadedImages.length > 0 ? uploadedImages : [];
      const finalImageUrl = finalImages[0] || '';

      // Если нет изображений, не создаем товар
      if (finalImages.length === 0) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить изображения",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category_id: formData.category_id || null,
        image_url: finalImageUrl,
        images: JSON.stringify(finalImages),
        is_active: true,
      };

      try {
        await productsApi.create(productData);
        toast({
          title: "Успешно",
          description: "Товар добавлен",
        });
      } catch (error) {
        console.log('📦 SQLite недоступен, сохраняю в Lovable Cloud...');
        const supabaseData = {
          ...productData,
          images: finalImages,
        };
        const { images: _, ...dataWithoutImages } = supabaseData;

        const { error: supabaseError } = await supabase
          .from('products')
          .insert([{ ...dataWithoutImages, images: finalImages }]);

        if (supabaseError) throw supabaseError;

        toast({
          title: "Успешно",
          description: "Товар добавлен через Lovable Cloud",
        });
      }

      setFormData({
        name: "",
        description: "",
        price: "",
        stock: "",
        category_id: "",
      });
      setImageFiles(null);
      onProductAdded();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить товар",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: "2rem",
      backgroundColor: "hsl(var(--card))",
      borderRadius: "0.5rem",
      border: "1px solid hsl(var(--border))"
    }}>
      <h2 style={{
        fontSize: "1.5rem",
        fontWeight: "600",
        marginBottom: "1.5rem",
        color: "hsl(var(--foreground))"
      }}>
        Добавить новый товар
      </h2>

      <form onSubmit={handleSubmit} style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem"
        }}>
          <div>
            <Label htmlFor="name">Название товара *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="price">Цена (₽) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="stock">Количество на складе *</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Категория</Label>
            <select
              id="category"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.375rem",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--foreground))"
              }}
            >
              <option value="">Без категории</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div>
          <Label htmlFor="image">Изображения товара (до 5 файлов)</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Input
              id="image"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
            <span style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}>
              Загрузите до 5 изображений. Первое изображение будет основным.
            </span>
          </div>
        </div>

        <div>
          <Label htmlFor="imageUrl">ИЛИ URL изображения</Label>
          <Input
            id="imageUrl"
            type="text"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <span style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}>
            Можно указать прямую ссылку на изображение (например, из хостинга картинок).
          </span>
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem"
          }}
        >
          {loading ? "Добавление..." : "Добавить товар"}
        </Button>
      </form>
    </div>
  );
};

export default AddProductForm;

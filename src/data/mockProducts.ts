export interface MockProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  images?: string[];
  category_id: string;
  stock: number;
  is_active: boolean;
}

export interface MockCategory {
  id: string;
  name: string;
}

// КАТЕГОРИИ - можешь добавлять свои
export const mockCategories: MockCategory[] = [
  { id: "718cdc3d-26bc-4e4f-bf49-1477e8e9104e", name: "Пальто" },
  { id: "255f1dd8-8577-40b1-ad9a-71cd7692accf", name: "Штаны" },
  { id: "b9cfb1f7-e0e6-4ce7-823c-97d43d71bcb7", name: "Шарфы" },
  { id: "a27cdd64-f618-44a8-a641-e359b0daf430", name: "Обувь" },
];

// ТОВАРЫ - меняй названия, цены, описания и пути к картинкам здесь
export const mockProducts: MockProduct[] = [
  {
    id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
    name: "Чёрное пальто",
    description: "Элегантное чёрное пальто из шерсти",
    price: 15990,
    image_url: "/images/coats/black-coat.jpg",
    images: ["/images/coats/black-coat.jpg", "/images/coats/black-coat-2.jpg"],
    category_id: "718cdc3d-26bc-4e4f-bf49-1477e8e9104e",
    stock: 5,
    is_active: true,
  },
  {
    id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c",
    name: "Серое пальто",
    description: "Стильное серое пальто для повседневной носки",
    price: 12990,
    image_url: "/images/coats/grey-coat.jpg",
    category_id: "718cdc3d-26bc-4e4f-bf49-1477e8e9104e",
    stock: 3,
    is_active: true,
  },
  {
    id: "a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d",
    name: "Классические брюки",
    description: "Классические чёрные брюки со стрелками",
    price: 4990,
    image_url: "/images/pants/classic-pants.jpg",
    category_id: "255f1dd8-8577-40b1-ad9a-71cd7692accf",
    stock: 10,
    is_active: true,
  },
  {
    id: "b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e",
    name: "Джинсы",
    description: "Синие джинсы прямого кроя",
    price: 3990,
    image_url: "/images/pants/jeans.jpg",
    category_id: "255f1dd8-8577-40b1-ad9a-71cd7692accf",
    stock: 8,
    is_active: true,
  },
  {
    id: "c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f",
    name: "Кашемировый шарф",
    description: "Мягкий кашемировый шарф бежевого цвета",
    price: 2990,
    image_url: "/images/scarves/cashmere-scarf.jpg",
    category_id: "b9cfb1f7-e0e6-4ce7-823c-97d43d71bcb7",
    stock: 15,
    is_active: true,
  },
  {
    id: "d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a",
    name: "Шерстяной шарф",
    description: "Тёплый шерстяной шарф с узором",
    price: 1990,
    image_url: "/images/scarves/wool-scarf.jpg",
    category_id: "b9cfb1f7-e0e6-4ce7-823c-97d43d71bcb7",
    stock: 12,
    is_active: true,
  },
  {
    id: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
    name: "Кожаные ботинки",
    description: "Классические кожаные ботинки чёрного цвета",
    price: 8990,
    image_url: "/images/shoes/leather-boots.jpg",
    category_id: "a27cdd64-f618-44a8-a641-e359b0daf430",
    stock: 6,
    is_active: true,
  },
  {
    id: "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c",
    name: "Кроссовки",
    description: "Удобные спортивные кроссовки белого цвета",
    price: 5990,
    image_url: "/images/shoes/sneakers.jpg",
    category_id: "a27cdd64-f618-44a8-a641-e359b0daf430",
    stock: 20,
    is_active: true,
  },
];

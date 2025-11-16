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
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", name: "Пальто" },
  { id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", name: "Штаны" },
  { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", name: "Шарфы" },
  { id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a", name: "Обувь" },
];

// ТОВАРЫ - меняй названия, цены, описания и пути к картинкам здесь
export const mockProducts: MockProduct[] = [
  {
    id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
    name: "Чёрное пальто",
    description: "Элегантное чёрное пальто из шерсти",
    price: 15990,
    image_url: "/images/coats/black-coat.jpg",
    images: [
      "/images/coats/black-coat.jpg",
      "/images/coats/black-coat-2.jpg"
    ],
    category_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    stock: 5,
    is_active: true,
  },
  {
    id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c",
    name: "Серое пальто",
    description: "Стильное серое пальто для повседневной носки",
    price: 12990,
    image_url: "/images/coats/grey-coat.jpg",
    category_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    stock: 3,
    is_active: true,
  },
  {
    id: "a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d",
    name: "Классические брюки",
    description: "Классические чёрные брюки со стрелками",
    price: 4990,
    image_url: "/images/pants/classic-pants.jpg",
    category_id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    stock: 10,
    is_active: true,
  },
  {
    id: "b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e",
    name: "Джинсы",
    description: "Синие джинсы прямого кроя",
    price: 3990,
    image_url: "/images/pants/jeans.jpg",
    category_id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    stock: 8,
    is_active: true,
  },
  {
    id: "c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f",
    name: "Кашемировый шарф",
    description: "Мягкий кашемировый шарф бежевого цвета",
    price: 2990,
    image_url: "/images/scarves/cashmere-scarf.jpg",
    category_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    stock: 15,
    is_active: true,
  },
  {
    id: "d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a",
    name: "Шерстяной шарф",
    description: "Тёплый шерстяной шарф с узором",
    price: 1990,
    image_url: "/images/scarves/wool-scarf.jpg",
    category_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    stock: 12,
    is_active: true,
  },
  {
    id: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
    name: "Кожаные ботинки",
    description: "Классические кожаные ботинки чёрного цвета",
    price: 8990,
    image_url: "/images/shoes/leather-boots.jpg",
    category_id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
    stock: 6,
    is_active: true,
  },
  {
    id: "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c",
    name: "Кроссовки",
    description: "Удобные спортивные кроссовки белого цвета",
    price: 5990,
    image_url: "/images/shoes/sneakers.jpg",
    category_id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
    stock: 20,
    is_active: true,
  },
];

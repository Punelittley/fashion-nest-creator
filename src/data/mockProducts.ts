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
  { id: "1", name: "Пальто" },
  { id: "2", name: "Штаны" },
  { id: "3", name: "Шарфы" },
  { id: "4", name: "Обувь" },
];

// ТОВАРЫ - меняй названия, цены, описания и пути к картинкам здесь
export const mockProducts: MockProduct[] = [
  {
    id: "1",
    name: "Чёрное пальто",
    description: "Элегантное чёрное пальто из шерсти",
    price: 15990,
    image_url: "/images/coats/black-coat.jpg",
    images: [
      "/images/coats/black-coat.jpg",
      "/images/coats/black-coat-2.jpg"
    ],
    category_id: "1",
    stock: 5,
    is_active: true,
  },
  {
    id: "2",
    name: "Серое пальто",
    description: "Стильное серое пальто для повседневной носки",
    price: 12990,
    image_url: "/images/coats/grey-coat.jpg",
    category_id: "1",
    stock: 3,
    is_active: true,
  },
  {
    id: "3",
    name: "Классические брюки",
    description: "Классические чёрные брюки со стрелками",
    price: 4990,
    image_url: "/images/pants/classic-pants.jpg",
    category_id: "2",
    stock: 10,
    is_active: true,
  },
  {
    id: "4",
    name: "Джинсы",
    description: "Синие джинсы прямого кроя",
    price: 3990,
    image_url: "/images/pants/jeans.jpg",
    category_id: "2",
    stock: 8,
    is_active: true,
  },
  {
    id: "5",
    name: "Кашемировый шарф",
    description: "Мягкий кашемировый шарф бежевого цвета",
    price: 2990,
    image_url: "/images/scarves/cashmere-scarf.jpg",
    category_id: "3",
    stock: 15,
    is_active: true,
  },
  {
    id: "6",
    name: "Шерстяной шарф",
    description: "Тёплый шерстяной шарф с узором",
    price: 1990,
    image_url: "/images/scarves/wool-scarf.jpg",
    category_id: "3",
    stock: 12,
    is_active: true,
  },
  {
    id: "7",
    name: "Кожаные ботинки",
    description: "Классические кожаные ботинки чёрного цвета",
    price: 8990,
    image_url: "/images/shoes/leather-boots.jpg",
    category_id: "4",
    stock: 6,
    is_active: true,
  },
  {
    id: "8",
    name: "Кроссовки",
    description: "Удобные спортивные кроссовки белого цвета",
    price: 5990,
    image_url: "/images/shoes/sneakers.jpg",
    category_id: "4",
    stock: 20,
    is_active: true,
  },
];

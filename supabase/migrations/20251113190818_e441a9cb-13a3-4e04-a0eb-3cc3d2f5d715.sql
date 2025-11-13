-- Добавляем колонку для массива изображений
ALTER TABLE products ADD COLUMN IF NOT EXISTS images text[];

-- Заполняем массив изображений из существующего image_url
UPDATE products 
SET images = ARRAY[image_url]
WHERE images IS NULL AND image_url IS NOT NULL;

-- Добавляем дополнительные изображения для товаров
UPDATE products 
SET images = ARRAY[
  'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800',
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800'
]
WHERE name = 'Классическое пальто';

UPDATE products 
SET images = ARRAY[
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
  'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800',
  'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800'
]
WHERE name = 'Кожаная куртка';

UPDATE products 
SET images = ARRAY[
  'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
  'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800',
  'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'
]
WHERE name = 'Прямые брюки';

UPDATE products 
SET images = ARRAY[
  'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
  'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800',
  'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=800'
]
WHERE name = 'Джинсы slim fit';
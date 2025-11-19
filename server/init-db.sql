-- Создание таблиц для магазина одежды

-- Таблица пользователей (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица ролей пользователей (user_roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user')) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

-- Таблица категорий (categories)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица товаров (products)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK(price >= 0),
  image_url TEXT,
  images TEXT, -- JSON массив с URL изображений
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Таблица корзины (cart_items)
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id)
);

-- Таблица избранного (favorite_products)
CREATE TABLE IF NOT EXISTS favorite_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id)
);

-- Таблица заказов (orders)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_amount REAL NOT NULL CHECK(total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Таблица позиций заказа (order_items)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  price REAL NOT NULL CHECK(price >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Триггеры для обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at 
AFTER UPDATE ON profiles
BEGIN
  UPDATE profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_products_updated_at 
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cart_items_updated_at 
AFTER UPDATE ON cart_items
BEGIN
  UPDATE cart_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_orders_updated_at 
AFTER UPDATE ON orders
BEGIN
  UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_user ON favorite_products(user_id);

-- Вставка тестовых данных

-- Админ пользователь (пароль: admin123)
-- Хеш сгенерирован для пароля 'admin123' с использованием bcrypt (10 раундов)
INSERT OR IGNORE INTO profiles (id, email, password_hash, full_name) 
VALUES ('admin-001', 'admin@fashion.ru', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Администратор');

INSERT OR IGNORE INTO user_roles (id, user_id, role) 
VALUES ('role-admin-001', 'admin-001', 'admin');

-- Категории
INSERT OR IGNORE INTO categories (id, name, description) VALUES 
('cat-001', 'Верхняя одежда', 'Пальто, куртки и верхняя одежда'),
('cat-002', 'Штаны и брюки', 'Брюки, джинсы и штаны'),
('cat-003', 'Шарфы', 'Шарфы и платки'),
('cat-004', 'Обувь', 'Обувь для любого сезона');

-- Примеры товаров с локальными картинками
-- Верхняя одежда (Coats)
INSERT OR IGNORE INTO products (id, category_id, name, description, price, image_url, stock, is_active) VALUES 
('prod-001', 'cat-001', 'Классическое шерстяное пальто', 'Элегантное пальто из натуральной шерсти с минималистичным кроем', 25000.00, '/images/coats/coat1.jpg', 8, 1),
('prod-002', 'cat-001', 'Длинное пальто оверсайз', 'Стильное длинное пальто свободного кроя', 28000.00, '/images/coats/coat2.jpg', 6, 1),
('prod-003', 'cat-001', 'Кашемировое пальто', 'Роскошное пальто из итальянского кашемира', 45000.00, '/images/coats/coat3.jpg', 4, 1);

-- Штаны и брюки (Pants)
INSERT OR IGNORE INTO products (id, category_id, name, description, price, image_url, stock, is_active) VALUES 
('prod-004', 'cat-002', 'Классические брюки со стрелками', 'Строгие брюки прямого кроя с идеальной посадкой', 12000.00, '/images/pants/pants1.jpg', 15, 1),
('prod-005', 'cat-002', 'Брюки-палаццо', 'Широкие брюки в минималистичном стиле', 14000.00, '/images/pants/pants2.jpg', 10, 1),
('prod-006', 'cat-002', 'Укороченные брюки', 'Современные укороченные брюки с высокой талией', 11000.00, '/images/pants/pants3.jpg', 12, 1);

-- Шарфы (Scarves)
INSERT OR IGNORE INTO products (id, category_id, name, description, price, image_url, stock, is_active) VALUES 
('prod-007', 'cat-003', 'Кашемировый шарф', 'Мягкий кашемировый шарф нейтрального оттенка', 8000.00, '/images/scarves/scarf1.jpg', 20, 1),
('prod-008', 'cat-003', 'Шелковый платок', 'Изысканный шелковый платок с монохромным принтом', 6500.00, '/images/scarves/scarf2.jpg', 18, 1),
('prod-009', 'cat-003', 'Шерстяной шарф oversize', 'Большой теплый шарф из мериносовой шерсти', 9500.00, '/images/scarves/scarf3.jpg', 15, 1);

-- Обувь (Shoes)
INSERT OR IGNORE INTO products (id, category_id, name, description, price, image_url, stock, is_active) VALUES 
('prod-010', 'cat-004', 'Кожаные ботинки челси', 'Классические ботинки из натуральной кожи', 18000.00, '/images/shoes/shoes1.jpg', 10, 1),
('prod-011', 'cat-004', 'Минималистичные кроссовки', 'Стильные кроссовки в монохромной гамме', 15000.00, '/images/shoes/shoes2.jpg', 14, 1),
('prod-012', 'cat-004', 'Лоферы из замши', 'Элегантные замшевые лоферы', 16500.00, '/images/shoes/shoes3.jpg', 8, 1);

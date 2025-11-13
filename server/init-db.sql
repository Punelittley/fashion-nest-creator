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

-- Вставка тестовых данных

-- Админ пользователь (пароль: admin123)
INSERT OR IGNORE INTO profiles (id, email, password_hash, full_name) 
VALUES ('admin-001', 'admin@fashion.ru', '$2b$10$YourHashedPasswordHere', 'Администратор');

INSERT OR IGNORE INTO user_roles (id, user_id, role) 
VALUES ('role-admin-001', 'admin-001', 'admin');

-- Категории
INSERT OR IGNORE INTO categories (id, name, description) VALUES 
('cat-001', 'Мужское', 'Мужская одежда и аксессуары'),
('cat-002', 'Женское', 'Женская одежда и аксессуары'),
('cat-003', 'Аксессуары', 'Аксессуары для всех');

-- Примеры товаров
INSERT OR IGNORE INTO products (id, category_id, name, description, price, stock, is_active) VALUES 
('prod-001', 'cat-001', 'Мужская рубашка', 'Классическая белая рубашка из хлопка', 2999.00, 15, 1),
('prod-002', 'cat-001', 'Мужские джинсы', 'Прямые джинсы синего цвета', 4999.00, 20, 1),
('prod-003', 'cat-002', 'Женское платье', 'Элегантное вечернее платье', 7999.00, 10, 1),
('prod-004', 'cat-002', 'Женская блузка', 'Шелковая блузка нежного оттенка', 3499.00, 12, 1),
('prod-005', 'cat-003', 'Кожаный ремень', 'Классический кожаный ремень', 1299.00, 30, 1);

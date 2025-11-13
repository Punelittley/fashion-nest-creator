# Fashion Store Backend

Backend сервер для магазина одежды на **Node.js + Express + SQLite**.

## Установка и запуск

### 1. Установка зависимостей

```bash
cd server
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env`:
```
PORT=3001
JWT_SECRET=your-super-secret-key-here
NODE_ENV=development
```

### 3. Запуск сервера

```bash
# Обычный запуск
npm start

# Режим разработки с автоперезагрузкой
npm run dev
```

Сервер запустится на `http://localhost:3001`

## Структура базы данных (SQLite)

База данных создается автоматически при первом запуске.

### Таблицы:

1. **profiles** - пользователи
2. **user_roles** - роли пользователей (admin/user)
3. **categories** - категории товаров
4. **products** - товары
5. **cart_items** - корзина покупок
6. **orders** - заказы
7. **order_items** - позиции в заказах

## API Endpoints

### Авторизация (`/api/auth`)

- `POST /api/auth/signup` - Регистрация
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "Иван Иванов"
  }
  ```

- `POST /api/auth/signin` - Вход
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Получить текущего пользователя (требует токен)

### Товары (`/api/products`)

- `GET /api/products` - Список всех товаров
- `GET /api/products/:id` - Товар по ID
- `POST /api/products` - Создать товар (только админ)
- `PUT /api/products/:id` - Обновить товар (только админ)
- `DELETE /api/products/:id` - Удалить товар (только админ)

### Категории (`/api/categories`)

- `GET /api/categories` - Список категорий
- `POST /api/categories` - Создать категорию (только админ)

### Корзина (`/api/cart`)

- `GET /api/cart` - Получить корзину (требует токен)
- `POST /api/cart` - Добавить товар в корзину
  ```json
  {
    "product_id": "prod-001",
    "quantity": 1
  }
  ```
- `PUT /api/cart/:id` - Обновить количество
- `DELETE /api/cart/:id` - Удалить из корзины

### Заказы (`/api/orders`)

- `GET /api/orders` - Заказы пользователя (требует токен)
- `POST /api/orders` - Создать заказ
  ```json
  {
    "shipping_address": "Москва, ул. Примерная, 1",
    "phone": "+7 999 123 45 67"
  }
  ```
- `GET /api/orders/all` - Все заказы (только админ)
- `PATCH /api/orders/:id/status` - Обновить статус (только админ)

### Профиль (`/api/profile`)

- `GET /api/profile` - Получить профиль (требует токен)
- `PUT /api/profile` - Обновить профиль

## Авторизация

API использует JWT токены. После входа/регистрации вы получите токен.

Отправляйте токен в заголовке:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Тестовые данные

При инициализации создаются:

**Админ:**
- Email: `admin@fashion.ru`
- Пароль: `admin123` (хеш нужно заменить в init-db.sql)

**Категории:**
- Мужское
- Женское
- Аксессуары

**Товары:**
- 5 примеров товаров с разными категориями

## Файл базы данных

SQLite база: `server/fashion_store.db`

Чтобы посмотреть данные, используйте:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- Или командную строку: `sqlite3 fashion_store.db`

## Разработка

Структура проекта:
```
server/
├── server.js           # Основной файл сервера
├── database.js         # Настройка SQLite
├── init-db.sql        # SQL для создания таблиц
├── middleware/
│   └── auth.js        # JWT аутентификация
└── routes/
    ├── auth.js        # Авторизация
    ├── products.js    # Товары
    ├── categories.js  # Категории
    ├── cart.js        # Корзина
    ├── orders.js      # Заказы
    └── profile.js     # Профиль
```

## Frontend интеграция

Настройте frontend на работу с API:

1. Измените `API_URL` на `http://localhost:3001/api`
2. Сохраняйте JWT токен после входа
3. Отправляйте токен в заголовках запросов

## Troubleshooting

**Ошибка "database is locked":**
- Закройте другие соединения к БД
- Перезапустите сервер

**Ошибка "EADDRINUSE":**
- Порт 3001 занят
- Измените PORT в .env
- Или остановите другой процесс: `lsof -ti:3001 | xargs kill`

**Ошибка импорта модулей:**
- Убедитесь что в package.json есть `"type": "module"`

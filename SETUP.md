# Установка и запуск Fashion Store

Проект состоит из двух частей:
1. **Frontend** - React приложение (Vite)
2. **Backend** - Node.js + Express + SQLite сервер

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <YOUR_GIT_URL>
cd <PROJECT_NAME>
```

### 2. Запуск Backend (сервер)

```bash
# Перейдите в папку сервера
cd server

# Установите зависимости
npm install

# Создайте файл .env
cp .env.example .env

# Отредактируйте .env (измените JWT_SECRET!)
nano .env

# Запустите сервер
npm start
```

Сервер запустится на `http://localhost:3001`

### 3. Запуск Frontend

Откройте новый терминал:

```bash
# Вернитесь в корень проекта
cd ..

# Установите зависимости
npm install

# Создайте файл .env
cp .env.example .env

# Запустите frontend
npm run dev
```

Frontend запустится на `http://localhost:8080`

## Структура проекта

```
fashion-store/
├── server/              # Backend (Node.js + Express + SQLite)
│   ├── routes/          # API роуты
│   ├── middleware/      # Middleware (auth)
│   ├── database.js      # Настройка SQLite
│   ├── init-db.sql      # SQL схема
│   ├── server.js        # Главный файл сервера
│   └── fashion_store.db # SQLite база (создается автоматически)
│
├── src/                 # Frontend (React + TypeScript)
│   ├── pages/           # Страницы приложения
│   ├── components/      # Компоненты
│   └── lib/
│       └── api.ts       # API клиент для backend
│
└── README.md
```

## Требования

- Node.js 18+ 
- npm или yarn

## База данных

При первом запуске backend автоматически:
1. Создаст файл `server/fashion_store.db`
2. Создаст все таблицы (7 штук)
3. Заполнит тестовыми данными

### Тестовые данные:

**Категории:**
- Мужское
- Женское  
- Аксессуары

**Товары:**
- 5 примеров товаров

**Для создания админа:**
1. Зарегистрируйтесь через UI
2. Откройте БД: `sqlite3 server/fashion_store.db`
3. Выполните:
```sql
-- Найдите ID пользователя
SELECT id, email FROM profiles;

-- Добавьте роль admin (замените USER_ID)
INSERT INTO user_roles (id, user_id, role) 
VALUES ('role-admin-xxx', 'USER_ID', 'admin');
```

## API Endpoints

Backend предоставляет REST API на `http://localhost:3001/api`

- `POST /api/auth/signup` - Регистрация
- `POST /api/auth/signin` - Вход
- `GET /api/products` - Список товаров
- `GET /api/cart` - Корзина (требует auth)
- `POST /api/orders` - Создать заказ
- И другие...

Полная документация: `server/README.md`

## Разработка

### Backend (режим разработки)

```bash
cd server
npm run dev  # Автоперезагрузка при изменениях
```

### Frontend

```bash
npm run dev  # Vite dev server с hot reload
```

## Production сборка

### Frontend

```bash
npm run build
# Файлы в dist/
```

### Backend

Backend готов к production после установки зависимостей.

Рекомендуется использовать PM2:

```bash
npm install -g pm2
cd server
pm2 start server.js --name fashion-backend
```

## Troubleshooting

**Backend не запускается:**
- Проверьте что порт 3001 свободен
- Убедитесь что создан файл .env
- Проверьте логи ошибок

**Frontend не подключается к API:**
- Убедитесь что backend запущен
- Проверьте VITE_API_URL в .env
- Откройте DevTools > Network для проверки запросов

**База данных заблокирована:**
```bash
cd server
rm fashion_store.db
npm start  # Создаст новую БД
```

**CORS ошибки:**
- Убедитесь что frontend URL указан в server/server.js (cors настройки)

## Полезные команды

```bash
# Просмотр SQLite базы
sqlite3 server/fashion_store.db
sqlite> .tables
sqlite> SELECT * FROM profiles;
sqlite> .quit

# Очистка и пересоздание БД
cd server
rm fashion_store.db
npm start
```

## Дополнительно

- Документация API: `server/README.md`
- Структура БД: `server/init-db.sql`
- Frontend компоненты: `src/components/`

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';

// Импорт роутов
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import profileRoutes from './routes/profile.js';
import favoritesRoutes from './routes/favorites.js';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Роуты API
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/favorites', favoritesRoutes);

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
const startServer = async () => {
  try {
    // Инициализация базы данных
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║   Fashion Store Backend Server         ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║   🚀 Server: http://localhost:${PORT}    ║`);
      console.log(`║   📊 API: http://localhost:${PORT}/api   ║`);
      console.log('╚════════════════════════════════════════╝');
      console.log('');
      console.log('Available endpoints:');
      console.log('  POST   /api/auth/signup');
      console.log('  POST   /api/auth/signin');
      console.log('  GET    /api/auth/me');
      console.log('  GET    /api/products');
      console.log('  GET    /api/categories');
      console.log('  GET    /api/cart');
      console.log('  POST   /api/cart');
      console.log('  GET    /api/orders');
      console.log('  POST   /api/orders');
      console.log('  GET    /api/profile');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

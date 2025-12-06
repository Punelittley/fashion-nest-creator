import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';

import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import profileRoutes from './routes/profile.js';
import favoritesRoutes from './routes/favorites.js';
import roleRoutes from './routes/role.js';
import usersRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/role', roleRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
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
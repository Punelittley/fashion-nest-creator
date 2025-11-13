import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют админ-прав
router.use(requireAdmin);

// Получить всех пользователей
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await dbAll(
      'SELECT id, email, full_name, first_name, last_name, phone, address, created_at FROM profiles ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// Получить все заказы
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await dbAll(
      `SELECT o.*, p.email, p.full_name 
       FROM orders o
       JOIN profiles p ON o.user_id = p.id
       ORDER BY o.created_at DESC`
    );
    
    // Получить items для каждого заказа
    for (const order of orders) {
      order.order_items = await dbAll(
        `SELECT oi.*, p.name, p.image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
    }

    res.json(orders);
  } catch (error) {
    console.error('Ошибка получения всех заказов:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

export default router;

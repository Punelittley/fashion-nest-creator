import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Получить заказы пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await dbAll(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
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
    console.error('Ошибка получения заказов:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// Создать заказ
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { shipping_address, phone } = req.body;
    const userId = req.user.id;

    if (!shipping_address || !phone) {
      return res.status(400).json({ error: 'Адрес и телефон обязательны' });
    }

    // Получить товары из корзины
    const cartItems = await dbAll(
      `SELECT ci.*, p.price FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    // Рассчитать общую сумму
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Создать заказ
    const orderId = randomUUID();
    await dbRun(
      `INSERT INTO orders (id, user_id, total_amount, shipping_address, phone)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, userId, total, shipping_address, phone]
    );

    // Создать items заказа
    for (const item of cartItems) {
      await dbRun(
        `INSERT INTO order_items (id, order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), orderId, item.product_id, item.quantity, item.price]
      );
    }

    // Очистить корзину
    await dbRun('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    // Обновить профиль
    await dbRun(
      'UPDATE profiles SET phone = ?, address = ? WHERE id = ?',
      [phone, shipping_address, userId]
    );

    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json(order);
  } catch (error) {
    console.error('Ошибка создания заказа:', error);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// Обновить статус заказа (только админ)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }

    await dbRun('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(order);
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// Получить все заказы (только админ)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await dbAll(
      `SELECT o.*, p.email, p.full_name 
       FROM orders o
       JOIN profiles p ON o.user_id = p.id
       ORDER BY o.created_at DESC`
    );

    res.json(orders);
  } catch (error) {
    console.error('Ошибка получения всех заказов:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

export default router;

import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить избранные товары
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const favorites = await dbAll(
      `SELECT fp.id, fp.product_id, p.name, p.price, p.image_url, p.stock
       FROM favorite_products fp
       JOIN products p ON fp.product_id = p.id
       WHERE fp.user_id = ?`,
      [req.user.id]
    );

    res.json(favorites);
  } catch (error) {
    console.error('Ошибка получения избранных товаров:', error);
    res.status(500).json({ error: 'Ошибка получения избранных товаров' });
  }
});

// Добавить товар в избранное
router.post('/products', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Не указан ID товара' });
    }

    // Проверить, существует ли товар
    const product = await dbGet('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Проверить, не добавлен ли уже
    const existing = await dbGet(
      'SELECT id FROM favorite_products WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    if (existing) {
      return res.status(400).json({ error: 'Товар уже в избранном' });
    }

    await dbRun(
      'INSERT INTO favorite_products (user_id, product_id) VALUES (?, ?)',
      [req.user.id, product_id]
    );

    res.json({ message: 'Товар добавлен в избранное' });
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    res.status(500).json({ error: 'Ошибка добавления в избранное' });
  }
});

// Удалить товар из избранного
router.delete('/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    await dbRun(
      'DELETE FROM favorite_products WHERE user_id = ? AND product_id = ?',
      [req.user.id, productId]
    );

    res.json({ message: 'Товар удалён из избранного' });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

// Получить избранные заказы
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const favorites = await dbAll(
      'SELECT order_id FROM favorite_orders WHERE user_id = ?',
      [req.user.id]
    );

    res.json(favorites);
  } catch (error) {
    console.error('Ошибка получения избранных заказов:', error);
    res.status(500).json({ error: 'Ошибка получения избранных заказов' });
  }
});

// Добавить заказ в избранное
router.post('/orders', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Не указан ID заказа' });
    }

    // Проверить, существует ли заказ и принадлежит ли он пользователю
    const order = await dbGet(
      'SELECT id FROM orders WHERE id = ? AND user_id = ?',
      [order_id, req.user.id]
    );

    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    // Проверить, не добавлен ли уже
    const existing = await dbGet(
      'SELECT id FROM favorite_orders WHERE user_id = ? AND order_id = ?',
      [req.user.id, order_id]
    );

    if (existing) {
      return res.status(400).json({ error: 'Заказ уже в избранном' });
    }

    await dbRun(
      'INSERT INTO favorite_orders (user_id, order_id) VALUES (?, ?)',
      [req.user.id, order_id]
    );

    res.json({ message: 'Заказ добавлен в избранное' });
  } catch (error) {
    console.error('Ошибка добавления заказа в избранное:', error);
    res.status(500).json({ error: 'Ошибка добавления заказа в избранное' });
  }
});

// Удалить заказ из избранного
router.delete('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    await dbRun(
      'DELETE FROM favorite_orders WHERE user_id = ? AND order_id = ?',
      [req.user.id, orderId]
    );

    res.json({ message: 'Заказ удалён из избранного' });
  } catch (error) {
    console.error('Ошибка удаления заказа из избранного:', error);
    res.status(500).json({ error: 'Ошибка удаления заказа из избранного' });
  }
});

export default router;

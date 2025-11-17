import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Получить корзину (для локальной разработки без auth - используем hardcoded user)
router.get('/', async (req, res) => {
  try {
    // Для локальной разработки используем фиксированный user_id
    const userId = 'admin-001';
    const items = await dbAll(
      `SELECT ci.*, p.name, p.price, p.image_url, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`,
      [userId]
    );

    res.json(items);
  } catch (error) {
    console.error('Ошибка получения корзины:', error);
    res.status(500).json({ error: 'Ошибка получения корзины' });
  }
});

// Добавить товар в корзину (для локальной разработки без auth)
router.post('/', async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = 'admin-001';

    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }

    const product = await dbGet('SELECT * FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!product) {
      console.error(`Товар не найден: ${product_id}`);
      return res.status(404).json({ error: 'Товар не найден в базе данных' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Недостаточно товара на складе' });
    }

    const existing = await dbGet(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existing) {
      await dbRun(
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing.id]
      );
    } else {
      await dbRun(
        'INSERT INTO cart_items (id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)',
        [randomUUID(), userId, product_id, quantity]
      );
    }

    const items = await dbAll(
      `SELECT ci.*, p.name, p.price, p.image_url, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`,
      [userId]
    );

    res.json(items);
  } catch (error) {
    console.error('Ошибка добавления в корзину:', error);
    res.status(500).json({ error: 'Ошибка добавления в корзину' });
  }
});

// Обновить количество (для локальной разработки без auth)
router.put('/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    const userId = 'admin-001';

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Некорректное количество' });
    }

    await dbRun(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, req.params.id, userId]
    );

    res.json({ message: 'Количество обновлено' });
  } catch (error) {
    console.error('Ошибка обновления корзины:', error);
    res.status(500).json({ error: 'Ошибка обновления корзины' });
  }
});

// Удалить товар из корзины (для локальной разработки без auth)
router.delete('/:id', async (req, res) => {
  try {
    const userId = 'admin-001';
    await dbRun(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    res.json({ message: 'Товар удален из корзины' });
  } catch (error) {
    console.error('Ошибка удаления из корзины:', error);
    res.status(500).json({ error: 'Ошибка удаления из корзины' });
  }
});

// Очистить корзину (для локальной разработки без auth)
router.delete('/', async (req, res) => {
  try {
    const userId = 'admin-001';
    await dbRun('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    res.json({ message: 'Корзина очищена' });
  } catch (error) {
    console.error('Ошибка очистки корзины:', error);
    res.status(500).json({ error: 'Ошибка очистки корзины' });
  }
});

export default router;

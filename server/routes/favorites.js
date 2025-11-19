import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить избранное
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await dbAll(
      `SELECT fp.*, p.name, p.price, p.image_url, p.stock, p.description
       FROM favorite_products fp
       JOIN products p ON fp.product_id = p.id
       WHERE fp.user_id = ?`,
      [userId]
    );

    res.json(favorites);
  } catch (error) {
    console.error('Ошибка получения избранного:', error);
    res.status(500).json({ error: 'Ошибка получения избранного' });
  }
});

// Проверить статус избранного для продукта
router.get('/check/:productId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const favorite = await dbGet(
      'SELECT id FROM favorite_products WHERE user_id = ? AND product_id = ?',
      [userId, req.params.productId]
    );

    res.json({ isFavorite: !!favorite, favoriteId: favorite?.id });
  } catch (error) {
    console.error('Ошибка проверки избранного:', error);
    res.status(500).json({ error: 'Ошибка проверки избранного' });
  }
});

// Добавить в избранное
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;
    const userId = req.user.id;

    if (!product_id) {
      return res.status(400).json({ error: 'Не указан product_id' });
    }

    // Проверка существования продукта
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Проверка уже в избранном
    const existing = await dbGet(
      'SELECT * FROM favorite_products WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existing) {
      return res.json({ message: 'Уже в избранном', id: existing.id });
    }

    const id = randomUUID();
    await dbRun(
      'INSERT INTO favorite_products (id, user_id, product_id) VALUES (?, ?, ?)',
      [id, userId, product_id]
    );

    res.status(201).json({ id, message: 'Добавлено в избранное' });
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    res.status(500).json({ error: 'Ошибка добавления в избранное' });
  }
});

// Удалить из избранного
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await dbRun(
      'DELETE FROM favorite_products WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

// Удалить из избранного по product_id
router.delete('/product/:productId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await dbRun(
      'DELETE FROM favorite_products WHERE product_id = ? AND user_id = ?',
      [req.params.productId, userId]
    );

    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

export default router;

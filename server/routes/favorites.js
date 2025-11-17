import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { randomUUID } from 'crypto';

const router = express.Router();
const LOCAL_USER_ID = 'admin-001';

// Получить избранное
router.get('/', async (req, res) => {
  try {
    const favorites = await dbAll(
      `SELECT fp.*, p.name, p.price, p.image_url, p.stock, p.description
       FROM favorite_products fp
       JOIN products p ON fp.product_id = p.id
       WHERE fp.user_id = ?`,
      [LOCAL_USER_ID]
    );

    res.json(favorites);
  } catch (error) {
    console.error('Ошибка получения избранного:', error);
    res.status(500).json({ error: 'Ошибка получения избранного' });
  }
});

// Проверить статус избранного для продукта
router.get('/check/:productId', async (req, res) => {
  try {
    const favorite = await dbGet(
      'SELECT id FROM favorite_products WHERE user_id = ? AND product_id = ?',
      [LOCAL_USER_ID, req.params.productId]
    );

    res.json({ isFavorite: !!favorite, favoriteId: favorite?.id });
  } catch (error) {
    console.error('Ошибка проверки избранного:', error);
    res.status(500).json({ error: 'Ошибка проверки избранного' });
  }
});

// Добавить в избранное
router.post('/', async (req, res) => {
  try {
    const { product_id } = req.body;

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
      [LOCAL_USER_ID, product_id]
    );

    if (existing) {
      return res.json({ message: 'Уже в избранном', id: existing.id });
    }

    const id = randomUUID();
    await dbRun(
      'INSERT INTO favorite_products (id, user_id, product_id) VALUES (?, ?, ?)',
      [id, LOCAL_USER_ID, product_id]
    );

    res.status(201).json({ id, message: 'Добавлено в избранное' });
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    res.status(500).json({ error: 'Ошибка добавления в избранное' });
  }
});

// Удалить из избранного
router.delete('/:id', async (req, res) => {
  try {
    await dbRun(
      'DELETE FROM favorite_products WHERE id = ? AND user_id = ?',
      [req.params.id, LOCAL_USER_ID]
    );

    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

// Удалить из избранного по product_id
router.delete('/product/:productId', async (req, res) => {
  try {
    await dbRun(
      'DELETE FROM favorite_products WHERE product_id = ? AND user_id = ?',
      [req.params.productId, LOCAL_USER_ID]
    );

    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

export default router;

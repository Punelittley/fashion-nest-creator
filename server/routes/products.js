import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Получить все активные товары (или все для админа)
router.get('/', async (req, res) => {
  try {
    const { category, includeInactive } = req.query;
    
    let sql = 'SELECT * FROM products';
    const params = [];
    const conditions = [];

    // Если не запрошены неактивные, показываем только активные
    if (includeInactive !== 'true') {
      conditions.push('is_active = 1');
    }

    if (category) {
      conditions.push('category_id = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const products = await dbAll(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

// Получить товар по ID
router.get('/:id', async (req, res) => {
  try {
    const product = await dbGet(
      'SELECT * FROM products WHERE id = ? AND is_active = 1',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    res.json(product);
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ error: 'Ошибка получения товара' });
  }
});

  // Создать товар (для локальной разработки без auth)
router.post('/', async (req, res) => {
  try {
    const { category_id, name, description, price, image_url, images, stock } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    // Сериализуем массив images в JSON для SQLite
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images;

    const id = randomUUID();
    await dbRun(
      `INSERT INTO products (id, category_id, name, description, price, image_url, images, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, category_id, name, description, price, image_url, imagesJson, stock || 0]
    );

    const product = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json(product);
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

  // Обновить товар (для локальной разработки без auth)
router.put('/:id', async (req, res) => {
  try {
    const { category_id, name, description, price, image_url, images, stock, is_active } = req.body;

    // Сериализуем массив images в JSON для SQLite
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images;

    await dbRun(
      `UPDATE products 
       SET category_id = ?, name = ?, description = ?, price = ?, 
           image_url = ?, images = ?, stock = ?, is_active = ?
       WHERE id = ?`,
      [category_id, name, description, price, image_url, imagesJson, stock, is_active ? 1 : 0, req.params.id]
    );

    const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(product);
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

// Удалить товар (для локальной разработки без auth)
router.delete('/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Товар удален' });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

export default router;

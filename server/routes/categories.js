import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Получить все категории
router.get('/', async (req, res) => {
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Ошибка получения категорий' });
  }
});

// Создать категорию (только админ)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, image_url } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название обязательно' });
    }

    const id = randomUUID();
    await dbRun(
      'INSERT INTO categories (id, name, description, image_url) VALUES (?, ?, ?, ?)',
      [id, name, description, image_url]
    );

    const category = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json(category);
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    res.status(500).json({ error: 'Ошибка создания категории' });
  }
});

export default router;

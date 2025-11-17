import express from 'express';
import { dbRun, dbGet } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить профиль (для локальной разработки без auth)
router.get('/', async (req, res) => {
  try {
    const userId = 'admin-001';
    const profile = await dbGet(
      'SELECT id, email, full_name, phone, address, created_at FROM profiles WHERE id = ?',
      [userId]
    );

    if (!profile) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// Обновить профиль (для локальной разработки без auth)
router.put('/', async (req, res) => {
  try {
    const { full_name, phone, address } = req.body;
    const userId = 'admin-001';

    await dbRun(
      'UPDATE profiles SET full_name = ?, phone = ?, address = ? WHERE id = ?',
      [full_name, phone, address, userId]
    );

    const profile = await dbGet(
      'SELECT id, email, full_name, phone, address FROM profiles WHERE id = ?',
      [userId]
    );

    res.json(profile);
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

export default router;

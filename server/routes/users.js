import express from 'express';
import { dbAll } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить роли пользователя
router.get('/:id/roles', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const roles = await dbAll(
      'SELECT role FROM user_roles WHERE user_id = ?',
      [userId]
    );
    res.json(roles);
  } catch (error) {
    console.error('Ошибка получения ролей:', error);
    res.status(500).json({ error: 'Ошибка получения ролей' });
  }
});

export default router;

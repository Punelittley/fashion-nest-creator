import express from 'express';
import { dbAll } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Получить всех пользователей (только для админов)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbAll(
      `SELECT id, email, full_name, phone, address, created_at 
       FROM profiles 
       ORDER BY created_at DESC`
    );
    
    res.json(users);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

export default router;

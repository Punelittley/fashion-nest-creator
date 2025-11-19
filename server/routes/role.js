import express from 'express';
import { dbGet } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Проверить, является ли пользователь администратором
router.get('/check-admin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const role = await dbGet(
      'SELECT role FROM user_roles WHERE user_id = ? AND role = ?',
      [userId, 'admin']
    );
    
    res.json({ isAdmin: !!role });
  } catch (error) {
    console.error('Ошибка проверки роли:', error);
    res.status(500).json({ error: 'Ошибка проверки роли', isAdmin: false });
  }
});

export default router;

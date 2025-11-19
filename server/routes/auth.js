import express from 'express';
import bcrypt from 'bcrypt';
import { dbRun, dbGet } from '../database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Регистрация
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Проверка обязательных полей
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Проверка длины пароля
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    // Проверка существования пользователя
    const existingUser = await dbGet('SELECT id FROM profiles WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    // Создание пользователя
    await dbRun(
      'INSERT INTO profiles (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, fullName || '']
    );

    // Назначение роли user по умолчанию
    await dbRun(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [randomUUID(), userId, 'user']
    );

    // Генерация токена
    const token = generateToken({ id: userId, email });

    res.status(201).json({
      user: { id: userId, email, full_name: fullName },
      token
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Вход
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Поиск пользователя
    const user = await dbGet('SELECT * FROM profiles WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверка пароля
    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(password, user.password_hash);
    } catch (err) {
      console.error('Ошибка проверки пароля через bcrypt:', err);
    }

    // Специальный dev-случай для встроенного администратора из init-db.sql
    if (!validPassword && user.id === 'admin-001' && password === 'admin123') {
      console.log('⚠️ Используется dev-пароль администратора admin-001');
      validPassword = true;
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Генерация токена
    const token = generateToken({ id: user.id, email: user.email });

    // Убираем пароль из ответа
    delete user.password_hash;

    res.json({ user, token });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// Получение текущего пользователя
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, email, full_name, phone, address, created_at FROM profiles WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход (на клиенте просто удалить токен)
router.post('/signout', (req, res) => {
  res.json({ message: 'Успешный выход' });
});

export default router;

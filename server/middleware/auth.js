import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для проверки JWT токена
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('🔐 Auth header:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('🎟️ Token:', token ? `${token.substring(0, 20)}...` : 'отсутствует');

  // Специальный случай: маркер "supabase" считаем отсутствием токена
  if (!token || token === 'supabase') {
    console.log('❌ Токен отсутствует или это маркер supabase');
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Ошибка верификации токена:', err.message);
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    console.log('✅ Токен валидный, пользователь:', user.id);
    req.user = user;
    next();
  });
};

// Middleware для проверки роли админа
export const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const { dbGet } = await import('../database.js');
    const role = await dbGet(
      'SELECT role FROM user_roles WHERE user_id = ? AND role = ?',
      [req.user.id, 'admin']
    );

    if (!role) {
      return res.status(403).json({ error: 'Требуются права администратора' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Ошибка проверки прав доступа' });
  }
};

// Функция для генерации токена
export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

import express from 'express';
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Получить или создать чат пользователя
router.get('/chat', authenticateToken, async (req, res) => {
  try {
    // Проверить существующий открытый чат
    let chat = await dbGet(
      'SELECT * FROM support_chats WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id, 'open']
    );

    if (!chat) {
      // Создать новый чат
      const chatId = randomUUID();
      await dbRun(
        'INSERT INTO support_chats (id, user_id, status) VALUES (?, ?, ?)',
        [chatId, req.user.id, 'open']
      );
      chat = await dbGet('SELECT * FROM support_chats WHERE id = ?', [chatId]);
    }

    res.json(chat);
  } catch (error) {
    console.error('Ошибка получения чата:', error);
    res.status(500).json({ error: 'Ошибка получения чата' });
  }
});

// Получить сообщения чата
router.get('/chat/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Проверить, что чат принадлежит пользователю
    const chat = await dbGet(
      'SELECT * FROM support_chats WHERE id = ? AND user_id = ?',
      [chatId, req.user.id]
    );

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    const messages = await dbAll(
      'SELECT * FROM support_messages WHERE chat_id = ? ORDER BY created_at ASC',
      [chatId]
    );

    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
});

// Отправить сообщение
router.post('/chat/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    // Проверить, что чат принадлежит пользователю
    const chat = await dbGet(
      'SELECT * FROM support_chats WHERE id = ? AND user_id = ?',
      [chatId, req.user.id]
    );

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    const messageId = randomUUID();
    await dbRun(
      'INSERT INTO support_messages (id, chat_id, sender_type, message) VALUES (?, ?, ?, ?)',
      [messageId, chatId, 'user', message]
    );

    const newMessage = await dbGet('SELECT * FROM support_messages WHERE id = ?', [messageId]);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

// Закрыть чат
router.patch('/chat/:chatId/close', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Проверить, что чат принадлежит пользователю
    const chat = await dbGet(
      'SELECT * FROM support_chats WHERE id = ? AND user_id = ?',
      [chatId, req.user.id]
    );

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    await dbRun(
      'UPDATE support_chats SET status = ? WHERE id = ?',
      ['closed', chatId]
    );

    res.json({ message: 'Чат закрыт' });
  } catch (error) {
    console.error('Ошибка закрытия чата:', error);
    res.status(500).json({ error: 'Ошибка закрытия чата' });
  }
});

export default router;

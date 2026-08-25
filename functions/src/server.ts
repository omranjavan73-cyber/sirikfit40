import express from 'express';
import { getTelegramConfig, saveTelegramConfig, testTelegramConnection, sendTelegramOrderNotification } from './notifications/telegramService';

export const telegramRouter = express.Router();

telegramRouter.get('/api/admin/telegram-config', async (req, res) => {
  try {
    const config = await getTelegramConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

telegramRouter.post('/api/admin/telegram-config', async (req, res) => {
  try {
    const updated = await saveTelegramConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

telegramRouter.post('/api/admin/test-telegram', async (req, res) => {
  try {
    const { botToken, chatId, topicId } = req.body || {};
    const result = await testTelegramConnection({ botToken, chatId, topicId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

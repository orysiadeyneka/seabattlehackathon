const express = require('express');
const botService = require('../services/botService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(botService.listBots());
});

router.post('/register', (req, res) => {
  const { name, password, confirmPassword } = req.body || {};
  if (!name || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Missing name or password' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  try {
    const bot = botService.createBot({ name, password });
    res.json(bot);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/set-url', (req, res) => {
  const { name, password, url } = req.body || {};
  if (!name || !password || !url) {
    return res.status(400).json({ error: 'Missing name, password or url' });
  }
  try {
    const bot = botService.updateBotUrl({ name, password, url });
    res.json(bot);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;

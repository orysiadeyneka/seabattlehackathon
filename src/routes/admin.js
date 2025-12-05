const express = require('express');
const tournamentEngine = require('../services/tournamentEngine');
const botService = require('../services/botService');
const storage = require('../services/storage');

const router = express.Router();

function checkAdmin(req, res, next) {
  const header = req.header('X-Admin-Password');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || header !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(checkAdmin);

router.post('/bots/:id/remove', (req, res) => {
  try {
    botService.removeBot(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/tournament/start', (req, res) => {
  tournamentEngine.start();
  res.json({ ok: true });
});

router.post('/tournament/pause', (req, res) => {
  tournamentEngine.pause();
  res.json({ ok: true });
});

router.post('/tournament/resume', (req, res) => {
  tournamentEngine.resume();
  res.json({ ok: true });
});

router.get('/status', (req, res) => {
  res.json(tournamentEngine.getStatus());
});

router.get('/history', (req, res) => {
  res.json({
    tournaments: storage.getTournaments(),
    matches: storage.getMatches()
  });
});

router.post('/history/clear', (req, res) => {
  try {
    storage.saveTournaments([]);
    storage.saveMatches([]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to clear history', e);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;

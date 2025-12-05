const fs = require('fs');
const path = require('path');

const STORAGE_PATH = process.env.STORAGE_PATH || 'data';
const LOG_DIR = path.resolve(STORAGE_PATH, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'game-events.log');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logEvent(event) {
  try {
    ensureDir();
    const entry = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.error('Failed to write game log entry', err);
  }
}

module.exports = {
  logEvent,
};

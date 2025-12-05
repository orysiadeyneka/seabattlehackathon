const fs = require('fs');
const path = require('path');

const STORAGE_PATH = process.env.STORAGE_PATH || 'data';

const files = {
  bots: 'bots.json',
  tournaments: 'tournaments.json',
  matches: 'matches.json',
};

function ensureDir() {
  const dir = path.resolve(STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function defaultData(key) {
  switch (key) {
    case 'bots': return [];
    case 'tournaments': return [];
    case 'matches': return [];
    default: return null;
  }
}

function read(key) {
  const filePath = path.resolve(STORAGE_PATH, files[key]);
  if (!fs.existsSync(filePath)) {
  return defaultData(key);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw || 'null') ?? defaultData(key);
  } catch (e) {
    console.error('Failed to parse storage file', filePath, e);
    return defaultData(key);
  }
}

function writeFile(key, data) {
  const filePath = path.resolve(STORAGE_PATH, files[key]);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  async init() {
    ensureDir();
    for (const key of Object.keys(files)) {
      const filePath = path.resolve(STORAGE_PATH, files[key]);
      if (!fs.existsSync(filePath)) {
        writeFile(key, defaultData(key));
      }
    }
  },

  getBots() {
    return read('bots');
  },

  saveBots(bots) {
    writeFile('bots', bots);
  },

  getTournaments() {
    return read('tournaments');
  },

  saveTournaments(tournaments) {
    writeFile('tournaments', tournaments);
  },

  getMatches() {
    return read('matches');
  },

  saveMatches(matches) {
    writeFile('matches', matches);
  }
};

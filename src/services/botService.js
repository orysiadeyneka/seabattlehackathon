const crypto = require('crypto');
const storage = require('./storage');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function publicBotView(bot) {
  return {
    id: bot.id,
    name: bot.name,
    botUrl: bot.botUrl,
    createdAt: bot.createdAt,
    lastUpdateAt: bot.lastUpdateAt,
    stats: bot.stats || { wins: 0, losses: 0, draws: 0 }
  };
}

function ensureStats(bot) {
  if (!bot.stats) {
    bot.stats = { wins: 0, losses: 0, draws: 0 };
  } else {
    if (typeof bot.stats.wins !== 'number') bot.stats.wins = 0;
    if (typeof bot.stats.losses !== 'number') bot.stats.losses = 0;
    if (typeof bot.stats.draws !== 'number') bot.stats.draws = 0;
  }
}

module.exports = {
  listBots() {
    const bots = storage.getBots();
    return bots.map(publicBotView);
  },

  findByName(name) {
    const bots = storage.getBots();
    return bots.find(b => b.name.toLowerCase() === name.toLowerCase());
  },

  createBot({ name, password }) {
    const bots = storage.getBots();
    if (bots.find(b => b.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Bot name already taken');
    }
    const now = new Date().toISOString();
    const bot = {
      id: crypto.randomUUID(),
      name,
      passwordHash: hashPassword(password),
      botUrl: null,
      createdAt: now,
      lastUpdateAt: now,
      stats: { wins: 0, losses: 0, draws: 0 }
    };
    bots.push(bot);
    storage.saveBots(bots);
    return publicBotView(bot);
  },

  updateBotUrl({ name, password, url }) {
    const bots = storage.getBots();
    const bot = bots.find(b => b.name.toLowerCase() === name.toLowerCase());
    if (!bot) throw new Error('Bot not found');
    if (bot.passwordHash !== hashPassword(password)) {
      throw new Error('Invalid password');
    }
    bot.botUrl = url;
    bot.lastUpdateAt = new Date().toISOString();
    storage.saveBots(bots);
    return publicBotView(bot);
  },

  removeBot(id) {
    let bots = storage.getBots();
    const before = bots.length;
    bots = bots.filter(b => b.id !== id);
    if (bots.length === before) {
      throw new Error('Bot not found');
    }
    storage.saveBots(bots);
  },


  recordMatchResult(winnerId, loserId) {
    const bots = storage.getBots();
    for (const bot of bots) {
      ensureStats(bot);
      if (bot.id === winnerId) bot.stats.wins += 1;
      if (bot.id === loserId) bot.stats.losses += 1;
    }
    storage.saveBots(bots);
  },

  recordDrawResult(botAId, botBId) {
    const bots = storage.getBots();
    for (const bot of bots) {
      ensureStats(bot);
      if (bot.id === botAId || bot.id === botBId) {
        bot.stats.draws += 1;
      }

    }
    storage.saveBots(bots);
  }

};

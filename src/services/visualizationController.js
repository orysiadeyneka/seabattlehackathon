let wss = null;

function broadcast(type, payload) {
  if (!wss) return;
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

module.exports = {
  init(server) {
    wss = server;
    wss.on('connection', ws => {
      ws.send(JSON.stringify({ type: 'welcome', payload: { ok: true } }));
    });
  },

  matchStart(data) {
    broadcast('match_start', data);
  },

  matchUpdate(data) {
    broadcast('match_update', data);
  },

  matchEnd(data) {
    broadcast('match_end', data);
  },

  tournamentStart(data) {
    broadcast('tournament_start', data);
  },

  tournamentEnd(data) {
    broadcast('tournament_end', data);
  },

  leaderboardUpdate(data) {
    broadcast('leaderboard_update', data);
  },

  leaderboardGlobalUpdate(data) {
    broadcast('leaderboard_global_update', data);
  },

  radarPing(data) {
    broadcast('radar_ping', data);
  },

  explosion(data) {
    broadcast('explosion', data);
  },

  matchEndBanner(data) {
    broadcast('match_end_banner', data);
  }
};

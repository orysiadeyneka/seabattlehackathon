const crypto = require('crypto');
const storage = require('./storage');
const botService = require('./botService');
const matchEngine = require('./matchEngine');

let visualization = null;

let state = {
  running: false,
  paused: false,
  currentTournament: null,
  queue: [],
  currentMatch: null
};

function buildGlobalLeaderboard() {
  const bots = botService.listBots();
  const board = {};
  for (const b of bots) {
    const stats = b.stats || {};
    board[b.id] = {
      botId: b.id,
      name: b.name,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      draws: stats.draws || 0
    };
  }
  return board;
}


function generateRoundRobinPairs(bots) {
  const pairs = [];
  for (let i = 0; i < bots.length; i++) {
    for (let j = i + 1; j < bots.length; j++) {
      pairs.push([bots[i], bots[j]]);
    }
  }
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

async function runLoop() {
  try {
    if (!state.running) return;
    if (state.paused) {
      setTimeout(runLoop, 1000);
      return;
    }

    if (!state.currentTournament || state.queue.length === 0) {
      const bots = botService.listBots().filter(b => b.botUrl);
      if (bots.length < 2) {
        state.running = false;
        state.currentTournament = null;
        return;
      }

      const tournamentId = crypto.randomUUID();

      // 🔹 Determine tournament number from history (1-based)
      const pastTournaments = storage.getTournaments();
      const tournamentNumber = pastTournaments.length + 1;

      const pairs = generateRoundRobinPairs(bots);
      state.currentTournament = {
        id: tournamentId,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        matches: [],
        leaderboard: {}
      };
      for (const b of bots) {
        state.currentTournament.leaderboard[b.id] = { botId: b.id, name: b.name, wins: 0, losses: 0, draws: 0 };
      }
      state.queue = pairs;

      visualization.tournamentStart({
        id: tournamentId,
        number: tournamentNumber,
        botIds: bots.map(b => b.id)
      });
    }

    const [botA, botB] = state.queue.shift();
    const matchNumber = state.currentTournament.matches.length + 1;
    state.currentMatch = { botA, botB, matchNumber };

    const gameId = crypto.randomUUID();
    const result = await matchEngine.runMatch({
      gameId,
      botA,
      botB,
      visualization,
      tournamentNumber: state.currentTournament.number,
      matchNumber
    });

    const matches = storage.getMatches();
    const matchRecord = {
      id: crypto.randomUUID(),
      tournamentId: state.currentTournament.id,
      gameId,
      matchNumber,
      botAId: botA.id,
      botBId: botB.id,
      winnerId: result.winnerId,
      loserId: result.loserId,
      reason: result.reason,
      createdAt: new Date().toISOString()
    };
    matches.push(matchRecord);
    storage.saveMatches(matches);

    state.currentTournament.matches.push(matchRecord);

    const board = state.currentTournament.leaderboard;

    if (result.reason === 'draw') {
      // 🔹 Draw: both bots get a draw
      botService.recordDrawResult(botA.id, botB.id);

      board[botA.id].draws = (board[botA.id].draws || 0) + 1;
      board[botB.id].draws = (board[botB.id].draws || 0) + 1;

      visualization.leaderboardUpdate({
        tournamentId: state.currentTournament.id,
        leaderboard: board
      });

      // 🔹 Also send GLOBAL leaderboard
      visualization.leaderboardGlobalUpdate({
        leaderboard: buildGlobalLeaderboard()
      });

    } else if (result.winnerId && result.loserId) {
      // 🔹 Normal win/loss
      botService.recordMatchResult(result.winnerId, result.loserId);

      board[result.winnerId].wins = (board[result.winnerId].wins || 0) + 1;
      board[result.loserId].losses = (board[result.loserId].losses || 0) + 1;

      visualization.leaderboardUpdate({
        tournamentId: state.currentTournament.id,
        leaderboard: board
      });

      visualization.leaderboardGlobalUpdate({
        leaderboard: buildGlobalLeaderboard()
      });
    }

    state.currentMatch = null;

    // Send match end banner for all matches (including last match)
    let bannerMessage = '';
    if (result.reason === 'draw') {
      bannerMessage = 'DRAW';
    } else {
      const winner = result.winnerId === botA.id ? botA : botB;
      bannerMessage = `${winner.name.toUpperCase()} WINS!`;
    }

    visualization.matchEndBanner({
      message: bannerMessage,
      isDraw: result.reason === 'draw',
      winnerId: result.winnerId
    });

    if (state.queue.length === 0) {
      state.currentTournament.finishedAt = new Date().toISOString();
      const tournaments = storage.getTournaments();
      tournaments.push(state.currentTournament);
      storage.saveTournaments(tournaments);

      visualization.tournamentEnd({
        id: state.currentTournament.id,
        number: state.currentTournament.number,
        leaderboard: state.currentTournament.leaderboard
      });

      state.currentTournament = null;
      state.currentTournament = {
        leaderboard: {}
      };

      // Send empty leaderboard to UI
      visualization.leaderboardUpdate({
        tournamentId: null,
        leaderboard: {}
      });

      setTimeout(runLoop, 10000);
    } else {
      setTimeout(runLoop, 5000);
    }
  } catch (error) {
    console.error('[Tournament Engine] Error in runLoop:', error);
    state.currentMatch = null;
    // Continue the loop despite errors
    setTimeout(runLoop, 5000);
  }
}

module.exports = {
  init({ storage: storageService, visualization: vis }) {
    visualization = vis;
  },

  start() {
    if (state.running) return;
    state.running = true;
    state.paused = false;
    runLoop();
  },

  pause() {
    state.paused = true;
  },

  resume() {
    if (!state.running) {
      state.running = true;
      state.paused = false;
      runLoop();
    } else {
      state.paused = false;
    }
  },

  getStatus() {
    return {
      running: state.running,
      paused: state.paused,
      currentTournament: state.currentTournament,
      currentMatch: state.currentMatch
    };
  }
};

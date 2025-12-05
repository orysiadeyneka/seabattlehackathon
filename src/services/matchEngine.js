const { BOARD_SIZE, validateShips, buildInternalBoard, applyShot, applyRadar, clone } = require('./gameRules');
const logger = require('./logger');

const MOVE_DELAY_MS = 300;
const MATCH_PAUSE_MS = 5000;

const MAX_MOVES_PER_BOT = 107;

async function postJson(url, body) {

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from bot`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPlacement(bot, gameId) {
  if (!bot.botUrl) {
    throw new Error(`Bot ${bot.name} has no URL set`);
  }
  const url = bot.botUrl.endsWith('/') ? bot.botUrl + 'placement' : bot.botUrl + '/placement';
  return postJson(url, { gameId, boardSize: BOARD_SIZE });
}

async function getMove(bot, gameId, turn, context) {
  const url = bot.botUrl.endsWith('/') ? bot.botUrl + 'move' : bot.botUrl + '/move';  return postJson(url, {
    gameId,
    turn,
    yourShots: context.yourShots,
    opponentShots: context.opponentShots,
    radarUsed: context.radarUsed,
    radarHistory: context.radarHistory
  });
}

async function runMatch({ gameId, botA, botB, visualization, tournamentNumber, matchNumber }) {
  const matchMeta = {
    gameId,
    botA: { id: botA.id, name: botA.name },
    botB: { id: botB.id, name: botB.name }
  };

  visualization.matchStart({
    gameId,
    tournamentNumber,
    matchNumber,
    botA: matchMeta.botA,
    botB: matchMeta.botB
  });

  logger.logEvent({
    type: 'match_start',
    gameId,
    botA: matchMeta.botA,
    botB: matchMeta.botB,
  });


  let placementA, placementB;
  try {
    placementA = await getPlacement(botA, gameId);
    placementB = await getPlacement(botB, gameId);
  } catch (e) {
    console.error(`Error getting placement for bot ${botA.name} or ${botB.name}:`, e);
    const winner = placementA ? botA : botB;
    const loser = placementA ? botB : botA;
    visualization.matchEnd({
      gameId,
      matchNumber,
      winnerId: winner.id,
      loserId: loser.id,
      reason: 'placement_timeout_or_error'
    });
    await sleep(MATCH_PAUSE_MS);
    return {
      winnerId: winner.id,
      loserId: loser.id,
      reason: 'placement_timeout_or_error'
    };
  }

  const valA = validateShips(placementA.ships || []);
  const valB = validateShips(placementB.ships || []);
  if (!valA.ok || !valB.ok) {
    const invalidA = !valA.ok;
    const winner = invalidA ? botB : botA;
    const loser = invalidA ? botA : botB;
    visualization.matchEnd({
      gameId,
      matchNumber,
      winnerId: winner.id,
      loserId: loser.id,
      reason: 'invalid_placement'
    });
    await sleep(MATCH_PAUSE_MS);
    return {
      winnerId: winner.id,
      loserId: loser.id,
      reason: 'invalid_placement'
    };
  }

  const stateA = {
    ownerId: botA.id,
    ...buildInternalBoard(placementA.ships),
    hits: [],
    partialHits: [],
    misses: []
  };
  const stateB = {
    ownerId: botB.id,
    ...buildInternalBoard(placementB.ships),
    hits: [],
    partialHits: [],
    misses: []
  };

  visualization.matchUpdate({
    gameId,
    matchNumber,
    phase: 'placement_done',
    boards: {
      [botA.id]: placementA.ships,
      [botB.id]: placementB.ships
    }
  });

  // 🔎 Log placements for both bots
  logger.logEvent({
    type: 'placement',
    gameId,
    botA: { id: botA.id, name: botA.name, ships: placementA.ships },
    botB: { id: botB.id, name: botB.name, ships: placementB.ships },
  });


  let turn = 1;

  const movesCount = {
    A: 0,
    B: 0
  };

  // Total enemy ship "cells" hit (including armor hits on battleships)
  const hitCells = {
    A: 0,
    B: 0
  };
  let current = 'A';
  let radarUsedA = false;
  let radarUsedB = false;
  const radarHistoryA = [];
  const radarHistoryB = [];

  const shotsA = [];
  const shotsB = [];

  while (true) {
    const attacker = current === 'A' ? botA : botB;
    const defender = current === 'A' ? botB : botA;
    const attackerStateShots = current === 'A' ? shotsA : shotsB;
    const defenderStateShots = current === 'A' ? shotsB : shotsA;
    const enemyState = current === 'A' ? stateB : stateA;
    const attackerRadarUsed = current === 'A' ? radarUsedA : radarUsedB;
    const attackerRadarHistory = current === 'A' ? radarHistoryA : radarHistoryB;

    let move;
    try {
      move = await getMove(attacker, gameId, turn, {
        yourShots: clone(attackerStateShots),
        opponentShots: clone(defenderStateShots),
        radarUsed: attackerRadarUsed,
        radarHistory: clone(attackerRadarHistory)
      });
      if (move && (move.type === 'shot' || move.type === 'radar')) {
        movesCount[current]++;
      }
    } catch (e) {
      visualization.matchEnd({
        gameId,
        matchNumber,
        winnerId: defender.id,
        loserId: attacker.id,
        reason: 'move_timeout_or_error'
      });
      await sleep(MATCH_PAUSE_MS);
      return {
        winnerId: defender.id,
        loserId: attacker.id,
        reason: 'move_timeout_or_error'
      };
    }

    if (!move || !move.type) {
      visualization.matchEnd({
        gameId,
        winnerId: defender.id,
        loserId: attacker.id,
        reason: 'invalid_move'
      });
      await sleep(MATCH_PAUSE_MS);
      return {
        winnerId: defender.id,
        loserId: attacker.id,
        reason: 'invalid_move'
      };
    }

    if (move.type === 'shot') {
      const { x, y } = move;
      const shotResult = applyShot(enemyState, x, y);
      let finalResult = shotResult.result;
      if (shotResult.result === 'sunk_partial') {
        finalResult = 'hit';
      }
      attackerStateShots.push({ x, y, result: finalResult });

      if (finalResult === 'hit' || finalResult === 'sunk') {
        visualization.explosion({ gameId, x, y, attackerId: attacker.id, defenderId: defender.id });
      }

      visualization.matchUpdate({
        gameId,
        matchNumber,
        turn,
        type: 'shot',
        attackerId: attacker.id,
        defenderId: defender.id,
        x,
        y,
        result: finalResult
      });

      logger.logEvent({
        type: 'move_shot',
        gameId,
        turn,
        attackerId: attacker.id,
        defenderId: defender.id,
        x,
        y,
        result: finalResult,
      });

      if (shotResult.result === 'hit' || shotResult.result === 'sunk' || shotResult.result === 'sunk_partial') {
        hitCells[current]++;
      }


      if (shotResult.destroyedAll) {
        visualization.matchEnd({
          gameId,
          matchNumber,
          winnerId: attacker.id,
          loserId: defender.id,
          reason: 'all_ships_destroyed'
        });
        await sleep(MATCH_PAUSE_MS);
        return {
          winnerId: attacker.id,
          loserId: defender.id,
          reason: 'all_ships_destroyed'
        };
      }

    } else if (move.type === 'radar') {
      if (attackerRadarUsed) {
        visualization.matchEnd({
          gameId,
          matchNumber,
          winnerId: defender.id,
          loserId: attacker.id,
          reason: 'radar_used_twice'
        });
        await sleep(MATCH_PAUSE_MS);
        return {
          winnerId: defender.id,
          loserId: attacker.id,
          reason: 'radar_used_twice'
        };
      }
      const center = move.center || { x: 0, y: 0 };
      const visibleCells = applyRadar(enemyState, center);
      const radarObj = { center, visibleCells };

      if (current === 'A') {
        radarUsedA = true;
        radarHistoryA.push(radarObj);
      } else {
        radarUsedB = true;
        radarHistoryB.push(radarObj);
      }

      visualization.radarPing({
        gameId,
        attackerId: attacker.id,
        defenderId: defender.id,
        center,
        visibleCells
      });

      visualization.matchUpdate({
        gameId,
        matchNumber,
        turn,
        type: 'radar',
        attackerId: attacker.id,
        defenderId: defender.id,
        center,
        visibleCells
      });

      logger.logEvent({
        type: 'move_radar',
        gameId,
        turn,
        attackerId: attacker.id,
        defenderId: defender.id,
        center,
        visibleCells,
      });
    } else {
      visualization.matchEnd({
        gameId,
        matchNumber,
        winnerId: defender.id,
        loserId: attacker.id,
        reason: 'invalid_move_type'
      });
      await sleep(MATCH_PAUSE_MS);
      return {
        winnerId: defender.id,
        loserId: attacker.id,
        reason: 'invalid_move_type'
      };
    }

    await sleep(MOVE_DELAY_MS);

    current = current === 'A' ? 'B' : 'A';
    turn++;

    if (movesCount.A >= MAX_MOVES_PER_BOT && movesCount.B >= MAX_MOVES_PER_BOT) {
      let winner = null;
      let loser = null;

      if (hitCells.A > hitCells.B) {
        winner = botA;
        loser = botB;
      } else if (hitCells.B > hitCells.A) {
        winner = botB;
        loser = botA;
      }

      if (!winner) {
        // 🔹 True draw: same number of enemy cells hit
        visualization.matchEnd({
          gameId,
          matchNumber,
          winnerId: null,
          loserId: null,
          reason: 'draw'            // <--- use plain 'draw'
        });

        logger.logEvent({
          type: 'match_end',
          gameId,
          winnerId: null,
          loserId: null,
          reason: 'draw_max_moves'
        });

        return {
          gameId,
          winnerId: null,
          loserId: null,
          reason: 'draw',           // <--- tournamentEngine can key off this
          totalTurns: turn
        };
      }

      // 🔹 Someone wins on hits
      visualization.matchEnd({
        gameId,
        matchNumber,
        winnerId: winner.id,
        loserId: loser.id,
        reason: 'max_moves_reached'
      });

      logger.logEvent({
        type: 'match_end',
        gameId,
        winnerId: winner.id,
        loserId: loser.id,
        reason: 'max_moves_reached'
      });

      await sleep(MATCH_PAUSE_MS);

      return {
        gameId,
        winnerId: winner.id,
        loserId: loser.id,
        reason: 'max_moves_reached',
        totalTurns: turn
      };
    }

  }
}

module.exports = {
  runMatch
};

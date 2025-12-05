const BOARD_SIZE = 10;

const boardA = document.getElementById('boardA');
const boardB = document.getElementById('boardB');
const ctxA = boardA.getContext('2d');
const ctxB = boardB.getContext('2d');

let currentMatch = null;
let placements = {
  A: [],
  B: []
};
let leaderboard = {};
let globalLeaderboard = {};
let currentTournamentNumber = null;

// Track shots on each board so we can redraw after radar highlight
let shotsOnA = []; // shots on Bot A's board
let shotsOnB = []; // shots on Bot B's board

// Track active explosions
let explosions = [];
let explosionImg = null;

// Load explosion image
window.addEventListener('load', () => {
  explosionImg = new Image();
  explosionImg.src = '/images/explosion.gif';
});

function showMatchEndBanner(message, isDraw) {
  const banner = document.getElementById('match-end-banner');
  if (!banner) {
    // Create banner if it doesn't exist
    const div = document.createElement('div');
    div.id = 'match-end-banner';
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border: 4px solid #FFD700;
      border-radius: 20px;
      padding: 40px 60px;
      text-align: center;
      z-index: 1000;
      box-shadow: 0 10px 50px rgba(0,0,0,0.8);
      animation: bannerSlideIn 0.5s ease-out;
    `;
    document.body.appendChild(div);
  }
  
  const bannerEl = document.getElementById('match-end-banner');
  if (isDraw) {
    bannerEl.innerHTML = '<h1 style="font-size: 4em; color: #FFD700; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">DRAW</h1>';
  } else {
    bannerEl.innerHTML = `
      <h1 style="font-size: 3.5em; color: #FFD700; margin: 0 0 20px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${message}</h1>
      <div style="font-size: 3em;">🏆</div>
    `;
  }
  
  bannerEl.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    bannerEl.style.display = 'none';
  }, 3000);
}


function drawGrid(ctx) {
  const size = boardA.width;
  const cell = size / BOARD_SIZE;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#D6EEF3';          // board background color
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#c1d9f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    const p = i * cell;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
}

function colorForShip(type) {
  if (type === 'battleship') return '#76649C'; // violet
  if (type === 'submarine') return '#F8C40A'; // yellow
  return '#2B3941'; // other ships
}

// Helper: draw rounded rectangle / capsule
function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPlacement(ctx, ships) {
  const size = boardA.width;
  const cell = size / BOARD_SIZE;

  for (const ship of ships) {
    const cells = ship.cells;
    if (!cells || !cells.length) continue;

    ctx.fillStyle = colorForShip(ship.type);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; // subtle outline
    ctx.lineWidth = 2;

    // Compute ship bounding box
    const xs = cells.map(c => c.x);
    const ys = cells.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const horizontal = (minY === maxY); // ships are always straight in rules

    if (horizontal) {
      const x = minX * cell + 4;
      const y = minY * cell + 6;
      const width = (maxX - minX + 1) * cell - 8;
      const height = cell - 14;
      const radius = height / 4;

      drawRoundedRect(ctx, x, y, width, height, radius);
      ctx.fill();
      ctx.stroke();
    } else {
      const x = minX * cell + 6;
      const y = minY * cell + 4;
      const width = cell - 14;
      const height = (maxY - minY + 1) * cell - 8;
      const radius = width / 4;

      drawRoundedRect(ctx, x, y, width, height, radius);
      ctx.fill();
      ctx.stroke();
    }
  }
}


function drawShot(ctx, x, y, result, isActive = false) {
  const size = boardA.width;
  const cell = size / BOARD_SIZE;
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;

  if (result === 'miss') {
    ctx.fillStyle = '#EB5724';
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (isActive && explosionImg && explosionImg.complete) {
    // Draw explosion gif during active explosion phase
    const size = cell * 1.6;
    ctx.drawImage(explosionImg, cx - size / 2, cy - size / 2, size, size);
  } else {
    // Draw cross for hit
    ctx.strokeStyle = '#EB5724';
    ctx.beginPath();
    ctx.moveTo(cx - cell * 0.2, cy - cell * 0.2);
    ctx.lineTo(cx + cell * 0.2, cy + cell * 0.2);
    ctx.moveTo(cx + cell * 0.2, cy - cell * 0.2);
    ctx.lineTo(cx - cell * 0.2, cy + cell * 0.2);
    ctx.stroke();
  }
}

function redrawBoard(ctx, ships, shots) {
  drawGrid(ctx);
  drawPlacement(ctx, ships);
  for (const s of shots) {
    const isActive = explosions.some(e => e.x === s.x && e.y === s.y && (e.result === 'hit' || e.result === 'sunk'));
    drawShot(ctx, s.x, s.y, s.result, isActive);
  }
}

function redrawBoards() {
  // Update active explosions
  const now = Date.now();
  explosions = explosions.filter(e => now - e.startTime < e.duration);
  
  redrawBoard(ctxA, placements.A, shotsOnA);
  redrawBoard(ctxB, placements.B, shotsOnB);
  
  // Continue animation if there are active explosions
  if (explosions.length > 0) {
    requestAnimationFrame(redrawBoards);
  }
}

function drawRadarHighlight(ctx, center) {
  const size = boardA.width;
  const cell = size / BOARD_SIZE;

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffff00';

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = center.x + dx;
      const y = center.y + dy;
      if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) continue;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }
  }

  ctx.restore();
}

function logEvent(msg) {
  const log = document.getElementById('event-log');
  const div = document.createElement('div');
  div.className = 'log-entry';
  const t = new Date().toLocaleTimeString();
  div.innerHTML = `<span class="time">[${t}]</span><span class="msg">${msg}</span>`;
  log.prepend(div);
}

function updateLeaderboardTable() {
  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '';
  const entries = Object.values(leaderboard);

  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data yet.</td></tr>';
    return;
  }

  entries.sort((a, b) => {
    const aw = a.wins ?? 0;
    const bw = b.wins ?? 0;
    if (bw !== aw) return bw - aw;

    const ad = a.draws ?? 0;
    const bd = b.draws ?? 0;
    if (bd !== ad) return bd - ad;

    const al = a.losses ?? 0;
    const bl = b.losses ?? 0;
    return al - bl;
  });

  for (const row of entries) {
    const wins = row.wins ?? 0;
    const draws = row.draws ?? 0;
    const losses = row.losses ?? 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.name || row.botId}</td>
      <td>${wins}</td>
      <td>${draws}</td>
      <td>${losses}</td>
    `;
    tbody.appendChild(tr);
  }
}

function updateGlobalLeaderboardTable() {
  const tbody = document.getElementById('global-leaderboard-body');
  tbody.innerHTML = '';
  const entries = Object.values(globalLeaderboard);

  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data yet.</td></tr>';
    return;
  }

  entries.sort((a, b) => {
    const aw = a.wins ?? 0;
    const bw = b.wins ?? 0;
    if (bw !== aw) return bw - aw;

    const ad = a.draws ?? 0;
    const bd = b.draws ?? 0;
    if (bd !== ad) return bd - ad;

    const al = a.losses ?? 0;
    const bl = b.losses ?? 0;
    return al - bl;
  });

  for (const row of entries) {
    const wins = row.wins ?? 0;
    const draws = row.draws ?? 0;
    const losses = row.losses ?? 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.name || row.botId}</td>
      <td>${wins}</td>
      <td>${draws}</td>
      <td>${losses}</td>
    `;
    tbody.appendChild(tr);
  }
}



drawGrid(ctxA);
drawGrid(ctxB);

const proto = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${proto}://${location.host}/ws/visualization`);

ws.onopen = () => {
  logEvent('Connected to visualization WebSocket');
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  const type = msg.type;
  const payload = msg.payload;

  if (type === 'welcome') {
    return;
  }

  if (type === 'match_start') {
    currentMatch = {
      gameId: payload.gameId,
      botA: payload.botA,
      botB: payload.botB
    };
    document.getElementById('botA-name').textContent = payload.botA?.name ?? 'Bot A';
    document.getElementById('botB-name').textContent = payload.botB?.name ?? 'Bot B';
    const matchInfoEl = document.getElementById('match-info');

    if (currentTournamentNumber != null && payload.matchNumber != null) {
      // 🔹 Main UI text here:
      matchInfoEl.textContent =
        `Tournament ${currentTournamentNumber} – Game ${payload.matchNumber}`;
    } else if (payload.matchNumber != null) {
      matchInfoEl.textContent = `Game ${payload.matchNumber}`;
    } else {
      matchInfoEl.textContent = `Game ID: ${payload.gameId}`;
    }
    placements = { A: [], B: [] };
    shotsOnA = [];
    shotsOnB = [];

    drawGrid(ctxA);
    drawGrid(ctxB);

    logEvent(
      `New match` +
      (payload.matchNumber != null ? ` #${payload.matchNumber}` : '') +
      (currentTournamentNumber != null ? ` in Tournament ${currentTournamentNumber}` : '') +
      `: ${payload.botA?.name} vs ${payload.botB?.name}`
    );
  }

  if (type === 'match_update') {
    if (payload.phase === 'placement_done' && payload.boards && currentMatch) {
      placements.A = payload.boards[currentMatch.botA.id] || [];
      placements.B = payload.boards[currentMatch.botB.id] || [];

      redrawBoards();

      logEvent('Ship placement finished.');
      return;
    }

    if (payload.type === 'shot' && currentMatch) {
      const isA = payload.attackerId === currentMatch.botA.id;

      if (isA) {
        shotsOnB.push({ x: payload.x, y: payload.y, result: payload.result });
      } else {
        shotsOnA.push({ x: payload.x, y: payload.y, result: payload.result });
      }

      // Add explosion animation for hits and sunk
      if (payload.result !== 'miss') {
        explosions.push({
          x: payload.x,
          y: payload.y,
          result: payload.result,
          startTime: Date.now(),
          duration: 1600 // Show explosion for 1600ms (twice as long)
        });
        // Start animation loop
        requestAnimationFrame(redrawBoards);
      }

      const ctx = isA ? ctxB : ctxA;
      drawShot(ctx, payload.x, payload.y, payload.result);
      logEvent(`Turn ${payload.turn}: ${isA ? currentMatch.botA.name : currentMatch.botB.name} fired at (${payload.x}, ${payload.y}) – ${payload.result}`);

      if (payload.result === 'sunk') {
        const shakenBoard = isA ? boardB : boardA; // attacker A → B’s board, attacker B → A’s board

        // Restart animation if it was already applied before
        shakenBoard.classList.remove('shake-board');
        // Force reflow so browser restarts the animation
        void shakenBoard.offsetWidth;
        shakenBoard.classList.add('shake-board');
      }
    
  }

  if (payload.type === 'radar' && currentMatch) {
    const indicator = document.getElementById('radar-indicator');
    const isA = payload.attackerId === currentMatch.botA.id;
    const name = isA ? currentMatch.botA.name : currentMatch.botB.name;

    indicator.textContent = `${name} used RADAR at (${payload.center.x}, ${payload.center.y})`;
    setTimeout(() => { indicator.textContent = ''; }, 4000);
    logEvent(`${name} used RADAR.`);

    const defenderCtx = isA ? ctxB : ctxA;
    drawRadarHighlight(defenderCtx, payload.center);

    setTimeout(() => {
      if (isA) {
        redrawBoard(ctxB, placements.B, shotsOnB);
      } else {
        redrawBoard(ctxA, placements.A, shotsOnA);
      }
    }, 2000);
  }
}

if (type === 'match_end' && currentMatch) {
  const { winnerId, loserId, reason } = payload;
  let text = 'Match ended. ';
  if (winnerId) {
    const winnerName = winnerId === currentMatch.botA.id ? currentMatch.botA.name : currentMatch.botB.name;
    text += `Winner: ${winnerName}.`;
  } else {
    text += 'No winner.';
  }
  text += ` Reason: ${reason}`;
  logEvent(text);
}

if (type === 'tournament_start') {
  currentTournamentNumber = payload.number ?? null; // 🔹 store number
  if (payload.number != null) {
    logEvent(`Tournament #${payload.number} started (ID: ${payload.id})`);
  } else {
    logEvent(`Tournament started (ID: ${payload.id})`);
  }
}

if (type === 'tournament_end') {
  if (payload.number != null) {
    logEvent(`Tournament #${payload.number} finished (ID: ${payload.id})`);
  } else {
    logEvent(`Tournament finished (ID: ${payload.id})`);
  }
}

if (type === 'leaderboard_update') {
  leaderboard = {};
  const board = payload.leaderboard || {};
  for (const [botId, entry] of Object.entries(board)) {
    leaderboard[botId] = { ...entry };
  }
  updateLeaderboardTable();
}

if (type === 'leaderboard_global_update') {
  globalLeaderboard = {};
  const board = payload.leaderboard || {};
  for (const [botId, entry] of Object.entries(board)) {
    globalLeaderboard[botId] = { ...entry };
  }
  updateGlobalLeaderboardTable();
}

if (type === 'match_end_banner') {
  showMatchEndBanner(payload.message, payload.isDraw);
}

};

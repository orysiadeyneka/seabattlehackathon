/**
 * Game rules & helpers for 10x10 Sea Battle with special ships.
 */

const BOARD_SIZE = 10;

const SHIP_COUNTS = {
  fourdeck: 1,
  threeship: 1,   // regular 3-deck
  battleship: 1,  // 3-deck with armor (2 hits / cell)
  twoship: 2,     // regular 2-deck
  submarine: 1,   // 2-deck invisible to radar
  oneship: 4
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createEmptyBoard() {
  const grid = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push(null);
    }
    grid.push(row);
  }
  return grid;
}

function isInBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function validateShips(ships) {
  const counts = {
    fourdeck: 0,
    threeship: 0,
    battleship: 0,
    twoship: 0,
    submarine: 0,
    oneship: 0
  };

  for (const ship of ships) {
    if (!ship.type || !Array.isArray(ship.cells) || ship.cells.length === 0) {
      return { ok: false, reason: 'Invalid ship structure' };
    }

    if (!Object.prototype.hasOwnProperty.call(counts, ship.type)) {
      return { ok: false, reason: `Unknown ship type: ${ship.type}` };
    }

    counts[ship.type]++;

    for (const c of ship.cells) {
      if (!isInBounds(c.x, c.y)) {
        return { ok: false, reason: 'Ship cell out of bounds' };
      }
    }

    const xs = ship.cells.map(c => c.x);
    const ys = ship.cells.map(c => c.y);
    const uniqueX = new Set(xs).size;
    const uniqueY = new Set(ys).size;
    const length = ship.cells.length;

    if (!(uniqueX === 1 || uniqueY === 1)) {
      return { ok: false, reason: 'Ship must be straight (no bends)' };
    }

    const sorted = (uniqueX === 1 ? ys : xs).slice().sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        return { ok: false, reason: 'Ship cells must be contiguous' };
      }
    }

    if (ship.type === 'fourdeck' && length !== 4) return { ok: false, reason: 'fourdeck must be length 4' };
    if ((ship.type === 'threeship' || ship.type === 'battleship') && length !== 3) return { ok: false, reason: `${ship.type} must be length 3` };
    if ((ship.type === 'twoship' || ship.type === 'submarine') && length !== 2) return { ok: false, reason: `${ship.type} must be length 2` };
    if (ship.type === 'oneship' && length !== 1) return { ok: false, reason: 'oneship must be length 1' };
  }

  for (const [type, expected] of Object.entries(SHIP_COUNTS)) {
    if (counts[type] !== expected) {
      return { ok: false, reason: `Invalid number of ${type} ships (expected ${expected}, got ${counts[type]})` };
    }
  }

  const board = createEmptyBoard();
  for (const ship of ships) {
    for (const c of ship.cells) {
      if (board[c.y][c.x]) {
        return { ok: false, reason: 'Ships cannot overlap' };
      }
      board[c.y][c.x] = { shipType: ship.type };
    }
  }

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!board[y][x]) continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (!isInBounds(nx, ny)) continue;
        if (board[ny][nx]) {
          if (dx !== 0 && dy !== 0) {
            return { ok: false, reason: 'Ships cannot touch diagonally' };
          }
        }
      }
    }
  }

  return { ok: true, ships, board };
}

function buildInternalBoard(ships) {
  const board = createEmptyBoard();
  const cellsById = {};

  ships.forEach((ship, shipIndex) => {
    ship.cells.forEach((cell, cellIndex) => {
      const id = `${shipIndex}-${cellIndex}`;
      const maxHits = ship.type === 'battleship' ? 2 : 1; // armor for battleship

      const cellObj = {
        id,
        shipId: shipIndex,
        type: ship.type,
        x: cell.x,
        y: cell.y,
        hits: 0,
        maxHits
      };

      board[cell.y][cell.x] = cellObj;
      cellsById[id] = cellObj;
    });
  });
  return { board, cellsById };
}

function applyShot(state, x, y) {
  if (!isInBounds(x, y)) {
    return { result: 'miss', destroyedAll: false };
  }

  const cell = state.board[y][x];
  if (!cell) {
    state.misses.push({ x, y });
    return { result: 'miss', destroyedAll: false };
  }

  // already destroyed cell: no effect
  if (cell.hits >= cell.maxHits) {
    return { result: 'miss', destroyedAll: false };
  }

  cell.hits++;

  if (cell.hits < cell.maxHits) {
    state.partialHits.push({ x, y });
    return { result: 'hit', destroyedAll: false };
  }

  // cell reached maxHits now
  state.hits.push({ x, y });

  // group by ship instance, not by type
  const shipCells = Object.values(state.cellsById).filter(c =>
    c.shipId === cell.shipId
  );
  const shipStillAlive = shipCells.some(c => c.hits < c.maxHits);
  const result = shipStillAlive ? 'sunk_partial' : 'sunk';

  const anyAlive = Object.values(state.cellsById).some(c => c.hits < c.maxHits);
  const destroyedAll = !anyAlive;

  return { result, destroyedAll };
}



function applyRadar(state, center) {
  const visible = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = center.x + dx;
      const y = center.y + dy;
      if (!isInBounds(x, y)) continue;
      const cell = state.board[y][x];
      if (cell && cell.type !== 'submarine') {
        visible.push({ x, y });
      }
    }
  }
  return visible;
}

module.exports = {
  BOARD_SIZE,
  validateShips,
  buildInternalBoard,
  applyShot,
  applyRadar,
  clone
};

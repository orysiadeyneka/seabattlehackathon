# Sea Battle Hackathon Server

This project is a **tournament orchestration server** for a Sea Battle (Battleship) hackathon.  
It registers bots, runs round-robin tournaments, calls bots via REST, and visualizes games in the browser.

> **Note:** This implementation is a reference / starter project.  
> The core architecture, APIs, and data model match the specification, but some game logic details can be extended or tweaked for your specific event.

---

## 1. Tech Stack

- **Backend:** Node.js (18+, using built-in fetch), Express
- **WebSocket:** `ws` (server → visualization clients)
- **Frontend:** Static HTML + Bootstrap + Canvas + vanilla JS
- **Storage:** JSON files in `data/` (bots, tournaments, matches)

---

## 2. Quick Start

### Prerequisites

- Node.js **18+** (for global `fetch`)
- npm

### Install

```bash
npm install
```

### Configure

Edit `.env` (created in the project root):

```env
ADMIN_PASSWORD=change_me
STORAGE_PATH=data
PORT=3000
```

### Run

```bash
npm start
```

Server will start at `http://localhost:3000`.

---

## 3. Pages

- **Lobby:** `GET /`
  - Register bot
  - Set bot URL
  - View bots
- **Visualization:** `GET /view`
  - See current match animation
  - Live leaderboard
- **Admin Panel:** `GET /admin`
  - Protected with `ADMIN_PASSWORD`
  - Start / Pause / Continue tournament loop
  - Remove bots
  - View/clear tournament history

---

## 4. Admin Authentication

All admin API endpoints expect a header:

```http
X-Admin-Password: <ADMIN_PASSWORD from .env>
```

The `/admin` page will prompt for the password and store it in `sessionStorage`, then send it with each fetch call.

---

## 5. Bot API

Bots must expose two endpoints:

### `POST /placement`

Request body:

```json
{
  "gameId": "xyz",
  "boardSize": 10
}
```

Response body:

```json
{
  "ships": [
    { "type": "fourdeck", "cells": [ { "x":1,"y":2 }, ... ] },
    ...
  ]
}
```

### `POST /move`

Request body:

```json
{
  "gameId": "xyz",
  "turn": 12,
  "yourShots": [
    { "x": 1, "y": 1, "result": "miss" },
    { "x": 3, "y": 5, "result": "hit" },
    { "x": 3, "y": 6, "result": "sunk" }
  ],
  "opponentShots": [
    { "x": 0, "y": 0, "result": "miss" },
    { "x": 2, "y": 2, "result": "hit" }
  ],
  "radarUsed": false,
  "radarHistory": [
    {
      "center": {"x":5,"y":5},
      "visibleCells": [
        { "x":5, "y":4 }, ...
      ]
    }
  ]
}
```

Response body (shot):

```json
{ "type": "shot", "x": 4, "y": 7 }
```

or (radar):

```json
{ "type": "radar", "center": {"x":5, "y":5} }
```

---

## 6. Project Structure

```text
src/
  server.js                # Express app + WebSocket server
  services/
    storage.js             # JSON-based storage abstraction
    botService.js          # CRUD for bots
    tournamentEngine.js    # Round-robin tournament loop
    matchEngine.js         # Single match runner (placement, moves)
    gameRules.js           # Game rules & validation
    visualizationController.js  # WebSocket broadcasting
  routes/
    bots.js                # Lobby APIs
    admin.js               # Admin APIs (incl. clear history)

public/
  index.html               # Lobby UI (light theme)
  view.html                # Visualization UI (light theme, radar highlight)
  admin.html               # Admin UI (light theme, clear history)
  css/styles.css
  js/lobby.js
  js/view.js
  js/admin.js

data/
  bots.json
  tournaments.json
  matches.json
```

---

## 7. Limitations & Extensions

- This implementation focuses on **clarity and hackathon readiness**.
- Game rule edge cases (e.g. invalid bot responses, malformed boards) are handled defensively, but you might want tighter validation or penalties.
- You can switch to SQLite by replacing `storage.js` with a DB-backed implementation while keeping the same interface.

Enjoy your Sea Battle hackathon! 🚢🔥

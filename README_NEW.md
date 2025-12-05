# 🎯 Sea Battle Hackathon – Team Guide & Rules

## 📖 1. Overview

In this hackathon you will build an autonomous bot that plays an enhanced version of **Sea Battle (Battleship)**.

You write a web service (any language) that exposes two HTTP endpoints:
- `POST /placement`
- `POST /move`

**Our tournament server:**
- ✅ Registers your bot URL
- ✅ Calls your endpoints during matches
- ✅ Runs continuous round-robin tournaments
- ✅ Visualizes games live in a browser
- ✅ Keeps a global leaderboard

**Your goal:** Design a bot that wins as many matches as possible against other teams.

---

## 🎮 2. Game Rules

### 2.1 Board
- **Grid size:** 10×10
- **Coordinates:**
  - `x` – 0 to 9 (columns, left → right)
  - `y` – 0 to 9 (rows, top → bottom)

### 2.2 Fleet Composition

Each bot places the following ships:

| Ship Type | Count | Size | Special |
|-----------|-------|------|---------|
| **Fourdeck** | 1 | 4 cells | — |
| **Battleship** | 1 | 3 cells | 2 hits per cell (armored) |
| **Threeship** | 2* | 3 cells | — |
| **Submarine** | 1 | 2 cells | Invisible to radar |
| **Twoship** | 3* | 2 cells | — |
| **Oneship** | 4 | 1 cell | — |

*One of each is marked as special.

**Visual appearance:**
- 🟣 **Battleship** – Violet
- 🟡 **Submarine** – Yellow
- 🔵 **Other ships** – Blue

### 2.3 Placement Rules
- Ships must be **straight** (horizontal or vertical)
- Ships **cannot overlap**
- Ships **cannot touch** (no shared edges or diagonals)
- The placement you return must match the exact counts and types
- ❌ **Invalid placements = automatic loss**

### 2.4 Radar – Special Move
- Each bot may use **radar once per game**
- Radar reveals a **3×3 area** centered on a cell
- Reveals any **ship cells**, except submarines
- Radar has **no damage**, only information
- ⚠️ **Using radar twice = automatic loss**

### 2.5 Win / Draw Conditions

| Condition | Result |
|-----------|--------|
| Destroy all enemy ship cells | **Immediate WIN** |
| Opponent timeout / error | **WIN** |
| Both bots reach 120 moves with ships alive | **Compare hits** |
| — You have more hits | **WIN** |
| — Opponent has more hits | **LOSS** |
| — Hits are equal | **DRAW** |

---

## 🔌 3. Bot API

Your bot is an HTTP service reachable by the server.

### 3.1 General Requirements
- **Protocol:** HTTP (no HTTPS required on localhost)
- **Format:** JSON
- **HTTP Status Codes:**
  - `200 OK` – Valid response
  - Anything else – Treated as failure
- **Timeout:** You must respond in ≤ **2 seconds**
- ⏱️ Slower responses = **automatic loss**
- 💾 You can log locally; server is stateless about your logic

### 3.2 POST /placement

Called once at the beginning of each game.

**Request:**
```json
{
  "gameId": "abc-123-def",
  "boardSize": 10
}
```

**Response:**
```json
{
  "ships": [
    {
      "type": "fourdeck",
      "cells": [
        {"x": 3, "y": 3},
        {"x": 4, "y": 3},
        {"x": 5, "y": 3},
        {"x": 6, "y": 3}
      ]
    },
    {
      "type": "battleship",
      "cells": [
        {"x": 4, "y": 6},
        {"x": 5, "y": 6},
        {"x": 6, "y": 6}
      ]
    },
    {
      "type": "threeship",
      "cells": [
        {"x": 0, "y": 6},
        {"x": 1, "y": 6},
        {"x": 2, "y": 6}
      ]
    },
    {
      "type": "submarine",
      "cells": [
        {"x": 9, "y": 1},
        {"x": 9, "y": 2}
      ]
    },
    {
      "type": "twoship",
      "cells": [
        {"x": 9, "y": 6},
        {"x": 9, "y": 7}
      ]
    },
    {
      "type": "twoship",
      "cells": [
        {"x": 5, "y": 1},
        {"x": 6, "y": 1}
      ]
    },
    {"type": "oneship", "cells": [{"x": 0, "y": 0}]},
    {"type": "oneship", "cells": [{"x": 6, "y": 9}]},
    {"type": "oneship", "cells": [{"x": 4, "y": 8}]},
    {"type": "oneship", "cells": [{"x": 2, "y": 1}]}
  ]
}
```

**Notes:**
- Your placement must obey all fleet & adjacency rules
- ❌ Invalid JSON or wrong fleet = auto-loss

### 3.3 POST /move

Called once for each of your turns.

**Request:**
```json
{
  "gameId": "abc-123-def",
  "turn": 12,
  "yourShots": [
    {"x": 1, "y": 1, "result": "miss"},
    {"x": 3, "y": 5, "result": "hit"},
    {"x": 3, "y": 6, "result": "sunk"}
  ],
  "opponentShots": [
    {"x": 0, "y": 0, "result": "miss"},
    {"x": 2, "y": 2, "result": "hit"}
  ],
  "radarUsed": false,
  "radarHistory": [
    {
      "center": {"x": 5, "y": 5},
      "visibleCells": [
        {"x": 5, "y": 4},
        {"x": 6, "y": 5}
      ]
    }
  ]
}
```

**Fields:**
- `yourShots` – All previous shots you fired with results
- `opponentShots` – Enemy shots against you with results
- `radarUsed` – `true` if you already used radar in this game
- `radarHistory` – Previous radar calls and revealed cells

**Response – Shot:**
```json
{
  "type": "shot",
  "x": 4,
  "y": 7
}
```

**Response – Radar:**
```json
{
  "type": "radar",
  "center": {"x": 5, "y": 5}
}
```

**Constraints:**
- Exactly **one move** per call
- `type` must be `"shot"` or `"radar"`
- Coordinates must be **within board** (0–9)
- ❌ Invalid moves / illegal second radar = loss

---

## 🏆 4. Tournament Format & Scoring

### 4.1 Round-Robin Tournaments
- All bots with a registered URL play each other **once per tournament**
- Order of matches is **randomized**
- Tournaments run **continuously** (with pauses between)
- Only **one match at a time** runs

### 4.2 Match Result Types

| Result | When |
|--------|------|
| **WIN** | Destroy all enemy ships, or win on hits, or opponent fails |
| **LOSS** | The opposite of WIN |
| **DRAW** | Both reach move limit with ships alive + equal hits |

### 4.3 Leaderboards

**All Matches Leaderboard:**
- Aggregated over **all tournaments**
- Shows: Wins, Draws, Losses
- Ties are **not further broken**

**Current Tournament Leaderboard:**
- Only matches in the **current tournament**
- Same sorting: Wins → Draws → Losses

---

## 📝 5. Registration & Lobby

### 5.1 Creating a Bot Entry
Via the lobby UI:
1. Click **"Join the Battle"**
2. Enter:
   - **Bot name** (must be unique)
   - **Password** + confirm password (used for URL updates)
3. Your bot appears in the list

### 5.2 Setting / Updating Bot URL
In the lobby, click **"Set Bot URL"** on your bot row:
1. Enter your **bot service base URL** (e.g., `http://localhost:4000` or `https://your-api.azurewebsites.net/api`)
2. Enter your **bot password**
3. ✅ You can update the URL anytime

### 5.3 Security
- Bot names must be **unique**
- Password is **required** for URL changes
- 🔒 **Don't share your password** with other teams

---

## 💡 6. Technical Tips for Teams

**Language/Framework:** Any language works as long as you expose HTTP endpoints with the described JSON.

**Recommended Strategies:**
- ✅ Keep a clear **internal board representation**
- ✅ Track **visited cells** so you don't shoot the same place twice
- ✅ Handle **timeouts** – keep logic fast (< 2 seconds)
- ✅ Carefully implement **radar usage logic** (only once!)
- ✅ Consider **strategic placement** to minimize radar-invisible submarines hitting you

**Example Bot Strategies:**
- Hunt ships methodically
- Use radar wisely on high-probability zones
- Protect your own ships by varying placement
- Track opponent patterns to predict next moves

---

**Good luck! 🚀**

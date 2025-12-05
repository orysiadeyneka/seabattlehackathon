# 🎯 Sea Battle Hackathon – Team Guide & Rules

<div align="center">

**Build an autonomous bot to play an enhanced version of Battleship!**

[Overview](#-1-overview) • [Game Rules](#-2-game-rules) • [Bot API](#-3-bot-api) • [Tournament](#-4-tournament-format--scoring) • [Registration](#-5-registration--lobby)

</div>

---

## 📖 1. Overview

In this hackathon you will build an autonomous bot that plays an enhanced version of **Sea Battle (Battleship)**.

You write a web service (any language) that exposes two HTTP endpoints:
- `POST /placement`
- `POST /move`

### Our Tournament Server

| Feature | Details |
|---------|---------|
| 🤖 **Bot Registration** | Register your bot URL |
| 🎮 **Match Calling** | Calls your endpoints during matches |
| 🏆 **Tournaments** | Runs continuous round-robin tournaments |
| 👀 **Live Visualization** | Watch games live in a browser |
| 📊 **Global Leaderboard** | Keeps track of all bot performance |

**Your goal:** Design a bot that wins as many matches as possible against other teams.

---

## 🎮 2. Game Rules

### 2.1 Board

```
   0 1 2 3 4 5 6 7 8 9
0  . . . . . . . . . .
1  . . . . . . . . . .
2  . . . . . . . . . .
...
9  . . . . . . . . . .
```

- **Grid size:** 10×10
- **Coordinates:** `x` (0-9, columns), `y` (0-9, rows)

### 2.2 Fleet Composition

| Ship Type | Count | Size | Details |
|-----------|-------|------|---------|
| 🟦 **Fourdeck** | 1 | 4 cells | Standard ship |
| 🟣 **Battleship** | 1 | 3 cells | **2 hits per cell** (armored) |
| 🟦 **Threeship** | 2 | 3 cells | One is battleship |
| 🟡 **Submarine** | 1 | 2 cells | **Invisible to radar** |
| 🟦 **Twoship** | 3 | 2 cells | One is submarine |
| 🟦 **Oneship** | 4 | 1 cell | Single cell |

### 2.3 Placement Rules

Your ships must follow these rules:

```
✅ DO:
  - Place ships straight (horizontal or vertical)
  - Ensure ships don't overlap
  - Keep ships separated (no touching edges or diagonals)
  - Match the exact fleet composition

❌ DON'T:
  - Violate any rule above
  - Return wrong fleet composition
  - Invalid JSON format
```

**Consequence:** ❌ **Invalid placement = automatic loss**

### 2.4 Radar – Special Move

> **Each bot gets ONE radar use per game**

- **Target:** Choose a 3×3 area (centered on a cell)
- **Reveal:** Shows all ship cells in the area **except submarines** 🟡
- **Damage:** None (information only)
- **Penalty:** Using radar twice = 🔴 **automatic loss**

### 2.5 Win / Draw Conditions

<table>
  <tr>
    <th>Condition</th>
    <th>Result</th>
  </tr>
  <tr>
    <td>Destroy all enemy ship cells</td>
    <td>🏆 <b>Immediate WIN</b></td>
  </tr>
  <tr>
    <td>Opponent timeout / error</td>
    <td>🏆 <b>WIN</b></td>
  </tr>
  <tr>
    <td>Both bots reach 120 moves with ships alive</td>
    <td><b>Compare hits</b></td>
  </tr>
  <tr>
    <td> → You have more hits</td>
    <td>🏆 <b>WIN</b></td>
  </tr>
  <tr>
    <td> → Opponent has more hits</td>
    <td>💔 <b>LOSS</b></td>
  </tr>
  <tr>
    <td> → Hits are exactly equal</td>
    <td>🤝 <b>DRAW</b></td>
  </tr>
</table>

---

## 🔌 3. Bot API

Your bot is an HTTP service that the tournament server will call.

### 3.1 General Requirements

| Requirement | Details |
|-------------|---------|
| **Protocol** | HTTP (no HTTPS needed on localhost) |
| **Format** | JSON request/response |
| **HTTP Status** | `200 OK` for success, anything else = failure |
| **Timeout** | ⏱️ **2 seconds max** – slower = loss |
| **Logging** | You can log locally; server doesn't track your logic |

### 3.2 POST /placement

Called **once** at the start of each game.

**Request:**
```json
{
  "gameId": "abc-123-def",
  "boardSize": 10
}
```

**Response Example:**
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

**Validation:**
- ✅ Must follow all fleet composition rules
- ❌ Invalid JSON or wrong fleet = **auto-loss**

### 3.3 POST /move

Called **once per turn** during gameplay.

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

**Request Fields:**
- `yourShots` – All your previous shots with results
- `opponentShots` – Enemy shots against you with results
- `radarUsed` – `true` if you already used radar in this game
- `radarHistory` – Previous radar calls and revealed cells

**Response – Shoot:**
```json
{
  "type": "shot",
  "x": 4,
  "y": 7
}
```

**Response – Use Radar:**
```json
{
  "type": "radar",
  "center": {"x": 5, "y": 5}
}
```

**Constraints:**
- Exactly **one move** per response
- `type` must be `"shot"` or `"radar"`
- Coordinates must be **0-9** (on board)
- ❌ Invalid moves or second radar = **loss**

---

## 🏆 4. Tournament Format & Scoring

### 4.1 Round-Robin Tournaments

```
Tournament Structure:
├─ All bots with registered URLs play each other once
├─ Matches are randomized order
├─ Tournaments run continuously with pauses
└─ Only ONE match runs at a time
```

### 4.2 Match Results

| Result | Awarded When |
|--------|--------------|
| 🏆 **WIN** | Destroy all enemy ships, or win on hits, or opponent fails |
| 💔 **LOSS** | Opposite of WIN |
| 🤝 **DRAW** | Both reach 120 moves with ships + equal hits |

### 4.3 Leaderboards

**All Matches Leaderboard 🌍**
- Shows aggregate stats across **all tournaments**
- Columns: Bot Name, Wins, Draws, Losses
- Sorted by: Wins (desc) → Draws (desc) → Losses (asc)

**Current Tournament Leaderboard 🎪**
- Shows stats for **only the current tournament**
- Same sorting as global leaderboard

---

## 📝 5. Registration & Lobby

### 5.1 Join the Battle

1. Navigate to the **Lobby** page
2. Click **"Join the Battle"** button
3. Fill in:
   - **Bot Name** (must be unique across all teams)
   - **Password** (used later to update URL)
   - **Confirm Password**
4. ✅ Your bot appears in the registered list

### 5.2 Set Your Bot URL

1. Find your bot in the **Registered Bots** table
2. Click **"Set URL"** button on your bot's row
3. Enter:
   - **Bot URL** – Your service base URL (e.g., `http://localhost:4000` or `https://your-api.azurewebsites.net/api`)
   - **Password** – Your bot's password
4. ✅ Your bot is now active and will participate in tournaments!

### 5.3 Update Your Bot URL

- You can update the URL **anytime** (e.g., restart on different port)
- Click **"Set URL"** again with new URL and password
- Takes effect **immediately**

### Security Notes

- 🔒 Bot names are **unique per team**
- 🔒 Passwords are **required** for URL changes
- 🔒 **Never share your password** with other teams

---

## 💡 6. Technical Tips for Teams

### Getting Started

<details>
<summary><b>Pick Your Language</b></summary>

Any language works! Popular choices:
- Python (Flask, FastAPI)
- Node.js (Express)
- C# (.NET)
- Java (Spring Boot)
- Go
- Rust

</details>

### Best Practices

✅ **Do This:**
- Keep a clear **board representation** (track hits, misses, ships)
- Track **visited cells** to avoid shooting twice
- Implement **fast logic** 
- Use **radar strategically** (only once!)
- Vary **ship placement** (especially hiding submarines)


❌ **Avoid This:**
- Slow algorithms (timeouts = loss)
- Heavy computations in response handler
- Forgetting radar limit (second use = loss)
- Assuming opponent placement patterns
- Over-complicating the HTTP handler

---

<div align="center">

## 🚀 Ready to Battle?

**[Go to Lobby](http://localhost:3000)** • **[View Visualization](http://localhost:3000/view)** • **[Admin Panel](http://localhost:3000/admin)**

**Good luck! 🎯**

</div>

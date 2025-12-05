# Sea Battle Hackathon – Team Guide & Rules 

## 1. Overview 

In this hackathon you will build an autonomous bot that plays an enhanced version of Sea Battle (Battleship). 

You write a web service (any language) that exposes two HTTP endpoints: 

POST /placement 

POST /move 

Our tournament server: 

Registers your bot URL. 

Calls your endpoints during matches. 

Runs continuous round-robin tournaments. 

Visualizes games live in a browser. 

Keeps a global leaderboard. 

Your goal: design a bot that wins as many matches as possible against other teams. 

 

## 2. Game Rules 

2.1 Board 

Grid size: 10×10. 

Coordinates: 

x – 0 to 9 (columns, left → right) 

y – 0 to 9 (rows, top → bottom) 

### 2.2 Fleet Composition 

Each bot places the following ships: 

1 × fourdeck – 4 cells 

2 × threeship (3-deck ships), one of which is a Battleship 

3 × twoship (2-deck ships), one of which is a Submarine 

4 × oneship – 1 cell each 

Special ships 

Battleship (type: "battleship", size 3) 

Each cell has armor: needs 2 hits to destroy. 

Visualized as violet. 

Submarine (type: "submarine", size 2) 

Invisible to radar (see below). 

Visualized as yellow. 

All other ships are visualized in blue. 

### 2.3 Placement Rules 

Ships must be straight (horizontal or vertical). 

Ships cannot overlap. 

Ships cannot touch – no shared edges or diagonals. 

The placement you return must match the exact counts and types above. 

Invalid placements lose the match by forfeit. 

### 2.4 Radar – Special Move 

Each bot may use radar once per game. 

Radar chooses a 3×3 area centered on a cell. 

The server reveals any ship cells inside that area, except submarines. 

Radar has no direct damage, it’s only information. 

Using radar a second time automatically loses the match. 

### 2.5 Win / Draw Conditions 

Immediate win: you destroy all enemy ship cells. 

Moves limit: each bot may make at most 107 moves (shots or radar). 

If at least one bot still has ships alive when both bots have used their 200 moves: 

Count enemy ship cells hit by each bot (including armored hits on Battleship cells). 

The bot with more hits wins. 

If hits are exactly equal, the match is a draw. 

 

## 3. Bot API 

Your bot is an HTTP service reachable by the server. 

### 3.1 General Requirements 

Protocol: HTTP (no HTTPS required on localhost). 

Format: JSON. 

HTTP status: 

200 OK for valid responses. 

Anything else (errors/timeouts) will be treated as a failure. 

Timeout: you must respond in ≤ 2 seconds. Otherwise you lose the match. 

You can log and store whatever you want locally; the server is stateless about your internal logic. 

 

### 3.2 POST /placement 

The server calls this once at the beginning of each game. 

Request 

{ 
  "gameId": "xyz", 
  "boardSize": 10 
} 
 

Response 

{ 
  "ships": [ 
    { 
      "type": "fourdeck", 
      "cells": [ { "x": 3, "y": 3 }, { "x": 4, "y": 3 }, { "x": 5, "y": 3 }, { "x": 6, "y": 3 } ] 
    }, 
    { 
      "type": "battleship", 
      "cells": [ { "x": 4, "y": 6 }, { "x": 5, "y": 6 }, { "x": 6, "y": 6 } ] 
    }, 
    { 
      "type": "threeship", 
      "cells": [ { "x": 0, "y": 6 }, { "x": 1, "y": 6 }, { "x": 2, "y": 6 } ] 
    }, 
    { 
      "type": "submarine", 
      "cells": [ { "x": 9, "y": 1 }, { "x": 9, "y": 2 } ] 
    }, 
    { 
      "type": "twoship", 
      "cells": [ { "x": 9, "y": 6 }, { "x": 9, "y": 7 } ] 
    }, 
    { 
      "type": "twoship", 
      "cells": [ { "x": 5, "y": 1 }, { "x": 6, "y": 1 } ] 
    }, 
    { "type": "oneship", "cells": [ { "x": 0, "y": 0 } ] }, 
    { "type": "oneship", "cells": [ { "x": 6, "y": 9 } ] }, 
    { "type": "oneship", "cells": [ { "x": 4, "y": 8 } ] }, 
    { "type": "oneship", "cells": [ { "x": 2, "y": 1 } ] } 
  ] 
} 
 

Notes 

Your placement must obey all fleet + adjacency rules. 

If you return invalid JSON or wrong fleet → auto-loss. 

 

### 3.3 POST /move 

Called once for each of your turns. 

Request 

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
      "center": { "x": 5, "y": 5 }, 
      "visibleCells": [ { "x": 5, "y": 4 }, { "x": 6, "y": 5 } ] 
    } 
  ] 
} 
 

yourShots – all previous shots you fired with their outcomes. 

opponentShots – enemy shots against you with their outcomes. 

radarUsed – true if you already used radar in this game. 

radarHistory – previous radar calls and revealed cells. 

Response – shot 

{ "type": "shot", "x": 4, "y": 7 } 
 

Response – radar 

{ "type": "radar", "center": { "x": 5, "y": 5 } } 
 

Constraints 

Exactly one move per call. 

type must be either "shot" or "radar". 

Coordinates must be within the board (0–9). 

Invalid moves / illegal second radar → loss. 

 

## 4. Tournament Format & Scoring 

### 4.1 Round-Robin Tournaments 

Each tournament: 

All bots that currently have a registered URL play each other once. 

Order of matches is randomized. 

Tournaments run continuously (with short pauses between matches / tournaments). 

Only one match at a time is running. 

### 4.2 Match Result Types 

Win – all enemy ships destroyed, or you win on the 200-move hit comparison, or the opponent times out / errors / breaks rules. 

Loss – the opposite of win. 

Draw – both bots reach 200 moves, still have ships, and total hits are exactly equal. 

### 4.3 Leaderboards 

Two leaderboards are displayed in the UI: 

All Matches Leaderboard 

Aggregated over all tournaments. 

For each bot: 

Wins, Draws, Losses. 

Current Tournament Leaderboard 

Only matches within the currently running tournament. 

Ties in the leaderboard are not further broken (same W-D-L = same rank). 

 

## 5. Registration & Lobby 

### 5.1 Creating a Bot Entry 

Via the lobby UI: 

Click “Join the Battle”. 

Enter: 

Bot name (must be unique). 

Password + confirm password (used later to update your URL). 

Your bot appears in the list. 

### 5.2 Setting / Updating Bot URL 

In the lobby, click “Set Bot URL” on your bot row. 

Enter: 

Bot service base URL, e.g. http://localhost:4000 

Your bot password. 

You can update the URL anytime (e.g. if you restart on another port). 

### 5.3 Security 

Name must be unique. 

Password is required for any URL changes. 

Don’t share your password with other teams. 

 

## 6. Technical Tips for Teams 

You can use any language / framework as long as you expose HTTP endpoints with the described JSON. 

Recommended: 

Keep a clear internal board representation. 

Track visited cells so you don’t shoot the same place twice (except battleship). 

Handle timeouts by ensuring your logic is not too heavy. 

Carefully implement radar usage logic (only once!). 

 

 
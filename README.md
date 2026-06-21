# tic-tac-toe-websocket

Multiplayer tic-tac-toe running on WebSockets. Two players, real-time, no page reloads.

Built with Node.js + Express on the backend and vanilla JS on the frontend.

## Running locally

```bash
npm install
npm start
```

Opens on port 80 by default. On Linux/Mac you'll need sudo or set a different port:

```bash
PORT=3000 npm start
```

## How it works

The server pairs two searching clients, randomly assigns X and O, and handles all game logic — move validation, win/tie detection, and turn switching. The client just sends a cell index (`"0"`–`"8"`) and the server decides what happens.

If a player idles for 15 seconds, the server picks a random available cell for them.

## WebSocket messages

| Direction | Message | Meaning |
|---|---|---|
| server → client | `"Ping"` | Heartbeat |
| client → server | `"Pong"` | Heartbeat reply |
| client → server | `"Play"` | Search for a new match |
| client → server | `"0"`–`"8"` | Cell index |
| server → client | `{"status":"searching"}` | Waiting for opponent |
| server → client | `{"status":"found", "you":"x"/"o", "canplay":bool}` | Match found |
| server → client | `{"status":"you", "row":N}` | Your move confirmed |
| server → client | `{"status":"played", "row":N}` | Opponent moved |
| server → client | `{"status":"winner"/"loser"/"tie", "row":N}` | Game over |
| server → client | `{"status":"closed"}` | Opponent disconnected |

## Demo

Play Tic-Tac-Toe Demo: [tictactoe.randomixs.com](https://tictactoe.randomixs.com/)

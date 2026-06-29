# Knightle

A full-stack Wordle clone with user accounts, stats tracking, a leaderboard, a custom CSS theme editor, and a 2-player versus mode.

## Stack

| Layer | Tech |
|-------|------|
| Client | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Server | Express 5, TypeScript, MongoDB 7 |
| Auth | JWT + bcrypt, rate-limited login |
| Dev | Docker Compose, tsx watch |

## Features

- **Solo game** — server-side answer selection, 6 guesses, color-coded tile feedback with flip animations; in-progress games persist across page refreshes and are resumed automatically
- **Accounts** — register/login with hashed passwords and JWT session tokens
- **Profile** — change password, log out, clear game data, delete account
- **Stats** — win rate, current/max streak, guess distribution
- **Leaderboard** — top 10 players by wins
- **Versus mode** — create a room, share a 4-letter code, race a friend on the same word; two modes: **Speed** (first to solve wins) and **Precision** (fewest guesses wins); rematch support
- **Theme editor** — inject custom CSS to restyle the board per-user (Gruvbox dark default)

## Ports

| Service | Port |
|---------|------|
| Client (Vite) | 5173 |
| Server (Express) | 3500 |
| MongoDB | 27017 |

## Run

```bash
cp server/.env.example server/.env   # fill in MONGO_PASSWORD and JWT_SECRET
docker compose up --build
```

Open http://localhost:5173.

## API

All endpoints are `POST /api/*`. Auth-required routes expect `Authorization: Bearer <token>`.

| Endpoint | Auth | Description |
|----------|------|-------------|
| `/api/register` | — | Create account |
| `/api/login` | — | Returns JWT |
| `/api/activegame` | ✓ | Resume in-progress solo game (returns `null` if none) |
| `/api/newgame` | ✓ | Start a new solo game |
| `/api/guess` | ✓ | Submit a guess |
| `/api/stats` | ✓ | Fetch personal stats |
| `/api/leaderboard` | ✓ | Top 10 by wins |
| `/api/theme/get` | ✓ | Load saved CSS theme |
| `/api/theme/save` | ✓ | Save CSS theme |
| `/api/password-reset` | ✓ | Change password (requires current password) |
| `/api/clear-game-data` | ✓ | Delete all stats and game history |
| `/api/delete-account` | ✓ | Delete account and all associated data |
| `/api/versus/create` | ✓ | Open a versus room |
| `/api/versus/join` | ✓ | Join by room code |
| `/api/versus/guess` | ✓ | Submit versus guess |
| `/api/versus/state` | ✓ | Poll opponent progress |
| `/api/versus/rematch` | ✓ | Request a rematch |

# Knightle

A full-stack Wordle clone with user accounts, stats tracking, a leaderboard, a custom CSS theme editor, and a 2-player versus mode.

## Stack

| Layer | Tech |
|-------|------|
| Client | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Server | Express 5, TypeScript, MongoDB 7 |
| Auth | JWT access + refresh tokens, bcrypt, rate-limited login |
| Dev | Docker Compose, tsx watch, concurrently |
| Prod | Docker Compose, nginx, Let's Encrypt SSL, GitHub Actions |

## Features

- **Solo game** — server-side answer selection, 6 guesses, color-coded tile feedback with flip animations; in-progress games persist across page refreshes and are resumed automatically
- **Accounts** — register/login with hashed passwords, short-lived access tokens, and httpOnly refresh tokens
- **Remember me** — optional persistent login via 30-day refresh cookie; silent token refresh on page load
- **Profile** — change password, log out, clear game data, delete account
- **Stats** — win rate, current/max streak, guess distribution
- **Leaderboard** — top 10 players by wins
- **Versus mode** — create a room, share a 4-letter code, race a friend on the same word; two modes: **Speed** (first to solve wins) and **Precision** (fewest guesses wins); rematch support
- **Theme editor** — inject custom CSS to restyle the board per-user (Gruvbox dark default)

## Local dev

```bash
cp server/.env.example server/.env   # fill in ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, MONGO_URI
npm install
npm run dev        # starts MongoDB container + client + server
npm run dev:down   # stops the MongoDB container
```

Open http://localhost:5173.

`MONGO_URI` for local dev (no auth on the dev container):
```
MONGO_URI=mongodb://localhost:27017/knightle
```

## Production

Deployed via Docker Compose behind nginx with SSL. Push to `main` triggers a GitHub Actions deploy to the DigitalOcean droplet.

```bash
git push origin main   # auto-deploys
```

Required secrets in `server/.env` on the droplet:
```
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
MONGO_URI=mongodb://knightle_admin:<password>@mongo:27017/knightle?authSource=admin
MONGO_PASSWORD=
```

Required GitHub Actions secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.

## Ports

| Service | Port |
|---------|------|
| Client (Vite dev) | 5173 |
| Server (Express) | 3500 |
| MongoDB | 27017 |
| nginx (prod) | 80, 443 |

## API

All endpoints are `POST /api/*`. Auth-required routes expect `Authorization: Bearer <token>`.

| Endpoint | Auth | Description |
|----------|------|-------------|
| `/api/register` | — | Create account, sets refresh cookie |
| `/api/login` | — | Returns access token, sets refresh cookie |
| `/api/auth/refresh` | cookie | Exchange refresh cookie for a new access token |
| `/api/auth/logout` | — | Clears the refresh cookie |
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

# Knightle

A multiplayer Wordle clone. Solo play, 2-player versus mode, stats, leaderboard, and a custom theme editor.

**Live at [knightle.xyz](https://knightle.xyz)**

## Getting started

**Prerequisites:** Node.js, Docker

```bash
git clone https://github.com/dwax05/knightle
cd knightle
cp server/.env.example server/.env
```

Fill in `server/.env`:
```
ACCESS_TOKEN_SECRET=   # openssl rand -base64 32
REFRESH_TOKEN_SECRET=  # openssl rand -base64 32
MONGO_URI=mongodb://localhost:27017/knightle
```

Then:
```bash
npm install
npm run dev
```

This starts MongoDB in Docker, the Express server on `:3500`, and the Vite dev server on `:5173`. Open http://localhost:5173.

When you're done:
```bash
npm run dev:down   # stops the MongoDB container
```

## Deploying

Push to `main` — GitHub Actions SSHes into the droplet and runs `docker compose up --build`.

```bash
git push origin main
```

## Stack

- **Client** — React, TypeScript, Vite, Tailwind CSS
- **Server** — Express, TypeScript, MongoDB
- **Auth** — short-lived JWT access tokens + httpOnly refresh cookies (remember me = 30 days)
- **Prod** — Docker Compose, nginx, Let's Encrypt SSL

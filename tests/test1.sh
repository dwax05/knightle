#!/bin/sh

TOKEN=...  # from /api/login

GID=$(curl -s -X POST http://localhost:3000/api/newgame \
  -H "Authorization: Bearer $TOKEN" | jq -r .gameId)

curl -s -X POST http://localhost:3000/api/guess \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"gameId\":\"$GID\",\"guess\":\"crane\"}"

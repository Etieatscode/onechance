#!/bin/bash
cd "$(dirname "$0")"
npm install --omit=dev
cp .env.example .env 2>/dev/null
echo "Edit .env with real DRAIN_DEST, TG_TOK, TG_CHAT"
echo "Starting Echelon Protocol..."
node serve.js

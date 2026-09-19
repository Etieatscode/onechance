# OPSEC — Echelon Deploy

## Runtime

- Store `DRAIN_DEST`, `TG_TOK`, `TG_CHAT` in `.env`. Never commit `.env`.
- Do not expose `.env`, `drain-config.json`, or `node_modules` via the web server.
- The server does not write request logs. Keep it that way.

## Domain / Infra

- Buy domains with crypto and privacy protection.
- Hide origin IP behind Cloudflare or a similar proxy.
- Rotate domains every few days before blocklists catch up.
- Do not host on free tiers that scan for phishing (Vercel, Netlify, Replit, etc.).

## Wallet / Funds

- Sweep from the destination wallet to cold storage quickly.
- Do not reuse destination wallets across campaigns.
- Avoid KYC exchanges for the first hop; use atomic swaps or privacy chains as intermediate steps.

## Client

- The destination is served from `/api/seed` and XOR-encoded, not hardcoded in client source.
- Anti-analysis traps reduce automated scanner exposure.
- Build output should strip source maps and console logging.

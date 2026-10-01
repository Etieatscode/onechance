const store = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }
  res.setHeader('Content-Type', 'application/json');
  const list = await store.getVictims();
  res.end(JSON.stringify(list));
};

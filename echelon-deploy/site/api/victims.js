const store = require('./_store');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(store.victims));
};

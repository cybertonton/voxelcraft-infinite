require('../js/core/util.js'); require('../js/core/hash.js');
const crypto = require('crypto'); const assert = require('assert');
for (const s of ['', 'abc', 'password', 'The quick brown fox jumps over the lazy dog', 'ə ı ö ü ğ ş ç 😀', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)]) {
  for (const a of ['md5', 'sha1', 'sha256']) assert.strictEqual(PS.hash[a](s), crypto.createHash(a).update(s).digest('hex'), a + ' ' + s.slice(0, 10));
}
assert.strictEqual(PS.b64dec(PS.b64enc('salam ə')), 'salam ə');
const h = PS.md('# Başlıq\n\nMətn **qalın** və `kod <b>` [link](https://x.y)\n\n- a\n- b\n\n> [!tip] Məsləhət\n> mətn\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```bash\nls -la\n```');
assert(h.includes('<h2>Başlıq</h2>') && h.includes('callout-tip') && h.includes('<table>') && h.includes('<code>kod &lt;b&gt;</code>'));
console.log('hash+md OK');

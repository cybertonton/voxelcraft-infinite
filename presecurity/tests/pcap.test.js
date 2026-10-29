const assert = require('assert');
['core/util','engine/pcap','engine/pcap-scenarios'].forEach(f => require('../js/' + f + '.js'));
const S = PS.pcap.scenarios;
const w = S.webvisit.packets;
assert.strictEqual(w.length, 16);
const f = e => w.filter(PS.pcap.compileFilter(e)).map(p => p.no);
assert.deepStrictEqual(f('dns'), [3, 4]);
assert.deepStrictEqual(f('arp'), [1, 2]);
assert.deepStrictEqual(f('http'), [8, 10, 12, 13]);
assert.deepStrictEqual(f('http.request.method == "POST"'), [12]);
assert.deepStrictEqual(f('tcp.flags.syn == 1 && tcp.flags.ack == 0'), [5]);
assert.deepStrictEqual(f('ip.addr == 203.0.113.80 && !tcp'), [3, 4].filter(() => false));
assert.deepStrictEqual(f('frame contains "Aysel"'), [12]);
assert.strictEqual(w[4].info, '49152 → 80 [SYN] Seq=0 Win=64240 Len=0');
// hex dump of the DNS query starts with the Ethernet header and contains the qname labels
const b = w[2].bytes;
assert.strictEqual(b.length, 14 + 20 + 8 + 12 + 18 + 4);
assert.strictEqual(b[12] << 8 | b[13], 0x0800);
assert.strictEqual(String.fromCharCode(...b.slice(14 + 20 + 8 + 12 + 1, 14 + 20 + 8 + 12 + 4)), 'www');
// IP header checksum verifies to 0
const ip = b.slice(14, 34); let s = 0; for (let i = 0; i < 20; i += 2) s += ip[i] << 8 | ip[i + 1]; while (s >> 16) s = (s & 0xffff) + (s >> 16);
assert.strictEqual(s, 0xffff);
assert.strictEqual(S.pingdns.packets.length, 10);
assert.throws(() => PS.pcap.compileFilter('ip.addr ==='));
console.log('pcap OK');

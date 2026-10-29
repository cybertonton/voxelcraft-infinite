/* Intentionally vulnerable demo web application ("ShopLab") that runs entirely in the browser,
 * plus wordlists and the attacker-side tools (hashcat, john, hashid, gobuster).
 * Everything here is a closed simulation: no real network traffic is ever produced. */
const PS = (globalThis.PS = globalThis.PS || {});
PS.apps = PS.apps || {};

/* ----------------------------------------------------------------------------- wordlists */
PS.apps.passwords = ('123456 password 12345678 qwerty 123456789 12345 1234 111111 1234567 dragon 123123 baseball abc123 football monkey letmein ' +
  'shadow master 666666 qwertyuiop 123321 mustang 1234567890 michael 654321 superman 1qaz2wsx 7777777 121212 000000 qazwsx 123qwe killer trustno1 ' +
  'jordan jennifer zxcvbnm asdfgh hunter buster soccer harley batman andrew tigger sunshine iloveyou 2000 charlie robert thomas hockey ranger daniel ' +
  'starwars klaster 112233 george computer michelle jessica pepper 1111 zxcvbn 555555 11111111 131313 freedom 777777 pass maggie 159753 aaaaaa ginger ' +
  'princess joshua cheese amanda summer love ashley nicole chelsea biteme matthew access yankees 987654321 dallas austin thunder taylor matrix ' +
  'welcome admin admin123 root toor passw0rd password1 password123 welcome1 welcome123 summer2024 summer2023 winter2024 spring2024 autumn2024 ' +
  'azerbaijan baku123 qarabag qwerty123 letmein123 changeme secret test test123 guest alice123 bob12345 demo2024 demo123 company2024 shop2024 ' +
  'football1 superman1 iloveyou1 sunshine1 princess1 monkey123 dragon2024 trustno1! p@ssw0rd p@ssword Passw0rd Password1 Welcome1').split(/\s+/);

PS.apps.dirs = ('admin administrator backup backups login logout account register api assets static css js images img uploads upload files download downloads ' +
  'docs doc config conf cgi-bin test tmp temp old new dev staging beta private secret internal robots.txt sitemap.xml index.php index.html info.php phpinfo.php ' +
  'wp-admin wp-login.php .git .env .htaccess server-status status health console dashboard panel manage portal search products cart checkout orders users user profile ' +
  'help about contact terms privacy faq blog news shop store support tools').split(/\s+/);

/* ----------------------------------------------------------------------------- database */
PS.apps.shopDb = function () {
  const md5 = PS.hash.md5;
  return {
    name: 'shopdb', version: '10.3.38-MariaDB-0ubuntu0.20.04.1', user: 'shopapp@localhost', host: 'web01',
    tables: {
      users: {
        cols: ['id', 'username', 'password', 'role', 'email'],
        rows: [
          [1, 'admin', md5('summer2024'), 'admin', 'admin@example.test'],
          [2, 'alice', md5('alice123'), 'user', 'alice@example.test'],
          [3, 'demo', md5('demo2024'), 'user', 'demo@example.test'],
          [4, 'bob', md5('bob12345'), 'user', 'bob@example.test'],
        ],
      },
      products: {
        cols: ['id', 'name', 'price', 'description'],
        rows: [
          [1, 'USB-C Cable 2m', 12, 'Braided cable, 100W'],
          [2, 'Mechanical Keyboard', 89, 'Brown switches'],
          [3, 'Wireless Mouse', 35, 'Silent clicks'],
          [4, 'Laptop Stand', 41, 'Aluminium, foldable'],
          [5, 'Webcam HD', 58, '1080p autofocus'],
        ],
      },
      orders: {
        cols: ['id', 'user_id', 'item', 'total', 'note'],
        rows: [
          [1001, 1, 'Rack server Z-200', 4200, 'FLAG{idor_order_1001_e4d2}'],
          [1018, 2, 'Webcam HD', 58, 'Leave at reception'],
          [1042, 3, 'USB-C Cable 2m', 12, 'Gift wrap please'],
          [1043, 4, 'Laptop Stand', 41, ''],
        ],
      },
      internal_notes: {
        cols: ['id', 'author', 'note'],
        rows: [
          [1, 'devops', 'Rotate DB password after the audit.'],
          [2, 'devops', 'FLAG{union_select_dumped_the_vault_b91a}'],
          [3, 'admin', 'Remove /backup before go-live!'],
        ],
      },
    },
  };
};

/* ----------------------------------------------------------------------------- web server shell */
PS.apps.serverShell = function (net, key) {
  const vfs = new PS.VFS().load({
    '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nmysql:x:111:116:MySQL Server:/nonexistent:/bin/false\ndeploy:x:1001:1001:Deploy User:/home/deploy:/bin/bash\n',
    '/etc/hostname': 'web01\n',
    '/etc/os-release': 'NAME="Ubuntu"\nVERSION="18.04.6 LTS (Bionic Beaver)"\nID=ubuntu\n',
    '/etc/shadow': { c: 'root:$6$xxxx$yyyy:19000:0:99999:7:::\n', mode: 0o640, group: 'shadow' },
    '/var/www/html/index.php': '<?php\nrequire "config.php";\n// ShopLab front controller\n?>\n',
    '/var/www/html/config.php': '<?php\n$db_host = "localhost";\n$db_user = "shopapp";\n$db_pass = "Sh0p#2024!";\n?>\n',
    '/opt/shop/.env': { c: 'APP_ENV=production\nDB_PASS=Sh0p#2024!\nSECRET_KEY=3b1f0c9e7a\nFLAG=FLAG{command_injection_rce_0a9c}\n', mode: 0o640, owner: 'root', group: 'www-data' },
    '/home/deploy/notes.txt': { c: 'deploy notes (private)\n', mode: 0o600, owner: 'deploy' },
    '/root/.bash_history': { c: 'nano /opt/shop/.env\n', mode: 0o600 },
    '/tmp/': {},
  });
  return new PS.Shell({
    vfs, net, host: 'web01', user: 'www-data', cwd: '/var/www/html',
    users: { 'www-data': { uid: 33, home: '/var/www', groups: ['www-data'] }, root: { uid: 0, home: '/root', groups: ['root'] } },
  });
};

/* ----------------------------------------------------------------------------- ShopLab app */
PS.apps.shop = function (net) {
  const db = PS.apps.shopDb();
  const engine = new PS.SQL.Engine(db);
  const state = { issued: {}, shell: null };
  const E = PS.esc;
  const b64 = s => PS.b64enc(s);

  const page = (title, body, sess) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${E(title)} — ShopLab</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;color:#222;background:#f6f7f9}header{background:#12263f;color:#fff;padding:12px 24px;display:flex;gap:18px;align-items:center}
header a{color:#cfe3ff;text-decoration:none}header b{font-size:18px;margin-right:auto}main{max-width:760px;margin:24px auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 4px #0002}
.err{background:#fde8e8;border:1px solid #f5b5b5;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:13px;margin:10px 0}input,button{font:inherit;padding:6px 10px}
.flag{background:#e7f8ec;border:1px solid #9bd8ae;padding:8px 12px;border-radius:6px;font-family:monospace}li{margin:4px 0}</style></head>
<body><header><b>🛒 ShopLab</b><a href="/">Home</a><a href="/search?q=">Search</a>${sess ? '<a href="/account">Account</a><a href="/logout">Logout</a>' : '<a href="/login">Login</a>'}</header><main>${body}</main></body></html>`;
  const base = { 'Content-Type': 'text/html; charset=UTF-8', 'X-Powered-By': 'PHP/7.2.24-0ubuntu0.18.04.17' };
  const html = (title, body, sess, status = 200, extra = {}) => ({ status, headers: { ...base, ...extra }, body: page(title, body, sess) });
  const json = (obj, status = 200) => ({ status, headers: { 'Content-Type': 'application/json', 'X-Powered-By': base['X-Powered-By'] }, body: JSON.stringify(obj, null, 2) });
  const redirect = (loc, extra = {}) => ({ status: 302, headers: { ...base, Location: loc, ...extra }, body: '' });

  const parseSession = tok => {
    if (!tok) return null;
    try {
      const kv = {}; PS.b64dec(tok).split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = p.slice(i + 1); });
      if (!kv.uid || !kv.role) return null;
      return { uid: +kv.uid, role: kv.role, token: tok };
    } catch (e) { return null; }
  };
  const productsList = rows => '<ul>' + rows.map(r => `<li><b>${E(r[1])}</b> — ${E(r[2])}</li>`).join('') + '</ul>';

  function handler(req) {
    const path = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
    const sess = parseSession(req.cookies.session);
    const get = req.method === 'GET' || req.method === 'HEAD';
    // --- static / recon surface
    if (path === '/' && get) {
      const rows = db.tables.products.rows;
      return html('Home', `<h1>Welcome to ShopLab</h1><p>Your friendly demo store.</p><form action="/search" method="get"><input name="q" placeholder="Search products"> <button>Search</button></form><h3>Products</h3><ul>${rows.map(r => `<li><a href="/products?id=${r[0]}">${E(r[1])}</a> — $${r[2]}</li>`).join('')}</ul>`, sess, 200, { 'Set-Cookie': 'tracking=anon; Path=/' });
    }
    if (path === '/robots.txt') return { status: 200, headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nDisallow: /admin/\nDisallow: /backup/\nDisallow: /internal-api/\n' };
    if (path === '/.git/HEAD') return { status: 200, headers: { 'Content-Type': 'text/plain' }, body: 'ref: refs/heads/main\n' };
    if (path === '/backup') return { status: 301, headers: { ...base, Location: '/backup/' }, body: '' };
    if (req.path === '/backup/') return html('Index of /backup', '<h1>Index of /backup</h1><ul><li><a href="/backup/db_backup_2024-09-30.sql.bak">db_backup_2024-09-30.sql.bak</a> (3.1K)</li></ul>', null);
    if (path === '/backup/db_backup_2024-09-30.sql.bak') {
      return { status: 200, headers: { 'Content-Type': 'application/octet-stream' }, body: `-- MariaDB dump 10.3  Host: localhost  Database: shopdb\n-- FLAG{robots_txt_leads_to_backup_3c77}\nINSERT INTO users VALUES (1,'admin','${db.tables.users.rows[0][2]}','admin','admin@example.test');\nINSERT INTO users VALUES (3,'demo','${db.tables.users.rows[2][2]}','user','demo@example.test');\n` };
    }
    // --- products (numeric SQL injection)
    if (path === '/products' && get) {
      const id = req.query.id;
      if (id === undefined) return redirect('/');
      const sql = `SELECT id, name, price FROM products WHERE id=${id}`;
      let r;
      try { r = engine.query(sql); } catch (e) { return html('Product', `<h2>Product</h2><div class="err">Database error: ${E(e.message)}</div>`, sess, 500); }
      if (!r.rows.length) return html('Product', '<h2>Product</h2><p>Product not found.</p>', sess, 404);
      return html('Product', `<h2>Product details</h2>${productsList(r.rows)}`, sess);
    }
    // --- search (reflected XSS)
    if (path === '/search' && get) {
      const q = req.query.q || '';
      const hits = db.tables.products.rows.filter(r => q && r[1].toLowerCase().includes(q.toLowerCase()));
      return html('Search', `<h2>Results for: ${q}</h2>${hits.length ? productsList(hits) : '<p>No products found.</p>'}`, sess);
    }
    // --- login (SQL injection) + sessions (cookie trust)
    if (path === '/login' && get) {
      return html('Login', `<h2>Login</h2><form method="post" action="/login"><p><input name="username" placeholder="Username"></p><p><input name="password" type="password" placeholder="Password"></p><button>Sign in</button></form>\n<!-- TODO: remove test account before launch -> demo / demo2024 -->`, sess);
    }
    if (path === '/login' && req.method === 'POST') {
      const u = req.form.username ?? '', p = req.form.password ?? '';
      const sql = `SELECT id, username, role FROM users WHERE username='${u}' AND password='${PS.hash.md5(p)}'`;
      let r;
      try { r = engine.query(sql); } catch (e) { return html('Login', `<h2>Login</h2><div class="err">Database error: ${E(e.message)}</div>`, null, 500); }
      if (!r.rows.length) return html('Login', '<h2>Login</h2><p style="color:#b00">Invalid username or password.</p>', null, 401);
      const [id, , role] = r.rows[0];
      const tok = b64(`uid=${id};role=${role}`);
      state.issued[tok] = u.includes("'") ? 'sqli' : 'legit';
      return redirect('/account', { 'Set-Cookie': `session=${tok}; Path=/` });
    }
    if (path === '/logout') return redirect('/', { 'Set-Cookie': 'session=; Path=/; Max-Age=0' });
    if (path === '/account') {
      if (!sess) return redirect('/login');
      const user = db.tables.users.rows.find(x => x[0] === sess.uid);
      return html('Account', `<h2>My account</h2><p>User: <b>${E(user ? user[1] : 'unknown')}</b> (role: ${E(sess.role)})</p><p><a href="/api/orders">My orders (API)</a>${sess.role === 'admin' ? ' · <a href="/admin">Admin panel</a>' : ''}</p>`, sess);
    }
    // --- IDOR
    if (path === '/api/orders' && get) {
      if (!sess) return json({ error: 'authentication required' }, 401);
      return json(db.tables.orders.rows.filter(r => r[1] === sess.uid).map(r => ({ id: r[0], item: r[2], total: r[3], note: r[4] })));
    }
    let m;
    if ((m = /^\/api\/orders\/(\d+)$/.exec(path)) && get) {
      if (!sess) return json({ error: 'authentication required' }, 401);
      const o = db.tables.orders.rows.find(r => r[0] === +m[1]);
      if (!o) return json({ error: 'order not found' }, 404);
      return json({ id: o[0], user_id: o[1], item: o[2], total: o[3], note: o[4] }); // no ownership check!
    }
    // --- admin (SQLi / forged cookie / legit) + command injection
    if (path === '/admin') {
      if (!sess) return redirect('/login');
      if (sess.role !== 'admin') return html('Forbidden', '<h2>403 Forbidden</h2><p>Administrators only.</p>', sess, 403);
      const how = state.issued[sess.token];
      const flag = how === 'sqli' ? 'FLAG{sqli_login_bypass_7f3a}' : how === 'legit' ? 'FLAG{cracked_hash_legit_login_91c2}' : 'FLAG{cookie_tampering_admin_5be0}';
      return html('Admin', `<h2>Admin panel</h2><p>Users: ${db.tables.users.rows.length} · Orders: ${db.tables.orders.rows.length}</p><div class="flag">${flag}</div><p><a href="/admin/tools/ping?host=127.0.0.1">Network diagnostics (ping)</a></p>`, sess);
    }
    if (path === '/admin/tools/ping' && get) {
      if (!sess || sess.role !== 'admin') return html('Forbidden', '<h2>403 Forbidden</h2>', sess, 403);
      const host = req.query.host || '';
      if (!state.shell) state.shell = PS.apps.serverShell(net, 'web01');
      const r = state.shell.exec(`ping -c 1 ${host}`);
      return html('Diagnostics', `<h2>Ping tool</h2><pre>${E(r.out + r.err)}</pre>`, sess);
    }
    if (path === '/admin/tools') return redirect('/admin/tools/ping?host=127.0.0.1');
    if (path === '/internal-api') return json({ error: 'forbidden: internal network only' }, 403);
    return { status: 404, headers: { 'Content-Type': 'text/html', 'X-Powered-By': base['X-Powered-By'] }, body: '<html><head><title>404 Not Found</title></head><body><center><h1>404 Not Found</h1></center><hr><center>nginx/1.14.0 (Ubuntu)</center></body></html>' };
  }
  return { http: handler, db, engine, state };
};

/* ----------------------------------------------------------------------------- attacker-side CLI tools */
(function () {
  const C = PS.Shell.commands;
  const opts = PS.Shell.opts;

  C.hashid = (sh, args, io) => {
    let h = opts(args).r[0];
    if (!h) { io.err('Usage: hashid <hash>\n'); return 1; }
    const f = sh.readFile(h); if (!f.err) h = f.data.split('\n')[0].trim().split(':').pop();
    io.out(`Analyzing '${h}'\n`);
    const hex = /^[a-f0-9]+$/i.test(h);
    let t = [];
    if (/^\$2[aby]\$/.test(h)) t = ['bcrypt'];
    else if (/^\$6\$/.test(h)) t = ['SHA-512 Crypt'];
    else if (/^\$5\$/.test(h)) t = ['SHA-256 Crypt'];
    else if (/^\$1\$/.test(h)) t = ['MD5 Crypt'];
    else if (hex && h.length === 32) t = ['MD2', 'MD5', 'MD4', 'NTLM', 'Domain Cached Credentials'];
    else if (hex && h.length === 40) t = ['SHA-1', 'Double SHA-1', 'RIPEMD-160'];
    else if (hex && h.length === 64) t = ['SHA-256', 'GOST R 34.11-94', 'Haval-256'];
    else if (hex && h.length === 128) t = ['SHA-512', 'Whirlpool'];
    if (!t.length) { io.out('[+] Unknown hash\n'); return 0; }
    t.forEach(x => io.out(`[+] ${x}\n`));
    return 0;
  };

  const MODES = { 0: ['MD5', 'md5', 32], 100: ['SHA1', 'sha1', 40], 1400: ['SHA2-256', 'sha256', 64] };
  C.hashcat = (sh, args, io) => {
    const { o, r } = opts(args, 'maor');
    if (o.V || o.version) { io.out('v6.2.6\n'); return 0; }
    const mode = o.m != null ? +o.m : null;
    const potPath = sh.home + '/.hashcat.potfile';
    const pot = () => { const p = sh.vfs.get(potPath); return p ? p.data : ''; };
    if (o.show) {
      const hf = sh.readFile(r[0]);
      if (hf.err) { io.err(`${r[0]}: ${hf.err}\n`); return 255; }
      const potMap = {}; pot().split('\n').filter(Boolean).forEach(l => { const i = l.indexOf(':'); potMap[l.slice(0, i)] = l.slice(i + 1); });
      hf.data.split('\n').map(x => x.trim()).filter(Boolean).forEach(l => { const h = l.split(':').pop(); if (potMap[h] !== undefined) io.out(`${l.includes(':') ? l : h}:${potMap[h]}\n`); });
      return 0;
    }
    if (mode == null || r.length < 2) { io.err('hashcat (v6.2.6) starting...\n\nUsage: hashcat -m <mode> [-a 0] <hashfile> <wordlist>\n  -m 0 = MD5, -m 100 = SHA1, -m 1400 = SHA256, -m 3200 = bcrypt\n'); return 255; }
    const hf = sh.readFile(r[0]), wl = sh.readFile(r[1]);
    if (hf.err) { io.err(`${r[0]}: ${hf.err}\n`); return 255; }
    if (wl.err) { io.err(`${r[1]}: ${wl.err}\n`); return 255; }
    const words = wl.data.split('\n').map(x => x.replace(/\r$/, '')).filter(x => x.length);
    const targets = hf.data.split('\n').map(x => x.trim()).filter(Boolean).map(l => ({ line: l, hash: l.split(':').pop().toLowerCase() }));
    if (mode === 3200) {
      io.out(`hashcat (v6.2.6) starting\n\nSession..........: hashcat\nStatus...........: Running\nHash.Mode........: 3200 (bcrypt $2*$, Blowfish (Unix))\nHash.Target......: ${r[0]}\nSpeed.#1.........:       18 H/s (7.12ms) @ Accel:8 Loops:32 Thr:1 Vec:1\nProgress.........: 36/${words.length} (${(36 / words.length * 100).toFixed(2)}%)\nTime.Estimated...: ${Math.max(1, Math.round(words.length / 18 / 60))} mins (bu kiçik lüğət üçün); rockyou (14M söz) üçün ~9 gün, güclü parol üçün illər\n\nKomanda dayandırıldı: bcrypt qəsdən YAVAŞDIR (saniyədə ~18 cəhd vs MD5 üçün milyardlar). Bu, yaxşı parol hash-ləməsinin məqsədidir.\n`);
      return 0;
    }
    const md = MODES[mode];
    if (!md) { io.err(`hashcat: hash modu ${mode} bu simulyatorda dəstəklənmir (0, 100, 1400, 3200)\n`); return 255; }
    const bad = targets.find(t => t.hash.length !== md[2] || !/^[a-f0-9]+$/.test(t.hash));
    if (bad) { io.err(`Hash '${bad.hash}': Token length exception\nNo hashes loaded.\n`); return 255; }
    const table = {}; words.forEach(w => { table[PS.hash[md[1]](w)] = table[PS.hash[md[1]](w)] ?? w; });
    const cracked = targets.filter(t => table[t.hash] !== undefined);
    let potAdd = ''; cracked.forEach(t => { potAdd += `${t.hash}:${table[t.hash]}\n`; });
    if (cracked.length) sh.writeFile(potPath, pot() + potAdd);
    io.out(`hashcat (v6.2.6) starting\n\nSession..........: hashcat\nStatus...........: ${cracked.length === targets.length ? 'Cracked' : 'Exhausted'}\nHash.Mode........: ${mode} (${md[0]})\nHash.Target......: ${r[0]}\nTime.Started.....: Tue Oct 14 09:12:44 2025 (0 secs)\nRecovered........: ${cracked.length}/${targets.length} (${(cracked.length / targets.length * 100).toFixed(2)}%) Digests\nProgress.........: ${words.length}/${words.length} (100.00%)\n\n`);
    cracked.forEach(t => io.out(`${t.hash}:${table[t.hash]}\n`));
    if (!cracked.length) io.out('Heç bir hash lüğətdə tapılmadı (Exhausted). Başqa lüğət cəhd et.\n');
    return 0;
  };
  C.john = (sh, args, io) => {
    const { o, r } = opts(args);
    const fmt = (o.format || 'raw-md5').toLowerCase();
    const alg = { 'raw-md5': 'md5', 'raw-sha1': 'sha1', 'raw-sha256': 'sha256' }[fmt];
    if (!alg) { io.err(`Unknown ciphertext format name requested\n`); return 1; }
    const hf = sh.readFile(r[0]); if (hf.err) { io.err(`${r[0]}: ${hf.err}\n`); return 1; }
    const lines = hf.data.split('\n').map(x => x.trim()).filter(Boolean).map(l => (l.includes(':') ? l.split(':') : ['?', l]));
    if (o.show) { let n = 0; lines.forEach(([u, h]) => { const p = sh.readFile(sh.home + '/.john.pot'); const m = p.data && p.data.split('\n').find(x => x.startsWith(h + ':')); if (m) { io.out(`${u}:${m.split(':')[1]}\n`); n++; } }); io.out(`\n${n} password hash${n === 1 ? '' : 'es'} cracked, ${lines.length - n} left\n`); return 0; }
    const wl = o.wordlist ? sh.readFile(o.wordlist) : { err: 'No wordlist' };
    if (wl.err) { io.err(`Wordlist: ${wl.err}\n`); return 1; }
    const table = {}; wl.data.split('\n').filter(Boolean).forEach(w => { const h = PS.hash[alg](w); if (!(h in table)) table[h] = w; });
    io.out(`Using default input encoding: UTF-8\nLoaded ${lines.length} password hashes with no different salts (${fmt} [${alg.toUpperCase()} 256/256 AVX2 8x3])\nPress 'q' or Ctrl-C to abort, almost any other key for status\n`);
    let pot = ''; let n = 0;
    lines.forEach(([u, h]) => { if (table[h.toLowerCase()] !== undefined) { io.out(`${table[h.toLowerCase()].padEnd(17)}(${u})\n`); pot += `${h.toLowerCase()}:${table[h.toLowerCase()]}\n`; n++; } });
    const prev = sh.readFile(sh.home + '/.john.pot'); sh.writeFile(sh.home + '/.john.pot', (prev.data || '') + pot);
    io.out(`${n}g 0:00:00:00 DONE (2025-10-14 09:12) ${n}g/s\nUse the "--show --format=${fmt}" options to display all of the cracked passwords reliably\nSession completed.\n`);
    return 0;
  };

  C.gobuster = C.dirb = (sh, args, io) => {
    if (!sh.net) { io.err('gobuster: network unreachable\n'); return 1; }
    const { o, r } = opts(args, 'uwtx', {});
    if (r[0] !== 'dir' && !o.u) { io.err('Usage: gobuster dir -u <url> -w <wordlist>\n'); return 1; }
    const url = (o.u || '').replace(/\/$/, '');
    const wl = sh.readFile(o.w || '');
    if (wl.err) { io.err(`[!] wordlist: ${wl.err}\n`); return 1; }
    io.out(`===============================================================\nGobuster v3.6\nby OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)\n===============================================================\n[+] Url:                     ${url}\n[+] Method:                  GET\n[+] Threads:                 10\n[+] Wordlist:                ${o.w}\n[+] Status codes:            200,204,301,302,307,401,403\n===============================================================\nStarting gobuster in directory enumeration mode\n===============================================================\n`);
    wl.data.split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#')).forEach(w => {
      const res = sh.net.request({ method: 'GET', url: `${url}/${w}`, headers: { 'User-Agent': 'gobuster/3.6' } });
      if (res.ok && [200, 204, 301, 302, 307, 401, 403].includes(res.status)) io.out(`/${w.padEnd(20)} (Status: ${res.status}) [Size: ${res.headers['Content-Length'] || 0}]${res.headers.Location ? ` [--> ${res.headers.Location}]` : ''}\n`);
    });
    io.out('===============================================================\nFinished\n===============================================================\n');
    sh.net.emit({ type: 'dirbust', url });
    return 0;
  };
})();

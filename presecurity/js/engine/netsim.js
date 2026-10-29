/* Network simulator: hosts, DNS, HTTP services and the CLI tools that talk to them
 * (ping, traceroute, nslookup, dig, host, whois, nmap, curl, wget, nc, ip, ifconfig, arp, tcpdump, ssh). */
const PS = (globalThis.PS = globalThis.PS || {});

/* --------------------------------------------------------------------------- HTTP helpers */
PS.http = {
  statusText: { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' },
  decode(s) { try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (e) { return String(s); } },
  parseQuery(q) {
    const o = {};
    String(q || '').split('&').filter(Boolean).forEach(kv => { const i = kv.indexOf('='); const k = PS.http.decode(i < 0 ? kv : kv.slice(0, i)); o[k] = i < 0 ? '' : PS.http.decode(kv.slice(i + 1)); });
    return o;
  },
  parseCookies(h) {
    const o = {};
    String(h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
    return o;
  },
  parseUrl(u, defaultScheme = 'http') {
    const m = /^(?:(https?):\/\/)?([^/:?#]+)(?::(\d+))?(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i.exec(u.trim());
    if (!m) return null;
    const scheme = (m[1] || defaultScheme).toLowerCase();
    return { scheme, host: m[2], port: m[3] ? +m[3] : scheme === 'https' ? 443 : 80, path: m[4] || '/', rawQuery: m[5] || '' };
  },
};

/* --------------------------------------------------------------------------- Net model */
PS.Net = class Net {
  constructor(spec, self) {
    this.spec = spec; this.self = self; this.hosts = spec.hosts; this.log = [];
    this.onEvent = null;
  }
  me() { return this.hosts[this.self]; }
  emit(ev) { this.log.push(ev); if (this.onEvent) { try { this.onEvent(ev); } catch (e) { /* ignore */ } } }

  static ip2int(ip) { return ip.split('.').reduce((a, b) => ((a << 8) + (+b)) >>> 0, 0); }
  static int2ip(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  static isIp(s) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split('.').every(x => +x < 256); }
  sameSubnet(a, b, bits = 24) { const m = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0; return (PS.Net.ip2int(a) & m) === (PS.Net.ip2int(b) & m); }

  findByIp(ip) { const k = Object.keys(this.hosts).find(k => this.hosts[k].ip === ip); return k ? { key: k, host: this.hosts[k] } : null; }
  findByName(n) {
    n = n.toLowerCase().replace(/\.$/, '');
    if (n === 'localhost') return { key: this.self, host: this.me() };
    const k = Object.keys(this.hosts).find(k => k === n || (this.hosts[k].names || []).some(x => x.toLowerCase() === n));
    return k ? { key: k, host: this.hosts[k] } : null;
  }
  dnsRecords(name) {
    name = name.toLowerCase().replace(/\.$/, '');
    const rec = Object.assign({}, this.spec.dns && this.spec.dns[name]);
    const h = this.findByName(name);
    if (h && !rec.A && !rec.CNAME && h.key !== this.self) rec.A = [h.host.ip];
    return Object.keys(rec).length ? rec : null;
  }
  /** resolve a name or IP to {ip, host, key, name} */
  resolve(target) {
    if (PS.Net.isIp(target) && target.startsWith('127.')) return { ip: target, host: this.me(), key: this.self, name: null, loopback: true };
    if (PS.Net.isIp(target)) { const f = this.findByIp(target); return { ip: target, host: f && f.host, key: f && f.key, name: null }; }
    if (target.toLowerCase() === 'localhost') return { ip: '127.0.0.1', host: this.me(), key: this.self, name: 'localhost', loopback: true };
    const rec = this.dnsRecords(target);
    if (!rec) return null;
    let cname = null, r = rec;
    for (let i = 0; i < 5 && r && r.CNAME && !r.A; i++) { cname = r.CNAME; r = this.dnsRecords(r.CNAME); }
    if (!r || !r.A) return null;
    const f = this.findByIp(r.A[0]);
    return { ip: r.A[0], host: f && f.host, key: f && f.key, name: target, cname };
  }
  hopsTo(host) { return host.route ? host.route.length + 1 : (this.me() && this.sameSubnet(this.me().ip, host.ip, host.prefix || 24) ? 1 : 2); }
  portState(host, port) { const p = host.ports && host.ports[port]; return p ? (p.state || 'open') : (host.firewalled ? 'filtered' : 'closed'); }

  /** perform an HTTP request in the simulated network. opts: {method, url, headers, body, follow} */
  request(o) {
    const pu = typeof o.url === 'string' ? PS.http.parseUrl(o.url, o.scheme || 'http') : o.url;
    if (!pu) return { ok: false, code: 3, error: 'URL using bad/illegal format or missing URL' };
    const t = this.resolve(pu.host);
    if (!t) return { ok: false, code: 6, error: `Could not resolve host: ${pu.host}` };
    if (!t.host) return { ok: false, code: 28, error: `Failed to connect to ${pu.host} port ${pu.port}: Connection timed out` };
    const host = t.host;
    if (host.down) return { ok: false, code: 28, error: `Failed to connect to ${pu.host} port ${pu.port}: Connection timed out` };
    const st = this.portState(host, pu.port);
    if (st === 'filtered') return { ok: false, code: 28, error: `Failed to connect to ${pu.host} port ${pu.port} after 130000 ms: Connection timed out` };
    if (st === 'closed') return { ok: false, code: 7, error: `Failed to connect to ${pu.host} port ${pu.port} after 0 ms: Connection refused` };
    const port = host.ports[pu.port];
    const handler = port.http || host.http;
    const method = (o.method || 'GET').toUpperCase();
    const headers = {}; Object.entries(o.headers || {}).forEach(([k, v]) => { headers[k.toLowerCase()] = v; });
    if (!headers.host) headers.host = pu.host + ((pu.scheme === 'http' && pu.port === 80) || (pu.scheme === 'https' && pu.port === 443) ? '' : ':' + pu.port);
    const body = o.body || '';
    const ctype = headers['content-type'] || '';
    const req = {
      method, path: pu.path, rawQuery: pu.rawQuery, query: PS.http.parseQuery(pu.rawQuery), headers, cookies: PS.http.parseCookies(headers.cookie),
      body, form: /urlencoded/.test(ctype) || (body && !/json/.test(ctype) && !ctype) ? PS.http.parseQuery(body) : {}, json: null,
      ip: (this.me() || {}).ip, scheme: pu.scheme, port: pu.port,
    };
    if (/json/.test(ctype)) { try { req.json = JSON.parse(body); } catch (e) { req.json = null; } }
    let res;
    if (!handler) res = { status: 200, headers: { 'Content-Type': 'text/plain' }, body: `${port.svc || 'service'} (HTTP yoxdur)\n` };
    else if (typeof handler === 'function') {
      try { res = handler(req, { net: this, host, key: t.key }); } catch (e) { res = { status: 500, headers: { 'Content-Type': 'text/plain' }, body: 'Internal Server Error\n' + e.message }; }
    } else {
      res = handler[pu.path] || handler[pu.path.replace(/\/$/, '')] || { status: 404, headers: { 'Content-Type': 'text/html' }, body: '<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1></body></html>' };
    }
    if (typeof res === 'string') res = { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' }, body: res };
    res = { status: res.status || 200, headers: Object.assign({ Date: this.dateStr(), 'Content-Length': String(PS.utf8(res.body || '').length) }, host.serverHeader ? { Server: host.serverHeader } : {}, res.headers || {}), body: res.body || '' };
    if (method === 'HEAD') res.body = '';
    const out = { ok: true, status: res.status, statusText: PS.http.statusText[res.status] || '', headers: res.headers, body: res.body, req, host: pu.host, port: pu.port, scheme: pu.scheme, path: pu.path, rawQuery: pu.rawQuery };
    this.emit({ type: 'http', method, url: `${pu.scheme}://${pu.host}${pu.path}${pu.rawQuery ? '?' + pu.rawQuery : ''}`, status: out.status, key: t.key, req, res: out });
    return out;
  }
  dateStr() { return 'Tue, 14 Oct 2025 09:12:44 GMT'; }
};

/* --------------------------------------------------------------------------- CLI tools */
(function () {
  const C = PS.Shell.commands;
  const opts = PS.Shell.opts;
  const rnd = (seed) => PS.rng(seed);
  const fmt3 = n => n.toFixed(3);
  const svcNames = { 21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'domain', 80: 'http', 110: 'pop3', 143: 'imap', 443: 'https', 445: 'microsoft-ds', 3306: 'mysql', 3389: 'ms-wbt-server', 5432: 'postgresql', 8080: 'http-proxy', 8443: 'https-alt' };
  const needNet = (sh, io, cmd) => { if (!sh.net) { io.err(`${cmd}: connect: Network is unreachable\n`); return false; } return true; };

  C.ping = (sh, args, io) => {
    if (!needNet(sh, io, 'ping')) return 2;
    const { o, r } = opts(args, 'cWiswt');
    const target = r[0];
    if (!target) { io.err('ping: usage error: Destination address required\n'); return 2; }
    const net = sh.net, t = net.resolve(target);
    if (!t) { io.err(`ping: ${target}: Name or service not known\n`); return 2; }
    const count = o.c ? Math.max(1, Math.min(+o.c, 20)) : 4;
    const me = net.me();
    io.out(`PING ${target} (${t.ip}) 56(84) bytes of data.\n`);
    const host = t.host;
    if (!host || host.down) {
      io.out(`From ${me.ip} icmp_seq=1 Destination Host Unreachable\n`);
      io.out(`\n--- ${target} ping statistics ---\n${count} packets transmitted, 0 received, +${count} errors, 100% packet loss, time ${(count - 1) * 1000 + 3}ms\n`);
      return 1;
    }
    if (host.icmp === false) {
      io.out(`\n--- ${target} ping statistics ---\n${count} packets transmitted, 0 received, 100% packet loss, time ${(count - 1) * 1000 + 3}ms\n`);
      return 1;
    }
    const R = rnd('ping' + target);
    const hops = t.loopback ? 0 : net.hopsTo(host);
    const ttl = (host.ttl || (/windows/i.test(host.os || '') ? 128 : 64)) - Math.max(0, hops - 1);
    const base = host.latency != null ? host.latency : (t.loopback ? 0.04 : 0.35 + hops * 0.9);
    const times = [];
    for (let i = 1; i <= count; i++) {
      const tm = base * (0.85 + R() * 0.4) + (i === 1 ? base * 0.5 : 0);
      times.push(tm);
      io.out(`64 bytes from ${target === t.ip ? t.ip : (host.names && host.names[0] && !PS.Net.isIp(target) ? target : target)} (${t.ip}): icmp_seq=${i} ttl=${ttl} time=${tm.toFixed(tm < 10 ? 3 : 1)} ms\n`);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const mdev = Math.sqrt(times.reduce((s, x) => s + (x - avg) ** 2, 0) / times.length);
    io.out(`\n--- ${target} ping statistics ---\n${count} packets transmitted, ${count} received, 0% packet loss, time ${(count - 1) * 1000 + 4}ms\nrtt min/avg/max/mdev = ${fmt3(Math.min(...times))}/${fmt3(avg)}/${fmt3(Math.max(...times))}/${fmt3(mdev)} ms\n`);
    net.emit({ type: 'ping', target, ip: t.ip });
    return 0;
  };

  C.traceroute = C.tracepath = (sh, args, io) => {
    if (!needNet(sh, io, 'traceroute')) return 2;
    const target = opts(args).r[0];
    if (!target) { io.err('Usage: traceroute host\n'); return 2; }
    const net = sh.net, t = net.resolve(target);
    if (!t) { io.err(`${target}: Name or service not known\n`); return 2; }
    const me = net.me(), host = t.host;
    io.out(`traceroute to ${target} (${t.ip}), 30 hops max, 60 byte packets\n`);
    if (!host || host.down) { for (let i = 1; i <= 3; i++) io.out(` ${i}  * * *\n`); return 0; }
    const hops = [];
    if (host.route) host.route.forEach(h => hops.push(h));
    else if (!net.sameSubnet(me.ip, host.ip, host.prefix || 24)) hops.push({ ip: me.gw, name: 'gateway' });
    hops.push({ ip: host.ip, name: t.name || (host.names && host.names[0]) || undefined, final: true });
    const R = rnd('tr' + target);
    hops.forEach((h, i) => {
      if (h.hidden) { io.out(`${String(i + 1).padStart(2)}  * * *\n`); return; }
      const base = 0.4 + i * 1.1 * (h.slow ? 4 : 1);
      const ts = [0, 1, 2].map(() => (base * (0.85 + R() * 0.4)).toFixed(3) + ' ms').join('  ');
      io.out(`${String(i + 1).padStart(2)}  ${h.name ? `${h.name} (${h.ip})` : `${h.ip} (${h.ip})`}  ${ts}\n`);
    });
    return 0;
  };

  /* ---------------- DNS */
  const dnsRecordLines = (net, name, type) => {
    const rec = net.dnsRecords(name);
    if (!rec) return null;
    const fqdn = name.replace(/\.$/, '') + '.';
    const lines = [];
    const types = type === 'ANY' ? ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME'] : [type];
    types.forEach(ty => {
      if (ty === 'A' && rec.CNAME && !rec.A) { lines.push({ ty: 'CNAME', val: rec.CNAME + '.' }); const t = net.dnsRecords(rec.CNAME); (t && t.A || []).forEach(a => lines.push({ ty: 'A', val: a, name: rec.CNAME + '.' })); return; }
      if (ty === 'MX') (rec.MX || []).forEach(m => lines.push({ ty, val: `${m.pri} ${m.host}.` }));
      else if (ty === 'TXT') (rec.TXT || []).forEach(t => lines.push({ ty, val: `"${t}"` }));
      else if (ty === 'NS') (rec.NS || []).forEach(t => lines.push({ ty, val: t + '.' }));
      else if (ty === 'SOA' && rec.SOA) lines.push({ ty, val: rec.SOA });
      else if (ty === 'CNAME' && rec.CNAME) lines.push({ ty, val: rec.CNAME + '.' });
      else if (rec[ty] && Array.isArray(rec[ty])) rec[ty].forEach(v => lines.push({ ty, val: v }));
    });
    return { fqdn, lines, rec };
  };
  const reverseName = (net, ip) => { const f = net.findByIp(ip); return f && f.host.names && f.host.names[0] ? f.host.names[0] : null; };

  C.nslookup = (sh, args, io) => {
    if (!needNet(sh, io, 'nslookup')) return 1;
    const { r } = opts(args.filter(a => !a.startsWith('-type=') && !a.startsWith('-q=')));
    const tArg = args.find(a => /^-(type|q)=/.test(a));
    const type = tArg ? tArg.split('=')[1].toUpperCase() : 'A';
    const name = r[0];
    if (!name) { io.err('Interactive mode dəstəklənmir. İstifadə: nslookup [-type=MX] <ad>\n'); return 1; }
    const net = sh.net, me = net.me();
    const hdr = `Server:\t\t${me.dns || me.gw}\nAddress:\t${me.dns || me.gw}#53\n\n`;
    if (PS.Net.isIp(name)) {
      const rn = reverseName(net, name);
      const arpa = name.split('.').reverse().join('.') + '.in-addr.arpa';
      if (!rn) { io.out(hdr); io.err(`** server can't find ${arpa}: NXDOMAIN\n`); return 1; }
      io.out(hdr + `${arpa}\tname = ${rn}.\n\nAuthoritative answers can be found from:\n`); return 0;
    }
    const d = dnsRecordLines(net, name, type);
    if (!d || !d.lines.length) {
      io.out(hdr);
      if (!d) { io.err(`** server can't find ${name}: NXDOMAIN\n`); return 1; }
      io.out(`${name}\n*** No ${type} records found\n`); return 0;
    }
    io.out(hdr + 'Non-authoritative answer:\n');
    d.lines.forEach(l => {
      if (l.ty === 'A') io.out(`Name:\t${(l.name || d.fqdn).replace(/\.$/, '')}\nAddress: ${l.val}\n`);
      else if (l.ty === 'MX') io.out(`${name}\tmail exchanger = ${l.val}\n`);
      else if (l.ty === 'NS') io.out(`${name}\tnameserver = ${l.val}\n`);
      else if (l.ty === 'TXT') io.out(`${name}\ttext = ${l.val}\n`);
      else if (l.ty === 'CNAME') io.out(`${name}\tcanonical name = ${l.val}\n`);
      else io.out(`${name}\t${l.ty} ${l.val}\n`);
    });
    io.out('\n');
    return 0;
  };

  C.dig = (sh, args, io) => {
    if (!needNet(sh, io, 'dig')) return 1;
    const { r } = opts(args.filter(a => !a.startsWith('+')));
    const short = args.includes('+short');
    let name = r[0], type = 'A';
    r.slice(1).forEach(a => { if (/^[A-Za-z]+$/.test(a)) type = a.toUpperCase(); });
    if (!name) { io.out('; <<>> DiG 9.18.18 <<>>\n;; global options: +cmd\n'); return 0; }
    const net = sh.net, me = net.me();
    if (name === '-x') { name = r[1]; }
    let d;
    if (PS.Net.isIp(name) && args.includes('-x')) {
      const rn = reverseName(net, name);
      const arpa = name.split('.').reverse().join('.') + '.in-addr.arpa.';
      d = rn ? { fqdn: arpa, lines: [{ ty: 'PTR', val: rn + '.' }] } : null; type = 'PTR';
      if (short) { if (d) io.out(d.lines[0].val + '\n'); return 0; }
    } else d = dnsRecordLines(net, name, type);
    if (short) { if (d) d.lines.forEach(l => io.out(l.val + '\n')); return 0; }
    const n = d ? d.lines.length : 0;
    const R = rnd('dig' + name);
    io.out(`\n; <<>> DiG 9.18.18-0ubuntu0.22.04.2-Ubuntu <<>> ${args.filter(a => a !== '+short').join(' ')}\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: ${d ? 'NOERROR' : 'NXDOMAIN'}, id: ${Math.floor(R() * 60000) + 1000}\n;; flags: qr rd ra; QUERY: 1, ANSWER: ${n}, AUTHORITY: ${d ? 0 : 1}, ADDITIONAL: 1\n\n;; OPT PSEUDOSECTION:\n; EDNS: version: 0, flags:; udp: 65494\n;; QUESTION SECTION:\n;${name.replace(/\.$/, '')}.\t\t\tIN\t${type}\n\n`);
    if (d && n) { io.out(';; ANSWER SECTION:\n'); d.lines.forEach(l => io.out(`${(l.name || d.fqdn).padEnd(23)} 300\tIN\t${l.ty}\t${l.val}\n`)); io.out('\n'); }
    io.out(`;; Query time: ${Math.floor(R() * 40) + 3} msec\n;; SERVER: ${me.dns || me.gw}#53(${me.dns || me.gw}) (UDP)\n;; WHEN: Tue Oct 14 09:12:44 UTC 2025\n;; MSG SIZE  rcvd: ${d ? 60 + n * 16 : 112}\n\n`);
    return 0;
  };
  C.host = (sh, args, io) => {
    if (!needNet(sh, io, 'host')) return 1;
    const { r } = opts(args, 't');
    const name = r[0]; const net = sh.net;
    if (PS.Net.isIp(name)) { const rn = reverseName(net, name); if (!rn) { io.out(`Host ${name.split('.').reverse().join('.')}.in-addr.arpa. not found: 3(NXDOMAIN)\n`); return 1; } io.out(`${name.split('.').reverse().join('.')}.in-addr.arpa domain name pointer ${rn}.\n`); return 0; }
    const d = dnsRecordLines(net, name, 'ANY');
    if (!d) { io.out(`Host ${name} not found: 3(NXDOMAIN)\n`); return 1; }
    d.lines.forEach(l => io.out(l.ty === 'A' ? `${name} has address ${l.val}\n` : l.ty === 'MX' ? `${name} mail is handled by ${l.val}\n` : l.ty === 'TXT' ? `${name} descriptive text ${l.val}\n` : l.ty === 'NS' ? `${name} name server ${l.val}\n` : l.ty === 'CNAME' ? `${name} is an alias for ${l.val}\n` : ''));
    return 0;
  };
  C.whois = (sh, args, io) => {
    if (!needNet(sh, io, 'whois')) return 1;
    const d = (opts(args).r[0] || '').toLowerCase();
    const w = sh.net.spec.whois && sh.net.spec.whois[d];
    if (!w) { io.out(`No match for "${d.toUpperCase()}".\n`); return 1; }
    io.out(w.trimEnd() + '\n');
  };

  /* ---------------- nmap */
  const parseTargets = (spec, net) => {
    const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(spec);
    if (m) {
      const bits = +m[2]; const base = PS.Net.ip2int(m[1]) & ((~0 << (32 - bits)) >>> 0); const size = Math.min(2 ** (32 - bits), 1024);
      return Array.from({ length: size }, (_, i) => PS.Net.int2ip(base + i));
    }
    const rg = /^(\d+\.\d+\.\d+\.)(\d+)-(\d+)$/.exec(spec);
    if (rg) { const out = []; for (let i = +rg[2]; i <= +rg[3]; i++) out.push(rg[1] + i); return out; }
    return [spec];
  };
  const parsePorts = spec => {
    const set = new Set();
    spec.split(',').forEach(p => { const m = /^(\d*)-(\d*)$/.exec(p); if (m) { const a = +m[1] || 1, b = +m[2] || 65535; for (let i = a; i <= b; i++) set.add(i); } else if (/^\d+$/.test(p)) set.add(+p); });
    return set;
  };
  C.nmap = (sh, args, io) => {
    if (!needNet(sh, io, 'nmap')) return 1;
    const { o, r } = opts(args, 'p', { 'top-ports': 1, script: 1 });
    const flagStr = args.join(' ');
    const sn = /(^|\s)-sn(\s|$)/.test(flagStr), sV = /-sV|-A/.test(flagStr), A = /(^|\s)-A(\s|$)/.test(flagStr), osd = /-O|-A/.test(flagStr), Pn = /-Pn/.test(flagStr);
    if (!r.length) { io.out('Nmap 7.94 ( https://nmap.org )\nUsage: nmap [Scan Type(s)] [Options] {target specification}\n'); return 0; }
    if ((/-sS|-sU/.test(flagStr) || osd) && sh.user !== 'root') {
      io.err(`${osd ? 'TCP/IP fingerprinting (for OS scan) requires root privileges.' : 'You requested a scan type which requires root privileges.'}\nQUITTING!\n`); return 1;
    }
    const net = sh.net, me = net.me();
    let portSet = null, total = 1000;
    if (o.p === true || args.includes('-p-')) { portSet = null; total = 65535; }
    else if (o.p) { portSet = parsePorts(String(o.p)); total = portSet.size; }
    else if (o['top-ports']) total = +o['top-ports'];
    else if (/(^|\s)-F(\s|$)/.test(flagStr)) total = 100;
    if (args.includes('-p-')) portSet = null;
    const targets = []; r.forEach(t => parseTargets(t, net).forEach(x => targets.push(x)));
    io.out(`Starting Nmap 7.94 ( https://nmap.org ) at 2025-10-14 09:12 UTC\n`);
    let up = 0;
    const R = rnd('nmap' + flagStr);
    for (const tg of targets) {
      const t = net.resolve(tg);
      const host = t && t.host;
      const local = host && net.sameSubnet(me.ip, host.ip, host.prefix || 24);
      const isUp = host && !host.down && (Pn || local || host.icmp !== false);
      if (!isUp) {
        if (targets.length === 1) {
          if (!t) { io.err(`Failed to resolve "${tg}".\n`); }
          else io.out(`Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn\n`);
        }
        continue;
      }
      up++;
      const label = t.name && !PS.Net.isIp(tg) ? `${tg} (${host.ip})` : (host.names && host.names[0] ? `${host.names[0]} (${host.ip})` : host.ip);
      io.out(`Nmap scan report for ${label}\nHost is up (${(0.0002 + R() * 0.002).toFixed(5)}s latency).\n`);
      if (sn) { if (local && host.mac) io.out(`MAC Address: ${host.mac.toUpperCase()} (${host.vendor || 'Oracle VirtualBox virtual NIC'})\n`); continue; }
      // port table
      const declared = Object.keys(host.ports || {}).map(Number).filter(p => (portSet ? portSet.has(p) : true)).sort((a, b) => a - b);
      const defState = host.firewalled ? 'filtered' : 'closed';
      const scanned = portSet ? portSet.size : total;
      const rows = [];
      declared.forEach(p => rows.push({ port: p, state: host.ports[p].state || 'open', svc: host.ports[p].svc || svcNames[p] || 'unknown', ver: host.ports[p].ver || '' }));
      let hidden = scanned - declared.length;
      if (portSet && scanned <= 25) {
        [...portSet].filter(p => !declared.includes(p)).forEach(p => rows.push({ port: p, state: defState, svc: svcNames[p] || 'unknown', ver: '' }));
        rows.sort((a, b) => a.port - b.port); hidden = 0;
      } else if (!portSet && total === 1000) {
        // keep declared among top ports
      }
      if (hidden > 0) io.out(`Not shown: ${hidden} ${defState} tcp ports (${defState === 'closed' ? 'conn-refused' : 'no-response'})\n`);
      const open = rows.filter(x => x.state === 'open');
      if (!rows.length) io.out(`All ${scanned} scanned ports on ${host.ip} are in ignored states.\n`);
      else {
        const vcol = sV ? ' VERSION' : '';
        const w = Math.max(...rows.map(x => (x.svc || '').length), 7);
        io.out(`PORT${' '.repeat(Math.max(...rows.map(x => `${x.port}/tcp`.length), 8) - 4)} STATE${' '.repeat(Math.max(...rows.map(x => x.state.length), 5) - 5)} SERVICE${' '.repeat(w - 7)}${vcol}\n`);
        const pw = Math.max(...rows.map(x => `${x.port}/tcp`.length), 8), sw = Math.max(...rows.map(x => x.state.length), 5);
        rows.forEach(x => {
          io.out(`${(x.port + '/tcp').padEnd(pw)} ${x.state.padEnd(sw)} ${x.svc.padEnd(w)}${sV && x.state === 'open' ? ' ' + x.ver : ''}`.trimEnd() + '\n');
          if (A && x.state === 'open' && host.ports[x.port].title) io.out(`|_http-title: ${host.ports[x.port].title}\n`);
          if (A && x.state === 'open' && host.ports[x.port].script) host.ports[x.port].script.forEach((l, i, arr) => io.out(`${i === arr.length - 1 ? '|_' : '| '}${l}\n`));
        });
      }
      if (local && host.mac) io.out(`MAC Address: ${host.mac.toUpperCase()} (${host.vendor || 'Oracle VirtualBox virtual NIC'})\n`);
      if (osd) io.out(`Device type: general purpose\nRunning: ${host.os ? host.os.split(' ')[0] : 'Linux'}\nOS details: ${host.os || 'Linux 4.15 - 5.8'}\nNetwork Distance: ${net.hopsTo(host)} hop${net.hopsTo(host) > 1 ? 's' : ''}\n`);
      if (sV && open.length) io.out(`\nService detection performed. Please report any incorrect results at https://nmap.org/submit/ .\n`);
      net.emit({ type: 'portscan', target: host.ip, ports: portSet ? [...portSet] : null, sV, A, openCount: open.length });
      io.out('\n');
    }
    io.out(`Nmap done: ${targets.length} IP address${targets.length > 1 ? 'es' : ''} (${up} host${up === 1 ? '' : 's'} up) scanned in ${(1.2 + R() * 4 + (total > 1000 ? 8 : 0)).toFixed(2)} seconds\n`);
    return 0;
  };

  /* ---------------- curl / wget / nc */
  const reasonLine = (status) => `HTTP/1.1 ${status} ${PS.http.statusText[status] || ''}`.trim();
  const headLines = res => Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`);

  C.curl = (sh, args, io) => {
    if (!needNet(sh, io, 'curl')) return 7;
    const { o, r } = (function () {
      // custom parser: repeated -H, -d options
      const o = { H: [], d: [] }, r = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '-H' || a === '--header') o.H.push(args[++i]);
        else if (a === '-d' || a === '--data' || a === '--data-raw' || a === '--data-urlencode') o.d.push(args[++i]);
        else if (a === '-X' || a === '--request') o.X = args[++i];
        else if (a === '-b' || a === '--cookie') o.b = args[++i];
        else if (a === '-u' || a === '--user') o.u = args[++i];
        else if (a === '-A' || a === '--user-agent') o.A = args[++i];
        else if (a === '-o' || a === '--output') o.o = args[++i];
        else if (a === '-e' || a === '--referer') o.e = args[++i];
        else if (a === '--max-time' || a === '-m') i++;
        else if (/^-[A-Za-z]+$/.test(a)) { for (const ch of a.slice(1)) o[ch] = true; }
        else if (a.startsWith('--')) o[a.slice(2)] = true;
        else r.push(a);
      }
      return { o, r };
    })();
    if (!r.length) { io.err("curl: try 'curl --help' for more information\n"); return 2; }
    let url = r[0]; let method = o.X || (o.I ? 'HEAD' : o.d.length ? 'POST' : 'GET');
    const headers = { 'User-Agent': o.A || 'curl/8.4.0', Accept: '*/*' };
    o.H.forEach(h => { const i = h.indexOf(':'); if (i > 0) headers[h.slice(0, i).trim()] = h.slice(i + 1).trim(); });
    if (o.b) headers.Cookie = o.b;
    if (o.u) headers.Authorization = 'Basic ' + PS.b64enc(o.u);
    if (o.e) headers.Referer = o.e;
    let body = o.d.join('&');
    if (o.d.length && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    let res = null, hops = 0;
    for (;;) {
      const pu = PS.http.parseUrl(url);
      if (!pu) { io.err(`curl: (3) URL using bad/illegal format or missing URL\n`); return 3; }
      if (o.v) {
        const t = sh.net.resolve(pu.host);
        io.out(`* Host ${pu.host}:${pu.port} was resolved.\n* Trying ${t ? t.ip : '?'}:${pu.port}...\n`);
      }
      res = sh.net.request({ method, url: pu, headers, body });
      if (!res.ok) { if (!o.s || o.S) io.err(`curl: (${res.code}) ${res.error}\n`); return res.code; }
      if (o.v) {
        io.out(`* Connected to ${pu.host} port ${pu.port}\n`);
        if (pu.scheme === 'https') io.out('* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384\n* Server certificate:\n*  subject: CN=' + pu.host + '\n*  start date: Sep  1 00:00:00 2025 GMT\n*  expire date: Dec  1 23:59:59 2025 GMT\n*  issuer: CN=Lab Intermediate CA\n');
        io.out(`> ${method} ${pu.path}${pu.rawQuery ? '?' + pu.rawQuery : ''} HTTP/1.1\n> Host: ${pu.host}${pu.port === 80 || pu.port === 443 ? '' : ':' + pu.port}\n`);
        Object.entries(headers).forEach(([k, v]) => io.out(`> ${k}: ${v}\n`));
        io.out('>\n');
        if (body) io.out(`* upload body: ${body.length} bytes\n`);
        io.out(`< ${reasonLine(res.status)}\n`); headLines(res).forEach(l => io.out(`< ${l}\n`)); io.out('<\n');
      }
      if (o.L && [301, 302, 303, 307].includes(res.status) && res.headers.Location && hops++ < 5) {
        const loc = res.headers.Location;
        url = /^https?:/.test(loc) ? loc : `${pu.scheme}://${pu.host}${pu.port === 80 || pu.port === 443 ? '' : ':' + pu.port}${loc}`;
        if (res.status !== 307) { method = 'GET'; body = ''; }
        continue;
      }
      break;
    }
    if ((o.I || o.i) && !o.v) io.out(reasonLine(res.status) + '\n' + headLines(res).join('\n') + '\n' + (o.I ? '' : '\n'));
    if (!o.I) {
      if (o.o) { const w = sh.writeFile(o.o, res.body); if (w.err) { io.err(`curl: (23) Failure writing output to destination: ${w.err}\n`); return 23; } }
      else io.out(res.body + (res.body && !res.body.endsWith('\n') && io.isTTY ? '\n' : ''));
    }
    return 0;
  };
  C.wget = (sh, args, io) => {
    if (!needNet(sh, io, 'wget')) return 4;
    const { o, r } = opts(args, 'O');
    const url = r[0];
    if (!url) { io.err('wget: missing URL\n'); return 1; }
    const pu = PS.http.parseUrl(url);
    const res = pu && sh.net.request({ method: 'GET', url: pu, headers: { 'User-Agent': 'Wget/1.21.4' } });
    if (!res || !res.ok) { io.err(`wget: ${res ? res.error : 'invalid URL'}\n`); return 4; }
    if (res.status >= 400) { io.err(`HTTP request sent, awaiting response... ${res.status} ${res.statusText}\nERROR ${res.status}: ${res.statusText}.\n`); return 8; }
    const fname = o.O || (pu.path.split('/').filter(Boolean).pop() || 'index.html');
    if (fname === '-') { io.out(res.body); return 0; }
    const w = sh.writeFile(fname, res.body);
    if (w.err) { io.err(`${fname}: ${w.err}\n`); return 3; }
    if (!o.q) io.out(`--2025-10-14 09:12:44--  ${url}\nHTTP request sent, awaiting response... ${res.status} ${res.statusText}\nLength: ${res.body.length} [${res.headers['Content-Type'] || 'text/html'}]\nSaving to: ‘${fname}’\n\n${fname}      100%[===================>]  ${res.body.length}  --.-KB/s    in 0s\n\n‘${fname}’ saved [${res.body.length}]\n`);
  };
  C.nc = C.ncat = C.netcat = (sh, args, io) => {
    if (!needNet(sh, io, 'nc')) return 1;
    const { o, r } = opts(args);
    const [target, portSpec] = r;
    if (!target || !portSpec) { io.err('usage: nc [-zv] host port\n'); return 1; }
    const t = sh.net.resolve(target);
    if (!t) { io.err(`nc: getaddrinfo for host "${target}" port ${portSpec}: Name or service not known\n`); return 1; }
    const ports = [...parsePorts(portSpec)];
    let code = 1;
    ports.forEach(p => {
      const host = t.host; const st = host && !host.down ? sh.net.portState(host, p) : 'filtered';
      if (st !== 'open') {
        if (o.v || o.z) io.err(`nc: connect to ${target} port ${p} (tcp) failed: ${st === 'closed' ? 'Connection refused' : 'Connection timed out'}\n`);
        else io.err(`nc: connect to ${target} port ${p} (tcp) failed: Connection refused\n`);
        return;
      }
      code = 0;
      const port = host.ports[p];
      if (o.z) { io.out(`Connection to ${target} ${p} port [tcp/${port.svc || svcNames[p] || '*'}] succeeded!\n`); return; }
      if (o.v) io.err(`Connection to ${target} ${p} port [tcp/${port.svc || '*'}] succeeded!\n`);
      const stdin = io.stdin || '';
      if ((port.http || host.http) && stdin) {
        const m = /^(GET|HEAD|POST|OPTIONS)\s+(\S+)/.exec(stdin);
        if (m) {
          const res = sh.net.request({ method: m[1], url: `http://${target}:${p}${m[2]}`, headers: {} });
          if (res.ok) io.out(reasonLine(res.status) + '\r\n' + headLines(res).join('\r\n') + '\r\n\r\n' + (m[1] === 'HEAD' ? '' : res.body));
          return;
        }
      }
      if (port.banner) io.out(port.banner + '\n');
    });
    return code;
  };
  C.telnet = (sh, args, io) => C.nc(sh, ['-v', ...args], io);
  C.ssh = (sh, args, io) => {
    if (!needNet(sh, io, 'ssh')) return 255;
    const tgt = opts(args, 'pi').r[0] || '';
    const [user, hostName] = tgt.includes('@') ? tgt.split('@') : [sh.user, tgt];
    const t = sh.net.resolve(hostName);
    if (!t) { io.err(`ssh: Could not resolve hostname ${hostName}: Name or service not known\n`); return 255; }
    const st = t.host && !t.host.down ? sh.net.portState(t.host, 22) : 'filtered';
    if (st !== 'open') { io.err(`ssh: connect to host ${hostName} port 22: ${st === 'closed' ? 'Connection refused' : 'Connection timed out'}\n`); return 255; }
    io.err(`${user}@${hostName}: Permission denied (publickey,password).\n(Simulyatorda uzaq sessiya yoxdur — məqsəd portun və xidmətin əlçatanlığını yoxlamaqdır.)\n`);
    return 255;
  };

  /* ---------------- local interface info */
  const maskOf = bits => PS.Net.int2ip(bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0);
  C.ip = (sh, args, io) => {
    if (!needNet(sh, io, 'ip')) return 1;
    const me = sh.net.me(); const bits = me.prefix || 24;
    const sub = args[0] || 'a';
    const bc = PS.Net.int2ip((PS.Net.ip2int(me.ip) | (~(~0 << (32 - bits)) >>> 0)) >>> 0);
    if (/^a/.test(sub)) {
      io.out(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever\n`);
      io.out(`2: ${me.iface || 'eth0'}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000\n    link/ether ${me.mac} brd ff:ff:ff:ff:ff:ff\n    inet ${me.ip}/${bits} brd ${bc} scope global dynamic ${me.iface || 'eth0'}\n       valid_lft 86212sec preferred_lft 86212sec\n`);
    } else if (/^r/.test(sub)) {
      io.out(`default via ${me.gw} dev ${me.iface || 'eth0'} proto dhcp metric 100\n${PS.Net.int2ip(PS.Net.ip2int(me.ip) & ((~0 << (32 - bits)) >>> 0))}/${bits} dev ${me.iface || 'eth0'} proto kernel scope link src ${me.ip} metric 100\n`);
    } else if (/^n/.test(sub)) C.arp(sh, ['-n'], io);
    else { io.err(`Object "${sub}" is unknown, try "ip help".\n`); return 1; }
  };
  C.ifconfig = (sh, args, io) => {
    if (!needNet(sh, io, 'ifconfig')) return 1;
    const me = sh.net.me(); const bits = me.prefix || 24;
    const bc = PS.Net.int2ip((PS.Net.ip2int(me.ip) | (~(~0 << (32 - bits)) >>> 0)) >>> 0);
    io.out(`${me.iface || 'eth0'}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet ${me.ip}  netmask ${maskOf(bits)}  broadcast ${bc}\n        ether ${me.mac}  txqueuelen 1000  (Ethernet)\n        RX packets 184211  bytes 211233871 (201.4 MiB)\n        TX packets 90312  bytes 11099021 (10.5 MiB)\n\nlo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n        loop  txqueuelen 1000  (Local Loopback)\n`);
  };
  C.arp = (sh, args, io) => {
    if (!needNet(sh, io, 'arp')) return 1;
    const me = sh.net.me();
    Object.entries(sh.net.hosts).forEach(([k, h]) => {
      if (h === me || h.down || !h.mac || !sh.net.sameSubnet(me.ip, h.ip, h.prefix || 24)) return;
      if (args.includes('-n')) io.out(`${h.ip} dev ${me.iface || 'eth0'} lladdr ${h.mac} REACHABLE\n`);
      else io.out(`${args.includes('-a') && h.names && h.names[0] ? h.names[0] : '?'} (${h.ip}) at ${h.mac} [ether] on ${me.iface || 'eth0'}\n`);
    });
  };
  const oldHostname = C.hostname;
  C.hostname = (sh, args, io) => {
    if (args.includes('-I') && sh.net) { io.out(sh.net.me().ip + ' \n'); return 0; }
    return oldHostname(sh, args, io);
  };
  C.tcpdump = (sh, args, io) => {
    if (sh.user !== 'root') { io.err('tcpdump: eth0: You don\'t have permission to perform this capture on that device\n(socket: Operation not permitted)\n'); return 1; }
    const cap = (sh.net && sh.net.spec.capture) || [];
    const filt = args.filter(a => !a.startsWith('-')).join(' ').toLowerCase();
    io.out(`tcpdump: verbose output suppressed, use -v[v]... for full protocol decode\nlistening on ${sh.net ? sh.net.me().iface || 'eth0' : 'eth0'}, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n`);
    let n = 0;
    cap.forEach(l => {
      const low = l.toLowerCase();
      const words = filt.split(/\s+/).filter(w => w && !['and', 'or', 'not', 'src', 'dst', 'host', 'port', 'tcp', 'udp', 'icmp', 'eth0', 'any', '-i', 'net'].includes(w));
      const wantProto = ['tcp', 'udp', 'icmp'].filter(p => filt.split(/\s+/).includes(p));
      const protoOk = !wantProto.length || wantProto.some(p => (p === 'icmp' ? /icmp/.test(low) : p === 'udp' ? /udp|\.53:/.test(low) : /flags \[/.test(low)));
      if (protoOk && words.every(w => low.includes(w))) { io.out(l + '\n'); n++; }
    });
    io.out(`\n${n} packets captured\n${n} packets received by filter\n0 packets dropped by kernel\n`);
  };
})();

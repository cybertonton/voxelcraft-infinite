/* Synthetic packet capture builder + Wireshark-style display filter.
 * Packets carry real bytes (Ethernet / IPv4 / TCP / UDP / ICMP / ARP / DNS) so the hex dump
 * matches the decoded fields. Scenarios live in pcap-scenarios.js. */
const PS = (globalThis.PS = globalThis.PS || {});

PS.pcap = (function () {
  const ipBytes = ip => ip.split('.').map(Number);
  const macBytes = m => m.split(':').map(x => parseInt(x, 16));
  const u16 = n => [(n >> 8) & 255, n & 255];
  const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const ascii = s => Array.from(s, c => c.charCodeAt(0) & 255);
  const checksum = bytes => {
    let sum = 0;
    for (let i = 0; i < bytes.length; i += 2) sum += (bytes[i] << 8) + (bytes[i + 1] || 0);
    while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
    return (~sum) & 0xffff;
  };
  const FLAG_BITS = { F: 0x01, S: 0x02, R: 0x04, P: 0x08, A: 0x10 };
  const flagNames = f => { const n = []; if (f & 2) n.push('SYN'); if (f & 1) n.push('FIN'); if (f & 4) n.push('RST'); if (f & 8) n.push('PSH'); if (f & 16) n.push('ACK'); return n; };

  function dnsPayload(d) {
    const q = [];
    d.qname.split('.').forEach(l => { q.push(l.length, ...ascii(l)); }); q.push(0);
    const out = [...u16(d.id), ...u16(d.response ? 0x8180 : 0x0100), ...u16(1), ...u16(d.response ? (d.answers || []).length : 0), ...u16(0), ...u16(0), ...q, ...u16(1), ...u16(1)];
    if (d.response) (d.answers || []).forEach(a => out.push(0xc0, 0x0c, ...u16(1), ...u16(1), ...u32(300), ...u16(4), ...ipBytes(a)));
    return out;
  }

  /** Build one packet from a descriptor. macs maps IP -> MAC. */
  function build(no, time, d, macs) {
    const pk = { no, time, layers: [], text: '' };
    const flat = { protos: new Set(['eth']) };
    const src = d.src, dst = d.dst;

    if (d.k === 'arp') {
      const sha = macs[src], spa = src, tha = d.op === 'reply' ? macs[dst] : '00:00:00:00:00:00', tpa = dst;
      const dstMac = d.op === 'reply' ? macs[dst] : 'ff:ff:ff:ff:ff:ff';
      const body = [...u16(1), ...u16(0x0800), 6, 4, ...u16(d.op === 'reply' ? 2 : 1), ...macBytes(sha), ...ipBytes(spa), ...macBytes(tha), ...ipBytes(tpa)];
      const bytes = [...macBytes(dstMac), ...macBytes(sha), ...u16(0x0806), ...body];
      pk.src = sha; pk.dst = d.op === 'reply' ? dstMac : 'Broadcast'; pk.proto = 'ARP';
      pk.info = d.op === 'reply' ? `${spa} is at ${sha}` : `Who has ${tpa}? Tell ${spa}`;
      pk.layers = [
        { name: 'Ethernet II', summary: `Src: ${sha}, Dst: ${dstMac}`, fields: [['Destination', dstMac], ['Source', sha], ['Type', 'ARP (0x0806)']] },
        { name: 'Address Resolution Protocol', summary: d.op === 'reply' ? '(reply)' : '(request)', fields: [['Hardware type', 'Ethernet (1)'], ['Protocol type', 'IPv4 (0x0800)'], ['Opcode', d.op === 'reply' ? 'reply (2)' : 'request (1)'], ['Sender MAC address', sha], ['Sender IP address', spa], ['Target MAC address', tha], ['Target IP address', tpa]] },
      ];
      flat.protos.add('arp'); flat['arp.opcode'] = d.op === 'reply' ? 2 : 1; flat['eth.src'] = sha; flat['eth.dst'] = dstMac;
      pk.text = pk.info;
      return finish(pk, bytes, flat);
    }

    let l4, proto, l4Layer, appLayer = null, info = '', protoName;
    if (d.k === 'tcp') {
      proto = 6;
      const fl = d.flags.split('').reduce((a, c) => a | FLAG_BITS[c], 0);
      const payload = ascii(d.payload || '');
      l4 = [...u16(d.sport), ...u16(d.dport), ...u32(d.seq), ...u32(d.ack || 0), ...u16((5 << 12) | fl), ...u16(d.win || 64240), ...u16(0), ...u16(0), ...payload];
      protoName = 'TCP';
      const fn = flagNames(fl);
      info = `${d.sport} → ${d.dport} [${fn.join(', ')}] Seq=${d.seq}${fl & 16 ? ` Ack=${d.ack}` : ''} Win=${d.win || 64240} Len=${payload.length}`;
      l4Layer = { name: 'Transmission Control Protocol', summary: `Src Port: ${d.sport}, Dst Port: ${d.dport}, Seq: ${d.seq}, Len: ${payload.length}`, fields: [['Source Port', d.sport], ['Destination Port', d.dport], ['Sequence Number', d.seq], ['Acknowledgment Number', d.ack || 0], ['Flags', `0x${PS.hex(fl, 3)} (${fn.join(', ')})`], ['Window', d.win || 64240], ['Checksum', '0x0000 [unverified]']] };
      Object.assign(flat, { 'tcp.srcport': d.sport, 'tcp.dstport': d.dport, 'tcp.port': [d.sport, d.dport], 'tcp.flags.syn': fl & 2 ? 1 : 0, 'tcp.flags.ack': fl & 16 ? 1 : 0, 'tcp.flags.fin': fl & 1 ? 1 : 0, 'tcp.flags.reset': fl & 4 ? 1 : 0, 'tcp.flags.push': fl & 8 ? 1 : 0, 'tcp.seq': d.seq, 'tcp.len': payload.length });
      flat.protos.add('tcp');
      if (d.payload) {
        const txt = d.payload;
        const rq = /^(GET|POST|HEAD) (\S+) HTTP\/1\.[01]/.exec(txt), rs = /^HTTP\/1\.[01] (\d{3}) ([^\r\n]*)/.exec(txt);
        if (rq || rs) {
          protoName = 'HTTP'; flat.protos.add('http');
          const hostM = /Host: ([^\r\n]+)/i.exec(txt), ctM = /Content-Type: ([^\r\n]+)/i.exec(txt);
          if (rq) { Object.assign(flat, { 'http.request.method': rq[1], 'http.request.uri': rq[2], 'http.host': hostM ? hostM[1] : '' }); info = `${rq[1]} ${rq[2]} HTTP/1.1${rq[1] === 'POST' && ctM ? '  (' + ctM[1] + ')' : ''}`; }
          else { flat['http.response.code'] = +rs[1]; info = `HTTP/1.1 ${rs[1]} ${rs[2]}${ctM ? '  (' + ctM[1].split(';')[0] + ')' : ''}`; }
          const [head, body] = txt.split('\r\n\r\n');
          appLayer = { name: 'Hypertext Transfer Protocol', summary: head.split('\r\n')[0], fields: head.split('\r\n').map((l, i) => (i === 0 ? ['Start line', l] : [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()])) };
          if (body) appLayer.fields.push(['Message body', body]);
        }
        flat.payload = txt;
      }
    } else if (d.k === 'dns') {
      proto = 17;
      const app = dnsPayload(d);
      l4 = [...u16(d.sport), ...u16(d.dport), ...u16(8 + app.length), ...u16(0), ...app];
      protoName = 'DNS';
      info = d.response ? `Standard query response 0x${PS.hex(d.id, 4)} A ${d.qname}${(d.answers || []).map(a => ' A ' + a).join('')}` : `Standard query 0x${PS.hex(d.id, 4)} A ${d.qname}`;
      l4Layer = { name: 'User Datagram Protocol', summary: `Src Port: ${d.sport}, Dst Port: ${d.dport}`, fields: [['Source Port', d.sport], ['Destination Port', d.dport], ['Length', 8 + app.length], ['Checksum', '0x0000 [unverified]']] };
      Object.assign(flat, { 'udp.srcport': d.sport, 'udp.dstport': d.dport, 'udp.port': [d.sport, d.dport], 'dns.qry.name': d.qname, 'dns.flags.response': d.response ? 1 : 0 });
      flat.protos.add('udp'); flat.protos.add('dns');
      appLayer = { name: 'Domain Name System', summary: d.response ? '(response)' : '(query)', fields: [['Transaction ID', `0x${PS.hex(d.id, 4)}`], ['Flags', d.response ? '0x8180 Standard query response, No error' : '0x0100 Standard query'], ['Questions', 1], ['Answer RRs', d.response ? (d.answers || []).length : 0], ['Queries', `${d.qname}: type A, class IN`], ...(d.response ? (d.answers || []).map(a => ['Answer', `${d.qname}: type A, class IN, addr ${a}`]) : [])] };
    } else if (d.k === 'icmp') {
      proto = 1;
      const head = [d.type, 0, 0, 0, ...u16(d.id), ...u16(d.seq)];
      const data = ascii('abcdefghijklmnopqrstuvwabcdefghi');
      const ck = checksum([...head, ...data]); head[2] = ck >> 8; head[3] = ck & 255;
      l4 = [...head, ...data]; protoName = 'ICMP';
      info = `${d.type === 8 ? 'Echo (ping) request' : 'Echo (ping) reply'}  id=0x${PS.hex(d.id, 4)}, seq=${d.seq}, ttl=${d.ttl || 64}`;
      l4Layer = { name: 'Internet Control Message Protocol', summary: d.type === 8 ? 'Echo (ping) request' : 'Echo (ping) reply', fields: [['Type', d.type === 8 ? '8 (Echo (ping) request)' : '0 (Echo (ping) reply)'], ['Code', 0], ['Identifier', `0x${PS.hex(d.id, 4)}`], ['Sequence Number', d.seq]] };
      flat['icmp.type'] = d.type; flat.protos.add('icmp');
    } else throw new Error('unknown packet kind ' + d.k);

    const total = 20 + l4.length;
    const iph = [0x45, 0, ...u16(total), ...u16(0x1c00 + no * 7), 0x40, 0, d.ttl || 64, proto, 0, 0, ...ipBytes(src), ...ipBytes(dst)];
    const ck = checksum(iph); iph[10] = ck >> 8; iph[11] = ck & 255;
    const bytes = [...macBytes(macs[dst]), ...macBytes(macs[src]), ...u16(0x0800), ...iph, ...l4];
    pk.src = src; pk.dst = dst; pk.proto = protoName; pk.info = info;
    pk.layers = [
      { name: 'Ethernet II', summary: `Src: ${macs[src]}, Dst: ${macs[dst]}`, fields: [['Destination', macs[dst]], ['Source', macs[src]], ['Type', 'IPv4 (0x0800)']] },
      { name: 'Internet Protocol Version 4', summary: `Src: ${src}, Dst: ${dst}`, fields: [['Version', 4], ['Header Length', '20 bytes'], ['Total Length', total], ['Time to Live', d.ttl || 64], ['Protocol', proto === 6 ? 'TCP (6)' : proto === 17 ? 'UDP (17)' : 'ICMP (1)'], ['Header Checksum', `0x${PS.hex(ck, 4)}`], ['Source Address', src], ['Destination Address', dst]] },
      l4Layer,
    ];
    if (appLayer) pk.layers.push(appLayer);
    Object.assign(flat, { 'ip.src': src, 'ip.dst': dst, 'ip.addr': [src, dst], 'ip.ttl': d.ttl || 64, 'eth.src': macs[src], 'eth.dst': macs[dst] });
    flat.protos.add('ip');
    pk.text = (flat.payload || '') + ' ' + info;
    return finish(pk, bytes, flat);
  }

  function finish(pk, bytes, flat) {
    pk.bytes = bytes; pk.len = bytes.length; flat['frame.len'] = bytes.length; flat.frame = pk.text; pk.flat = flat;
    return pk;
  }

  function capture(macs, list, t0 = 0) {
    let t = t0;
    return list.map((d, i) => { t += d.dt != null ? d.dt : 0.0004 + ((i * 37) % 11) / 4000; return build(i + 1, t, d, macs); });
  }

  function hexdump(bytes) {
    const rows = [];
    for (let o = 0; o < bytes.length; o += 16) {
      const r = bytes.slice(o, o + 16);
      rows.push({ off: PS.hex(o, 4), hex: r.map(b => PS.hex(b)).join(' ').padEnd(47), asc: r.map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('') });
    }
    return rows;
  }

  /** Wireshark-like display filter: ip.addr == x, tcp.port == 80, http, dns, !arp, frame contains "text", && || ( ) */
  function compileFilter(expr) {
    expr = (expr || '').trim();
    if (!expr) return () => true;
    const toks = [];
    const re = /\s*("(?:[^"\\]|\\.)*"|==|!=|>=|<=|&&|\|\||[()!<>]|[A-Za-z0-9_.:/-]+)/y;
    let pos = 0;
    while (pos < expr.length) {
      re.lastIndex = pos;
      const m = re.exec(expr);
      if (!m) throw new Error('Filter syntax error near "' + expr.slice(pos, pos + 8) + '"');
      toks.push(m[1]); pos = re.lastIndex;
    }
    let p = 0;
    const peek = () => toks[p];
    const parseOr = () => { let l = parseAnd(); while (peek() === '||' || peek() === 'or') { p++; const a = l, r = parseAnd(); l = pk => a(pk) || r(pk); } return l; };
    const parseAnd = () => { let l = parseNot(); while (peek() === '&&' || peek() === 'and') { p++; const a = l, r = parseNot(); l = pk => a(pk) && r(pk); } return l; };
    const parseNot = () => { if (peek() === '!' || peek() === 'not') { p++; const e = parseNot(); return pk => !e(pk); } return parseAtom(); };
    const parseAtom = () => {
      if (peek() === '(') { p++; const e = parseOr(); if (toks[p++] !== ')') throw new Error('Missing )'); return e; }
      const field = toks[p++];
      if (field === undefined) throw new Error('Filter syntax error');
      const op = peek();
      if (['==', '!=', '>', '<', '>=', '<=', 'contains', 'matches'].includes(op)) {
        p++;
        let val = toks[p++];
        if (val === undefined) throw new Error('Missing value');
        if (val[0] === '"') val = val.slice(1, -1);
        return pk => {
          const raw = pk.flat[field];
          if (raw === undefined) return op === '!=';
          const vals = Array.isArray(raw) ? raw : [raw];
          const cmp = v => {
            switch (op) {
              case '==': return String(v).toLowerCase() === String(val).toLowerCase();
              case '!=': return String(v).toLowerCase() !== String(val).toLowerCase();
              case '>': return +v > +val; case '<': return +v < +val; case '>=': return +v >= +val; case '<=': return +v <= +val;
              case 'contains': return String(v).toLowerCase().includes(val.toLowerCase());
              default: try { return new RegExp(val, 'i').test(String(v)); } catch (e) { return false; }
            }
          };
          return op === '!=' ? vals.every(cmp) : vals.some(cmp);
        };
      }
      return pk => pk.flat.protos.has(field.toLowerCase()) || (pk.flat[field] !== undefined && pk.flat[field] !== 0);
    };
    const f = parseOr();
    if (p < toks.length) throw new Error('Filter syntax error near "' + toks[p] + '"');
    return f;
  }

  return { build, capture, hexdump, compileFilter, scenarios: {} };
})();

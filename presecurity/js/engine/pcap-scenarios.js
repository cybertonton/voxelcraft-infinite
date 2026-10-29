/* Everyday traffic captures used in the packet-analysis lesson (DNS, TCP handshake, HTTP, ping). */
const PS = (globalThis.PS = globalThis.PS || {});

(function () {
  const S = PS.pcap.scenarios;

  S.webvisit = (function () {
    const C = '192.168.1.50', G = '192.168.1.1', W = '203.0.113.80';
    const macs = { [C]: '08:00:27:4b:1a:50', [G]: '52:54:00:12:35:01', [W]: '52:54:00:12:35:01' };
    const req1 = 'GET /index.html HTTP/1.1\r\nHost: www.example.test\r\nUser-Agent: Mozilla/5.0 (X11; Linux x86_64) Firefox/118.0\r\nAccept: text/html\r\nConnection: keep-alive\r\n\r\n';
    const page = '<html><head><title>Example Portal</title></head><body><h1>Welcome</h1><form method="post" action="/feedback"><input name="name"><input name="message"></form></body></html>';
    const res1 = `HTTP/1.1 200 OK\r\nServer: Apache/2.4.29 (Ubuntu)\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: ${page.length}\r\n\r\n${page}`;
    const form = 'name=Aysel&message=Salam+komanda';
    const req2 = `POST /feedback HTTP/1.1\r\nHost: www.example.test\r\nUser-Agent: Mozilla/5.0 (X11; Linux x86_64) Firefox/118.0\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${form.length}\r\n\r\n${form}`;
    const res2 = 'HTTP/1.1 200 OK\r\nServer: Apache/2.4.29 (Ubuntu)\r\nContent-Type: text/plain\r\nContent-Length: 12\r\n\r\nThank you!\r\n';
    const t = (src, dst, sport, dport, flags, seq, ack, payload) => ({ k: 'tcp', src, dst, sport, dport, flags, seq, ack, payload, ttl: src === C ? 64 : 52 });
    const a = req1.length, b = res1.length, c = req2.length, d = res2.length;
    const list = [
      { k: 'arp', op: 'request', src: C, dst: G },
      { k: 'arp', op: 'reply', src: G, dst: C },
      { k: 'dns', src: C, dst: G, sport: 53211, dport: 53, id: 0x1a2b, qname: 'www.example.test' },
      { k: 'dns', src: G, dst: C, sport: 53, dport: 53211, id: 0x1a2b, qname: 'www.example.test', response: true, answers: [W] },
      t(C, W, 49152, 80, 'S', 0, 0), t(W, C, 80, 49152, 'SA', 0, 1), t(C, W, 49152, 80, 'A', 1, 1),
      t(C, W, 49152, 80, 'PA', 1, 1, req1),
      t(W, C, 80, 49152, 'A', 1, 1 + a),
      t(W, C, 80, 49152, 'PA', 1, 1 + a, res1),
      t(C, W, 49152, 80, 'A', 1 + a, 1 + b),
      t(C, W, 49152, 80, 'PA', 1 + a, 1 + b, req2),
      t(W, C, 80, 49152, 'PA', 1 + b, 1 + a + c, res2),
      t(C, W, 49152, 80, 'FA', 1 + a + c, 1 + b + d),
      t(W, C, 80, 49152, 'FA', 1 + b + d, 2 + a + c),
      t(C, W, 49152, 80, 'A', 2 + a + c, 2 + b + d),
    ];
    return { id: 'webvisit', title: 'web-visit.pcap', desc: 'Ofis kompüteri (192.168.1.50) sayta daxil olur və rəy formu göndərir.', packets: PS.pcap.capture(macs, list) };
  })();

  S.pingdns = (function () {
    const C = '192.168.1.50', G = '192.168.1.1', H = '10.0.0.8';
    const macs = { [C]: '08:00:27:4b:1a:50', [G]: '52:54:00:12:35:01', [H]: '52:54:00:12:35:01' };
    const list = [
      { k: 'dns', src: C, dst: G, sport: 41872, dport: 53, id: 0x77aa, qname: 'files.corp.test' },
      { k: 'dns', src: G, dst: C, sport: 53, dport: 41872, id: 0x77aa, qname: 'files.corp.test', response: true, answers: [H] },
    ];
    for (let i = 1; i <= 4; i++) {
      list.push({ k: 'icmp', src: C, dst: H, type: 8, id: 0x0b01, seq: i, ttl: 64, dt: i === 1 ? 0.002 : 0.998 });
      list.push({ k: 'icmp', src: H, dst: C, type: 0, id: 0x0b01, seq: i, ttl: 62, dt: 0.0013 });
    }
    return { id: 'pingdns', title: 'ping-dns.pcap', desc: 'Əvvəl ad IP-yə çevrilir, sonra ping göndərilir.', packets: PS.pcap.capture(macs, list, 50) };
  })();
})();

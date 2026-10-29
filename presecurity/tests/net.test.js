const assert = require('assert');
['core/util','core/hash','engine/vfs','engine/shell','engine/coreutils','engine/awk','engine/sysutils','engine/netsim'].forEach(f => require('../js/' + f + '.js'));
const spec = {
  hosts: {
    kali: { ip: '10.10.5.10', mac: '08:00:27:aa:bb:01', gw: '10.10.5.1', dns: '10.10.5.1' },
    gateway: { ip: '10.10.5.1', mac: '08:00:27:aa:bb:02', names: ['gateway.lab.test'], ports: { 53: { svc: 'domain', ver: 'dnsmasq 2.80' }, 80: { svc: 'http', ver: 'lighttpd' } } },
    web01: { ip: '10.10.5.20', mac: '08:00:27:aa:bb:20', names: ['shop.example.test'], os: 'Linux 4.15 - 5.8', route: [{ ip: '10.10.5.1', name: 'gateway' }, { ip: '10.10.0.1', hidden: true }],
      ports: { 22: { svc: 'ssh', ver: 'OpenSSH 7.6p1 Ubuntu 4ubuntu0.7', banner: 'SSH-2.0-OpenSSH_7.6p1 Ubuntu-4ubuntu0.7' }, 80: { svc: 'http', ver: 'nginx 1.14.0 (Ubuntu)', title: 'ShopLab' }, 3306: { state: 'filtered', svc: 'mysql' } },
      http: { '/': { status: 200, headers: { 'Content-Type': 'text/html', Server: 'nginx/1.14.0' }, body: '<html><title>ShopLab</title>hi</html>' }, '/old': { status: 301, headers: { Location: '/' }, body: '' } },
      serverHeader: 'nginx/1.14.0' },
  },
  dns: { 'example.test': { A: ['10.10.5.20'], MX: [{ pri: 10, host: 'mail.example.test' }], TXT: ['v=spf1 -all'], NS: ['ns1.example.test'] } },
};
const net = new PS.Net(spec, 'kali');
const vfs = new PS.VFS();
const sh = new PS.Shell({ vfs, net, user: 'root', host: 'kali', users: { root: { uid: 0, home: '/root', groups: ['root'] } } });
const t = (cmd, includes) => { const r = sh.exec(cmd); (Array.isArray(includes) ? includes : [includes]).forEach(i => assert((r.out + r.err).includes(i), `${cmd} should include "${i}":\n${r.out}${r.err}`)); return r; };
t('ping -c 2 shop.example.test', ['PING shop.example.test (10.10.5.20)', 'ttl=62', '2 received', '0% packet loss']);
t('ping -c1 nope.test', 'Name or service not known');
t('traceroute shop.example.test', ['gateway (10.10.5.1)', ' 2  * * *', 'shop.example.test (10.10.5.20)']);
t('nslookup shop.example.test', ['Address: 10.10.5.20', 'Server:']);
t('nslookup -type=MX example.test', 'mail exchanger = 10 mail.example.test.');
t('nslookup nope.test', 'NXDOMAIN');
t('dig example.test TXT', ['ANSWER SECTION', '"v=spf1 -all"', 'status: NOERROR']);
t('dig +short example.test', '10.10.5.20');
t('host shop.example.test', 'has address 10.10.5.20');
t('nmap -sn 10.10.5.0/24', ['gateway.lab.test (10.10.5.1)', 'shop.example.test (10.10.5.20)', '(3 hosts up)']);
t('nmap -sV shop.example.test', ['22/tcp   open     ssh', 'OpenSSH 7.6p1', '3306/tcp filtered mysql', 'Not shown: 997 closed']);
t('nmap -p 80,81 10.10.5.20', ['80/tcp   open   http', '81/tcp   closed']);
t('nmap -A 10.10.5.20', ['http-title: ShopLab', 'OS details: Linux 4.15 - 5.8']);
t('curl -i http://shop.example.test/', ['HTTP/1.1 200 OK', 'Server: nginx/1.14.0', '<title>ShopLab</title>']);
t('curl -I shop.example.test', ['HTTP/1.1 200 OK']);
t('curl -sL shop.example.test/old', 'ShopLab');
t('curl shop.example.test:81', 'Connection refused');
t('curl http://10.10.5.20:3306/', 'timed out');
t('curl -v shop.example.test/ | head -3', 'Trying 10.10.5.20');
t('echo -e "HEAD / HTTP/1.0\\n" | nc shop.example.test 80', 'HTTP/1.1 200 OK');
t('nc shop.example.test 22', 'SSH-2.0-OpenSSH_7.6p1');
t('nc -zv shop.example.test 22', 'succeeded');
t('ip a', 'inet 10.10.5.10/24');
t('arp -a', '(10.10.5.20) at 08:00:27:aa:bb:20');
t('wget -q shop.example.test -O page.html; cat page.html', 'ShopLab');
const u = new PS.Shell({ net, user: 'bob', users: { bob: { uid: 1000, home: '/home/bob', groups: ['bob'] } } });
assert(u.exec('nmap -O 10.10.5.20').err.includes('requires root'));
console.log('net OK');

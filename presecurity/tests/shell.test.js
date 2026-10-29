const assert = require('assert');
['core/util','core/hash','engine/vfs','engine/shell','engine/coreutils','engine/awk'].forEach(f => require('../js/' + f + '.js'));
const mk = () => {
  const vfs = new PS.VFS().load({
    '/home/analyst/notes.txt': 'alpha\nbeta\ngamma\nbeta\n',
    '/home/analyst/docs/readme.md': 'hello world\n',
    '/home/analyst/.secret': 'hidden\n',
    '/var/log/access.log': [
      '203.0.113.5 - - [14/Oct/2025:09:00:01 +0000] "GET / HTTP/1.1" 200 512',
      '203.0.113.5 - - [14/Oct/2025:09:00:02 +0000] "GET /admin HTTP/1.1" 404 120',
      '198.51.100.7 - - [14/Oct/2025:09:00:03 +0000] "POST /login HTTP/1.1" 401 99',
      '198.51.100.7 - - [14/Oct/2025:09:00:04 +0000] "POST /login HTTP/1.1" 401 99',
      '198.51.100.7 - - [14/Oct/2025:09:00:05 +0000] "POST /login HTTP/1.1" 200 1500',
    ].join('\n') + '\n',
    '/root/flag.txt': { c: 'FLAG{root}\n', mode: 0o600 },
    '/usr/bin/su': { c: 'x', mode: 0o4755 },
  });
  return new PS.Shell({ vfs, user: 'analyst', host: 'srv', users: { analyst: { uid: 1000, home: '/home/analyst', groups: ['analyst', 'sudo'] }, root: { uid: 0, home: '/root', groups: ['root'] } }, sudoers: ['analyst'] });
};
const sh = mk();
const t = (cmd, expectOut, expectErr) => {
  const r = sh.exec(cmd);
  if (expectOut !== undefined) assert.strictEqual(r.out, expectOut, `${cmd}\n--got--\n${r.out}\n--err--\n${r.err}`);
  if (expectErr !== undefined) assert(r.err.includes(expectErr), `${cmd} stderr: ${r.err}`);
  return r;
};
t('pwd', '/home/analyst\n');
t('ls', 'docs  notes.txt\n');
assert(t('ls -la').out.includes('.secret'));
t('cat notes.txt | sort | uniq -c', '      1 alpha\n      2 beta\n      1 gamma\n');
t('grep -c beta notes.txt', '2\n');
t('grep -n beta notes.txt', '2:beta\n4:beta\n');
t('cat /root/flag.txt', '', 'Permission denied');
t('sudo cat /root/flag.txt', 'FLAG{root}\n');
t("awk '{print $1}' /var/log/access.log | sort | uniq -c | sort -nr", '      3 198.51.100.7\n      2 203.0.113.5\n');
t("awk '$9 == 401 {print $1}' /var/log/access.log | wc -l", '2\n');
t("awk '{c[$1]++} END {for (k in c) print c[k], k}' /var/log/access.log | sort -nr", '3 198.51.100.7\n2 203.0.113.5\n');
t("awk '{s+=$10} END {print s}' /var/log/access.log", '2330\n');
t("awk -F'\"' '{print $2}' /var/log/access.log | head -1", 'GET / HTTP/1.1\n');
t('echo hello > out.txt; cat out.txt', 'hello\n');
t('echo more >> out.txt; wc -l out.txt', '2 out.txt\n');
t('ls nope', '', 'cannot access');
t('find / -perm -4000 -type f 2>/dev/null', '/usr/bin/su\n');
t('find /home -name "*.md"', '/home/analyst/docs/readme.md\n');
t('echo salam | base64', 'c2FsYW0K\n');
t('echo c2FsYW0K | base64 -d', 'salam\n');
t('echo uryyb | tr "a-zA-Z" "n-za-mN-ZA-M"', 'hello\n');
t('md5sum notes.txt | cut -c1-8', PS.hash.md5('alpha\nbeta\ngamma\nbeta\n').slice(0, 8) + '\n');
t('echo $(whoami)-$HOME', 'analyst-/home/analyst\n');
t('ls *.txt', 'notes.txt  out.txt\n');
t('chmod 600 notes.txt && ls -l notes.txt | cut -c1-10', '-rw-------\n');
t('sed "s/beta/BETA/g" notes.txt | head -2', 'alpha\nBETA\n');
t('false || echo ok; true && echo yes', 'ok\nyes\n');
t('cd /nonexistent', '', 'No such file');
t('cd docs && pwd', '/home/analyst/docs\n'); t('cd', undefined);
t('id', 'uid=1000(analyst) gid=1000(analyst) groups=1000(analyst),27(sudo)\n');
t('foo', '', 'command not found');
t('grep -E "401|404" /var/log/access.log -c', '3\n');
t("grep -i POST /var/log/access.log | awk '{print $7, $9}' | sort -u", '/login 200\n/login 401\n');
t('printf "a\\nb\\n" | wc -l', '2\n');
t('head -n 2 /var/log/access.log | tail -n 1 | cut -d" " -f1', '203.0.113.5\n');
t("echo 'a b c' | awk '{print NF, $NF}'", '3 c\n');
t("echo '1 2' | awk '{printf \"%d-%s\\n\", $1+$2, \"x\"}'", '3-x\n');
console.log('shell OK');

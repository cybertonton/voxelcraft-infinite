/* System-inspection commands: ps, kill, ss/netstat, systemctl, crontab, last, df, free ... */
const PS = (globalThis.PS = globalThis.PS || {});
(function () {
  const C = PS.Shell.commands;
  const opts = PS.Shell.opts;

  const procRow = p => ({ pid: 1, user: 'root', cpu: 0.0, mem: 0.1, vsz: 16800, rss: 1200, tty: '?', stat: 'Ss', start: 'Oct02', time: '0:00', ppid: 1, cmd: '', ...p });

  C.ps = (sh, args, io) => {
    const raw = args.join(' ');
    const procs = sh.procs.map(procRow);
    if (/aux|-ef|-e\b|-A/.test(raw)) {
      if (/-ef/.test(raw)) {
        io.out('UID          PID    PPID  C STIME TTY          TIME CMD\n');
        procs.forEach(p => io.out(`${p.user.padEnd(8)} ${String(p.pid).padStart(7)} ${String(p.ppid).padStart(7)}  0 ${p.start.padEnd(5)} ${p.tty.padEnd(8)} ${('00:' + p.time.padStart(5, '0')).padStart(8)} ${p.cmd}\n`));
      } else {
        io.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n');
        procs.forEach(p => io.out(`${p.user.slice(0, 8).padEnd(8)} ${String(p.pid).padStart(6)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${String(p.vsz).padStart(6)} ${String(p.rss).padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${p.start.padEnd(7)} ${p.time.padStart(4)} ${p.cmd}\n`));
      }
      return 0;
    }
    io.out('    PID TTY          TIME CMD\n');
    io.out('   2301 pts/0    00:00:00 bash\n');
    io.out('   2388 pts/0    00:00:00 ps\n');
  };
  C.top = (sh, args, io) => {
    const procs = sh.procs.map(procRow).sort((a, b) => b.cpu - a.cpu).slice(0, 12);
    io.out(`top - ${sh.now.toISOString().slice(11, 19)} up ${sh.data.uptime || '12 days,  3:41'},  2 users,  load average: ${sh.data.load || '0.08, 0.12, 0.09'}\n`);
    io.out(`Tasks: ${String(sh.procs.length + 60).padStart(3)} total,   1 running\n%Cpu(s): ${sh.data.cpu || ' 2.3'} us,  0.7 sy,  0.0 ni, 96.9 id\nMiB Mem :   3924.0 total,   1203.2 free,   1100.4 used\n\n`);
    io.out('    PID USER      PR  NI    VIRT    RES  %CPU  %MEM     TIME+ COMMAND\n');
    procs.forEach(p => io.out(`${String(p.pid).padStart(7)} ${p.user.padEnd(9)} 20   0 ${String(p.vsz).padStart(7)} ${String(p.rss).padStart(6)} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)} ${p.time.padStart(9)} ${p.cmd.split(' ')[0].split('/').pop()}\n`));
  };
  C.kill = (sh, args, io) => {
    const { r } = opts(args.filter(a => !/^-\d+$|^-[A-Z]+$/.test(a)));
    let code = 0;
    r.forEach(pid => {
      const i = sh.procs.findIndex(p => String(p.pid) === pid);
      if (i < 0) { io.err(`bash: kill: (${pid}) - No such process\n`); code = 1; return; }
      const p = sh.procs[i];
      if (sh.user !== 'root' && p.user !== sh.user) { io.err(`bash: kill: (${pid}) - Operation not permitted\n`); code = 1; return; }
      sh.procs.splice(i, 1);
      sh.hooks.killed && sh.hooks.killed(p, sh);
    });
    return code;
  };
  C.pkill = C.killall = (sh, args, io) => {
    const name = opts(args).r[0]; let hit = 0;
    sh.procs.slice().forEach(p => { if (p.cmd.split(' ')[0].split('/').pop() === name && (sh.user === 'root' || p.user === sh.user)) { sh.procs.splice(sh.procs.indexOf(p), 1); hit++; sh.hooks.killed && sh.hooks.killed(p, sh); } });
    if (!hit) { io.err(`${name}: no process found\n`); return 1; }
  };

  function sockets(sh) {
    if (sh.sockets) return sh.sockets;
    const me = sh.net && sh.net.me();
    if (!me) return [];
    return Object.entries(me.ports || {}).filter(([, v]) => v.state === 'open').map(([port, v]) => ({ proto: 'tcp', local: `0.0.0.0:${port}`, peer: '0.0.0.0:*', state: 'LISTEN', pid: v.pid || 1000 + +port % 900, prog: v.prog || v.svc, user: 'root' }));
  }
  C.netstat = (sh, args, io) => {
    const raw = args.join('');
    const all = /a/.test(raw), listenOnly = /l/.test(raw) || !all, wantP = /p/.test(raw);
    const wantU = /u/.test(raw), wantT = /t/.test(raw) || !/u/.test(raw);
    const rows = sockets(sh).filter(s => (listenOnly ? s.state === 'LISTEN' || s.proto === 'udp' : true) && ((s.proto === 'tcp' && wantT) || (s.proto === 'udp' && (wantU || !/t/.test(raw)))));
    const visible = s => sh.user === 'root' || s.user === sh.user;
    io.out('Active Internet connections ' + (listenOnly ? '(only servers)' : '(servers and established)') + '\n');
    io.out('Proto Recv-Q Send-Q Local Address           Foreign Address         State       ' + (wantP ? 'PID/Program name' : '') + '\n');
    rows.forEach(s => io.out(`${s.proto.padEnd(5)} ${'0'.padStart(6)} ${'0'.padStart(6)} ${s.local.padEnd(23)} ${s.peer.padEnd(23)} ${(s.proto === 'udp' ? '' : s.state).padEnd(11)} ${wantP ? (visible(s) ? `${s.pid}/${s.prog}` : '-') : ''}\n`));
    return 0;
  };
  // ss uses a different column layout than netstat
  C.ss = (sh, args, io) => {
    const raw = args.join('');
    const all = /a/.test(raw), wantP = /p/.test(raw), wantU = /u/.test(raw), wantT = /t/.test(raw) || !wantU;
    const rows = sockets(sh).filter(s => (all || s.state === 'LISTEN' || s.proto === 'udp') && ((s.proto === 'tcp' && wantT) || (s.proto === 'udp' && wantU)));
    const visible = s => sh.user === 'root' || s.user === sh.user;
    io.out('Netid  State   Recv-Q  Send-Q   Local Address:Port    Peer Address:Port  ' + (wantP ? 'Process' : '') + '\n');
    rows.forEach(s => io.out(`${s.proto.padEnd(6)} ${(s.proto === 'udp' ? 'UNCONN' : s.state === 'LISTEN' ? 'LISTEN' : 'ESTAB').padEnd(7)} ${'0'.padEnd(7)} ${'128'.padEnd(8)} ${s.local.padStart(18)}  ${s.peer.padStart(18)}  ${wantP && visible(s) ? `users:(("${s.prog}",pid=${s.pid},fd=3))` : ''}\n`));
    return 0;
  };

  C.systemctl = (sh, args, io) => {
    const { r } = opts(args);
    const [verb, svcRaw] = r;
    const name = (svcRaw || '').replace(/\.service$/, '');
    const svc = sh.services[name];
    if (verb === 'list-units' || verb === 'list-unit-files' || !verb) {
      io.out('UNIT                         LOAD   ACTIVE SUB     DESCRIPTION\n');
      Object.entries(sh.services).forEach(([k, v]) => io.out(`${(k + '.service').padEnd(28)} loaded ${(v.active ? 'active' : 'inactive').padEnd(6)} ${(v.active ? 'running' : 'dead').padEnd(7)} ${v.desc}\n`));
      return 0;
    }
    if (!svc) { io.err(`${verb === 'status' ? '' : 'Failed to ' + verb + ' ' + svcRaw + ': '}Unit ${svcRaw}.service could not be found.\n`); return verb === 'status' ? 4 : 5; }
    if (verb === 'status') {
      io.out(`${svc.active ? '●' : '○'} ${name}.service - ${svc.desc}\n     Loaded: loaded (/lib/systemd/system/${name}.service; ${svc.enabled ? 'enabled' : 'disabled'}; vendor preset: enabled)\n     Active: ${svc.active ? 'active (running)' : 'inactive (dead)'} since Tue 2025-10-14 07:00:01 UTC; 2h 12min ago\n   Main PID: ${svc.pid || 812} (${name})\n`);
      return svc.active ? 0 : 3;
    }
    if (verb === 'is-active') { io.out(svc.active ? 'active\n' : 'inactive\n'); return svc.active ? 0 : 3; }
    if (verb === 'is-enabled') { io.out(svc.enabled ? 'enabled\n' : 'disabled\n'); return svc.enabled ? 0 : 1; }
    if (['start', 'stop', 'restart', 'enable', 'disable'].includes(verb)) {
      if (sh.user !== 'root') { io.err(`Failed to ${verb} ${name}.service: Interactive authentication required.\nSee system logs and 'systemctl status ${name}.service' for details.\n`); return 1; }
      if (verb === 'stop') svc.active = false; if (verb === 'start' || verb === 'restart') svc.active = true;
      if (verb === 'enable') svc.enabled = true; if (verb === 'disable') svc.enabled = false;
      sh.hooks.service && sh.hooks.service(name, verb, sh);
      return 0;
    }
    io.err(`Unknown command verb ${verb}.\n`); return 1;
  };
  C.service = (sh, args, io) => C.systemctl(sh, [args[1] || 'status', args[0]], io);

  C.crontab = (sh, args, io) => {
    const { o } = opts(args, 'u');
    const user = o.u || sh.user;
    if (o.u && sh.user !== 'root') { io.err(`must be privileged to use -u\n`); return 1; }
    if (!o.l) { io.err('crontab: yalnız -l dəstəklənir\n'); return 1; }
    const f = sh.vfs.get(`/var/spool/cron/crontabs/${user}`);
    if (!f) { io.err(`no crontab for ${user}\n`); return 1; }
    io.out(f.data);
  };
  C.last = (sh, args, io) => io.out(sh.data.last || 'reboot   system boot  5.15.0-91-generic Tue Oct  2 06:58   still running\n\nwtmp begins Tue Oct  2 06:58:12 2025\n');
  C.lastb = (sh, args, io) => {
    if (sh.user !== 'root') { io.err('lastb: cannot open /var/log/btmp: Permission denied\n'); return 1; }
    io.out(sh.data.lastb || '\nbtmp begins Tue Oct  2 06:58:12 2025\n');
  };
  C.who = (sh, args, io) => io.out(sh.data.who || `${sh.user}   pts/0        2025-10-14 08:55 (10.10.5.10)\n`);
  C.w = C.who;
  C.df = (sh, args, io) => io.out(sh.data.df || 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        40G   12G   26G  32% /\ntmpfs           2.0G     0  2.0G   0% /dev/shm\n');
  C.free = (sh, args, io) => io.out(sh.data.free || '               total        used        free      shared  buff/cache   available\nMem:           3.8Gi       1.1Gi       1.2Gi        12Mi       1.5Gi       2.4Gi\nSwap:          2.0Gi          0B       2.0Gi\n');
  C.iptables = (sh, args, io) => {
    if (sh.user !== 'root') { io.err("iptables v1.8.7 (nf_tables): Could not fetch rule set generation id: Permission denied (you must be root)\n"); return 4; }
    io.out(sh.data.iptables || 'Chain INPUT (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain FORWARD (policy ACCEPT)\ntarget     prot opt source               destination\n\nChain OUTPUT (policy ACCEPT)\ntarget     prot opt source               destination\n');
  };
  C.ufw = (sh, args, io) => {
    if (sh.user !== 'root') { io.err('ERROR: You need to be root to run this script\n'); return 1; }
    io.out(sh.data.ufw || 'Status: inactive\n');
  };
  C.lsof = (sh, args, io) => {
    io.out('COMMAND   PID     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\n');
    sockets(sh).forEach(s => io.out(`${s.prog.padEnd(9)} ${String(s.pid).padEnd(7)} ${s.user.padEnd(8)} 3u  IPv4  20481      0t0  TCP ${s.local} (${s.state})\n`));
  };
})();

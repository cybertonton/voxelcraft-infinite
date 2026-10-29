/* Core Linux commands for the simulated shell */
const PS = (globalThis.PS = globalThis.PS || {});
(function () {
  const C = PS.Shell.commands;
  const opts = PS.Shell.opts;
  const lines = s => { const a = s.split('\n'); if (a[a.length - 1] === '') a.pop(); return a; };
  const nl = s => (s.endsWith('\n') || s === '' ? s : s + '\n');

  /** gather input texts: [{name, data}] from file args or stdin. Reports errors to io. */
  function inputs(sh, io, files, cmd) {
    if (!files.length) return { list: [{ name: '-', data: io.stdin == null ? '' : io.stdin }], bad: 0 };
    const list = []; let bad = 0;
    for (const f of files) {
      const r = sh.readFile(f);
      if (r.err) { io.err(`${cmd}: ${f}: ${r.err}\n`); bad = 1; } else list.push({ name: f, data: r.data });
    }
    return { list, bad };
  }

  /* ---------------------------------------------------------------- navigation */
  C.pwd = (sh, a, io) => { io.out(sh.cwd + '\n'); };
  C.cd = (sh, args, io) => {
    let t = args[0];
    if (t === undefined || t === '~') t = sh.home;
    else if (t === '-') { t = sh.oldcwd; io.out(t + '\n'); }
    const st = sh.stat(t);
    if (st.err) { io.err(`bash: cd: ${args[0]}: ${st.err}\n`); return 1; }
    if (st.node.t !== 'd') { io.err(`bash: cd: ${args[0]}: Not a directory\n`); return 1; }
    if (!sh.vfs.can(st.node, 1, sh.user, sh.groups)) { io.err(`bash: cd: ${args[0]}: Permission denied\n`); return 1; }
    sh.oldcwd = sh.cwd; sh.cwd = st.abs;
  };

  const human = n => (n < 1024 ? String(n) : n < 1048576 ? (n / 1024).toFixed(1).replace(/\.0$/, '') + 'K' : (n / 1048576).toFixed(1).replace(/\.0$/, '') + 'M');

  function columns(names, width = 80) {
    if (!names.length) return '';
    for (let rows = 1; rows <= names.length; rows++) {
      const cols = Math.ceil(names.length / rows);
      const colW = [];
      for (let c = 0; c < cols; c++) colW.push(Math.max(...names.slice(c * rows, c * rows + rows).map(s => s.length)));
      const total = colW.reduce((a, b) => a + b, 0) + 2 * (cols - 1);
      if (total <= width || rows === names.length) {
        const out = [];
        for (let r = 0; r < rows; r++) {
          let l = '';
          for (let c = 0; c < cols; c++) { const s = names[c * rows + r]; if (s === undefined) continue; l += c === cols - 1 || names[(c + 1) * rows + r] === undefined ? s : s.padEnd(colW[c] + 2); }
          out.push(l);
        }
        return out.join('\n') + '\n';
      }
    }
    return names.join('\n') + '\n';
  }

  C.ls = (sh, args, io) => {
    const { o, r } = opts(args);
    const targets = r.length ? r : ['.'];
    let code = 0;
    const fmtLong = (name, n) => {
      const nlink = n.t === 'd' ? 2 + Object.values(n.c).filter(x => x.t === 'd').length : 1;
      return { nlink, owner: n.owner, group: n.group, size: o.h ? human(sh.vfs.size(n)) : String(sh.vfs.size(n)), mode: PS.VFS.modeString(n), mtime: n.mtime, name: name + (o.F && n.t === 'd' ? '/' : '') };
    };
    const printRows = (rows, blocks) => {
      if (!o.l) { io.out(io.isTTY ? columns(rows.map(x => x.name)) : rows.map(x => x.name).join('\n') + (rows.length ? '\n' : '')); return; }
      const w = k => Math.max(...rows.map(x => String(x[k]).length), 0);
      const wl = w('nlink'), wo = w('owner'), wg = w('group'), ws = w('size');
      if (blocks != null) io.out(`total ${blocks}\n`);
      rows.forEach(x => io.out(`${x.mode} ${String(x.nlink).padStart(wl)} ${x.owner.padEnd(wo)} ${x.group.padEnd(wg)} ${String(x.size).padStart(ws)} ${x.mtime} ${x.name}${x.link || ''}\n`));
    };
    const listDir = (abs, display, header) => {
      const st = sh.stat(abs);
      if (!sh.vfs.can(st.node, 4, sh.user, sh.groups)) { io.err(`ls: cannot open directory '${display}': Permission denied\n`); code = 2; return; }
      if (header) io.out(`${display}:\n`);
      let names = sh.vfs.list(abs);
      const rows = [];
      if (o.a) { rows.push({ ...fmtLong('.', st.node) }); const par = sh.stat(abs + '/..'); rows.push({ ...fmtLong('..', par.node || st.node) }); }
      names = names.filter(k => o.a || !k.startsWith('.'));
      if (o.t) names.sort((x, y) => String(st.node.c[y].mtime).localeCompare(String(st.node.c[x].mtime)));
      names.forEach(k => { const n = st.node.c[k]; const row = fmtLong(k, n); if (n.type === 'link') row.link = ' -> ' + n.target; rows.push(row); });
      if (o.r) rows.reverse();
      const blocks = rows.reduce((s, x) => s + Math.ceil((x.size && !isNaN(+x.size) ? +x.size : 0) / 4096) * 4, 0);
      printRows(rows, blocks);
      if (o.R) names.forEach(k => { if (st.node.c[k].t === 'd') { io.out('\n'); listDir((abs === '/' ? '' : abs) + '/' + k, (display === '.' ? '.' : display) + '/' + k, true); } });
    };
    const files = [];
    targets.forEach((t, idx) => {
      const st = sh.stat(t);
      if (st.err) { io.err(`ls: cannot access '${t}': ${st.err}\n`); code = 2; return; }
      if (st.node.t === 'd' && !o.d) {
        if (files.length) { printRows(files.splice(0)); io.out('\n'); }
        listDir(st.abs, t, targets.length > 1 || o.R);
        if (idx < targets.length - 1) io.out('\n');
      } else files.push(fmtLong(t, st.node));
    });
    if (files.length) printRows(files);
    return code;
  };

  /* ---------------------------------------------------------------- reading */
  C.cat = (sh, args, io) => {
    const { o, r } = opts(args);
    let code = 0, n = 1;
    const emit = d => {
      if (!o.n) { io.out(d); return; }
      lines(d).forEach(l => io.out(`${String(n++).padStart(6)}\t${l}\n`));
    };
    if (!r.length) { emit(io.stdin || ''); return 0; }
    for (const f of r) {
      if (f === '-') { emit(io.stdin || ''); continue; }
      const rd = sh.readFile(f);
      if (rd.err) { io.err(`cat: ${f}: ${rd.err}\n`); code = 1; } else emit(rd.data);
    }
    return code;
  };
  C.less = C.more = C.bat = C.cat;
  C.tac = (sh, args, io) => { const { list, bad } = inputs(sh, io, opts(args).r, 'tac'); list.forEach(x => io.out(lines(x.data).reverse().join('\n') + '\n')); return bad; };

  const headTail = tail => (sh, args, io) => {
    const { o, r } = opts(args, 'nc');
    const cnt = o.num != null ? o.num : o.n != null ? parseInt(o.n, 10) : 10;
    const { list, bad } = inputs(sh, io, r, tail ? 'tail' : 'head');
    list.forEach((x, i) => {
      if (list.length > 1) io.out(`${i ? '\n' : ''}==> ${x.name} <==\n`);
      if (o.c != null) { io.out(tail ? x.data.slice(-o.c) : x.data.slice(0, +o.c)); return; }
      const ls = lines(x.data);
      io.out((tail ? ls.slice(Math.max(0, ls.length - cnt)) : ls.slice(0, cnt)).map(l => l + '\n').join(''));
    });
    return bad;
  };
  C.head = headTail(false);
  C.tail = (sh, a, io) => { if (a.includes('-f')) { io.err('tail: -f (follow) bu simulyatorda dəstəklənmir; son sətirlər üçün tail -n 20 istifadə et\n'); return 1; } return headTail(true)(sh, a, io); };

  C.echo = (sh, args, io) => {
    let n = false, e = false;
    while (args[0] && /^-[neE]+$/.test(args[0])) { if (args[0].includes('n')) n = true; if (args[0].includes('e')) e = true; args = args.slice(1); }
    let s = args.join(' ');
    if (e) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    io.out(s + (n ? '' : '\n'));
  };
  C.printf = (sh, args, io) => {
    let i = 1;
    io.out((args[0] || '').replace(/%([sd%])/g, (m, t) => (t === '%' ? '%' : args[i++] ?? '')).replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
  };
  C.clear = (sh) => { sh.clearFlag = true; };
  C.true = () => 0;
  C.false = () => 1;
  C.sleep = () => 0;
  C.test = C['['] = (sh, args, io) => {
    if (args[args.length - 1] === ']') args = args.slice(0, -1);
    const [a, b, c] = args;
    const fileTest = { '-e': n => !!n, '-f': n => n && n.t === 'f', '-d': n => n && n.t === 'd', '-r': n => n && sh.vfs.can(n, 4, sh.user, sh.groups), '-x': n => n && sh.vfs.can(n, 1, sh.user, sh.groups), '-s': n => n && sh.vfs.size(n) > 0 };
    if (fileTest[a]) return fileTest[a](sh.stat(b).node) ? 0 : 1;
    if (a === '-z') return !b ? 0 : 1;
    if (a === '-n') return b ? 0 : 1;
    if (b === '=' || b === '==') return a === c ? 0 : 1;
    if (b === '!=') return a !== c ? 0 : 1;
    const num = { '-eq': (x, y) => x === y, '-ne': (x, y) => x !== y, '-gt': (x, y) => x > y, '-lt': (x, y) => x < y, '-ge': (x, y) => x >= y, '-le': (x, y) => x <= y };
    if (num[b]) return num[b](+a, +c) ? 0 : 1;
    return a ? 0 : 1;
  };

  /* ---------------------------------------------------------------- files */
  C.touch = (sh, args, io) => {
    let code = 0;
    for (const f of opts(args).r) {
      const st = sh.stat(f);
      if (st.node) { st.node.mtime = sh.stamp(); continue; }
      const w = sh.writeFile(f, '');
      if (w.err) { io.err(`touch: cannot touch '${f}': ${w.err}\n`); code = 1; }
    }
    return code;
  };
  C.mkdir = (sh, args, io) => {
    const { o, r } = opts(args);
    let code = 0;
    for (const f of r) {
      const abs = sh.abs(f);
      if (sh.vfs.get(abs)) { if (!o.p) { io.err(`mkdir: cannot create directory '${f}': File exists\n`); code = 1; } continue; }
      const { dir, name } = sh.vfs.parentOf(abs);
      const ps = sh.stat(dir);
      if (ps.err && !o.p) { io.err(`mkdir: cannot create directory '${f}': ${ps.err}\n`); code = 1; continue; }
      if (ps.node && !sh.vfs.can(ps.node, 2, sh.user, sh.groups)) { io.err(`mkdir: cannot create directory '${f}': Permission denied\n`); code = 1; continue; }
      const d = sh.vfs.mkdirp(abs, { owner: sh.user, group: sh.groups[0] });
      d.owner = sh.user; d.group = sh.groups[0];
    }
    return code;
  };
  C.rmdir = (sh, args, io) => {
    let code = 0;
    for (const f of args) {
      const st = sh.stat(f);
      if (st.err) { io.err(`rmdir: failed to remove '${f}': ${st.err}\n`); code = 1; continue; }
      if (st.node.t !== 'd') { io.err(`rmdir: failed to remove '${f}': Not a directory\n`); code = 1; continue; }
      if (Object.keys(st.node.c).length) { io.err(`rmdir: failed to remove '${f}': Directory not empty\n`); code = 1; continue; }
      const { dir, name } = sh.vfs.parentOf(st.abs); delete sh.vfs.get(dir).c[name];
    }
    return code;
  };
  C.rm = (sh, args, io) => {
    const { o, r } = opts(args);
    let code = 0;
    for (const f of r) {
      const st = sh.stat(f);
      if (st.err) { if (!o.f) { io.err(`rm: cannot remove '${f}': ${st.err}\n`); code = 1; } continue; }
      if (st.abs === '/') { io.err("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n"); return 1; }
      if (st.node.t === 'd' && !(o.r || o.R)) { io.err(`rm: cannot remove '${f}': Is a directory\n`); code = 1; continue; }
      const { dir, name } = sh.vfs.parentOf(st.abs);
      const pn = sh.vfs.get(dir);
      if (!sh.vfs.can(pn, 2, sh.user, sh.groups)) { io.err(`rm: cannot remove '${f}': Permission denied\n`); code = 1; continue; }
      delete pn.c[name];
    }
    return code;
  };
  const copyNode = n => JSON.parse(JSON.stringify(n));
  C.cp = (sh, args, io) => {
    const { o, r } = opts(args);
    if (r.length < 2) { io.err('cp: missing file operand\n'); return 1; }
    const dest = r.pop(); const dst = sh.stat(dest);
    let code = 0;
    for (const f of r) {
      const st = sh.stat(f);
      if (st.err) { io.err(`cp: cannot stat '${f}': ${st.err}\n`); code = 1; continue; }
      if (st.node.t === 'd' && !(o.r || o.R)) { io.err(`cp: -r not specified; omitting directory '${f}'\n`); code = 1; continue; }
      if (st.node.t === 'f' && !sh.vfs.can(st.node, 4, sh.user, sh.groups)) { io.err(`cp: cannot open '${f}' for reading: Permission denied\n`); code = 1; continue; }
      const target = dst.node && dst.node.t === 'd' ? dst.abs + '/' + st.abs.split('/').pop() : sh.abs(dest);
      const { dir, name } = sh.vfs.parentOf(target);
      const pn = sh.stat(dir);
      if (pn.err || !sh.vfs.can(pn.node, 2, sh.user, sh.groups)) { io.err(`cp: cannot create regular file '${dest}': ${pn.err || 'Permission denied'}\n`); code = 1; continue; }
      const c = copyNode(st.node); c.owner = sh.user; c.group = sh.groups[0]; pn.node.c[name] = c;
    }
    return code;
  };
  C.mv = (sh, args, io) => {
    const r = opts(args).r;
    if (r.length < 2) { io.err('mv: missing file operand\n'); return 1; }
    const dest = r.pop(); const dst = sh.stat(dest);
    let code = 0;
    for (const f of r) {
      const st = sh.stat(f);
      if (st.err) { io.err(`mv: cannot stat '${f}': ${st.err}\n`); code = 1; continue; }
      const target = dst.node && dst.node.t === 'd' ? dst.abs + '/' + st.abs.split('/').pop() : sh.abs(dest);
      const src = sh.vfs.parentOf(st.abs), tg = sh.vfs.parentOf(target);
      const sp = sh.vfs.get(src.dir), tp = sh.stat(tg.dir);
      if (tp.err || !sh.vfs.can(sp, 2, sh.user, sh.groups) || !sh.vfs.can(tp.node, 2, sh.user, sh.groups)) { io.err(`mv: cannot move '${f}' to '${dest}': Permission denied\n`); code = 1; continue; }
      tp.node.c[tg.name] = st.node; delete sp.c[src.name];
    }
    return code;
  };

  C.basename = (sh, a, io) => io.out((a[0] || '').replace(/\/+$/, '').split('/').pop().replace(a[1] ? new RegExp(a[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') : /$^/, '') + '\n');
  C.dirname = (sh, a, io) => io.out(((a[0] || '').replace(/\/+$/, '').split('/').slice(0, -1).join('/') || (a[0] && a[0][0] === '/' ? '/' : '.')) + '\n');

  /* ---------------------------------------------------------------- permissions */
  C.chmod = (sh, args, io) => {
    const { r } = opts(args.filter(x => !/^-R$/.test(x)));
    if (r.length < 2) { io.err('chmod: missing operand\n'); return 1; }
    const spec = r.shift(); let code = 0;
    for (const f of r) {
      const st = sh.stat(f);
      if (st.err) { io.err(`chmod: cannot access '${f}': ${st.err}\n`); code = 1; continue; }
      if (sh.user !== 'root' && st.node.owner !== sh.user) { io.err(`chmod: changing permissions of '${f}': Operation not permitted\n`); code = 1; continue; }
      let mode = st.node.mode;
      if (/^[0-7]{3,4}$/.test(spec)) mode = parseInt(spec, 8);
      else {
        for (const part of spec.split(',')) {
          const m = /^([ugoa]*)([-+=])([rwxst]*)$/.exec(part);
          if (!m) { io.err(`chmod: invalid mode: '${spec}'\n`); return 1; }
          const who = m[1] || 'a';
          let bits = 0;
          const w = { u: 6, g: 3, o: 0 };
          for (const ch of who === 'a' ? 'ugo' : who) {
            const sh3 = w[ch];
            let b = 0;
            if (m[3].includes('r')) b |= 4; if (m[3].includes('w')) b |= 2; if (m[3].includes('x')) b |= 1;
            bits |= b << sh3;
            if (m[3].includes('s') && ch === 'u') bits |= 0o4000;
            if (m[3].includes('s') && ch === 'g') bits |= 0o2000;
            if (m[3].includes('t') && ch === 'o') bits |= 0o1000;
          }
          let mask = 0;
          for (const ch of who === 'a' ? 'ugo' : who) mask |= 7 << w[ch];
          if (m[2] === '+') mode |= bits; else if (m[2] === '-') mode &= ~bits; else mode = (mode & ~mask) | bits;
        }
      }
      st.node.mode = mode;
    }
    return code;
  };
  C.chown = (sh, args, io) => {
    const { r } = opts(args.filter(x => !/^-R$/.test(x)));
    if (r.length < 2) { io.err('chown: missing operand\n'); return 1; }
    const [own, ...files] = r; let code = 0;
    for (const f of files) {
      const st = sh.stat(f);
      if (st.err) { io.err(`chown: cannot access '${f}': ${st.err}\n`); code = 1; continue; }
      if (sh.user !== 'root') { io.err(`chown: changing ownership of '${f}': Operation not permitted\n`); code = 1; continue; }
      const [u, g] = own.split(/[:.]/);
      if (u) st.node.owner = u; if (g) st.node.group = g;
    }
    return code;
  };

  /* ---------------------------------------------------------------- search */
  C.grep = (sh, args, io) => {
    const { o, r } = opts(args, 'eAB' + 'Cm');
    let pat = o.e != null ? o.e : r.shift();
    if (pat === undefined) { io.err('Usage: grep [OPTION]... PATTERNS [FILE]...\n'); return 2; }
    const flags = o.i ? 'i' : '';
    let re = PS.Shell.toRegex(o.w ? `\\b(?:${pat})\\b` : pat, flags, !!o.F);
    const A = +(o.A ?? o.C ?? 0), B = +(o.B ?? o.C ?? 0);
    let files = r, code = 1;
    const sources = [];
    if (!files.length) sources.push({ name: '(standard input)', data: io.stdin || '' });
    else {
      const expand = (f, top) => {
        const st = sh.stat(f);
        if (st.err) { if (!o.s) io.err(`grep: ${f}: ${st.err}\n`); code = 2; return; }
        if (st.node.t === 'd') {
          if (!(o.r || o.R)) { io.err(`grep: ${f}: Is a directory\n`); return; }
          sh.vfs.list(st.abs).forEach(k => expand((f === '.' ? '.' : f.replace(/\/$/, '')) + '/' + k));
        } else {
          const rd = sh.readFile(f);
          if (rd.err) { if (!o.s) io.err(`grep: ${f}: ${rd.err}\n`); code = 2; } else sources.push({ name: f, data: rd.data });
        }
      };
      files.forEach(f => expand(f));
    }
    const multi = (files.length > 1 || o.r || o.R) && !o.h;
    let total = 0, matchedAny = false;
    for (const src of sources) {
      const ls = lines(src.data);
      let count = 0; const printed = new Set(); let lastPrinted = -2;
      const prefix = (i, sep) => (multi ? src.name + sep : '') + (o.n ? (i + 1) + sep : '');
      ls.forEach((l, i) => {
        const hit = re.test(l) !== !!o.v; re.lastIndex = 0;
        if (!hit) return;
        count++; matchedAny = true;
        if (o.q || o.c || o.l) return;
        if (m_max(o, count)) return;
        for (let k = Math.max(0, i - B); k <= Math.min(ls.length - 1, i + A); k++) {
          if (printed.has(k)) continue;
          if ((A || B) && k > lastPrinted + 1 && lastPrinted >= 0) io.out('--\n');
          printed.add(k); lastPrinted = k;
          if (k === i && o.o) {
            const g = new RegExp(re.source, re.flags.replace('g', '') + 'g'); let mm;
            while ((mm = g.exec(l))) { io.out(prefix(k, ':') + mm[0] + '\n'); if (!mm[0]) g.lastIndex++; }
          } else io.out(prefix(k, k === i ? ':' : '-') + ls[k] + '\n');
        }
      });
      if (o.c) io.out((multi ? src.name + ':' : '') + count + '\n');
      if (o.l && count) io.out(src.name + '\n');
      total += count;
    }
    return matchedAny ? 0 : (code === 2 ? 2 : 1);
  };
  const m_max = (o, count) => o.m != null && count > +o.m;
  C.egrep = (sh, a, io) => C.grep(sh, ['-E', ...a], io);
  C.fgrep = (sh, a, io) => C.grep(sh, ['-F', ...a], io);

  C.find = (sh, args, io) => {
    const starts = []; let i = 0;
    while (i < args.length && !args[i].startsWith('-') && args[i] !== '!') starts.push(args[i++]);
    if (!starts.length) starts.push('.');
    const preds = []; let exec = null, execPlus = false, maxdepth = Infinity, mindepth = 0;
    const globRe = g => new RegExp('^' + g.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    /** parse one test predicate at args[i]; returns fn or null (for actions/options) */
    const parseTest = a => {
      if (a === '-name') { const re = globRe(args[++i]); return p => re.test(p.split('/').pop()); }
      if (a === '-iname') { const re = new RegExp(globRe(args[++i]).source, 'i'); return p => re.test(p.split('/').pop()); }
      if (a === '-type') { const t = args[++i]; return (p, n) => (t === 'd' ? n.t === 'd' : t === 'f' ? n.t === 'f' && n.type !== 'link' : n.type === 'link'); }
      if (a === '-user') { const u = args[++i]; return (p, n) => n.owner === u; }
      if (a === '-group') { const u = args[++i]; return (p, n) => n.group === u; }
      if (a === '-perm') {
        let v = args[++i]; let mode = 'exact';
        if (v[0] === '-') { mode = 'all'; v = v.slice(1); } else if (v[0] === '/') { mode = 'any'; v = v.slice(1); }
        const bits = parseInt(v, 8);
        return (p, n) => (mode === 'exact' ? (n.mode & 0o7777) === bits : mode === 'all' ? (n.mode & bits) === bits : (n.mode & bits) !== 0);
      }
      if (a === '-size') {
        const m = /^([+-]?)(\d+)([ckMG]?)$/.exec(args[++i] || '');
        if (!m) return () => true;
        const mul = { '': 512, c: 1, k: 1024, M: 1048576, G: 1073741824 }[m[3]];
        return (p, n) => { const u = Math.ceil(sh.vfs.size(n) / mul); return m[1] === '+' ? u > +m[2] : m[1] === '-' ? u < +m[2] : u === +m[2]; };
      }
      if (a === '-empty') return (p, n) => (n.t === 'd' ? !Object.keys(n.c).length : !n.data);
      if (a === '-readable') return (p, n) => sh.vfs.can(n, 4, sh.user, sh.groups);
      return null;
    };
    for (; i < args.length; i++) {
      const a = args[i];
      if (a === '-maxdepth') maxdepth = +args[++i];
      else if (a === '-mindepth') mindepth = +args[++i];
      else if (a === '-print' || a === '-o' || a === '-a' || a === '-and') { /* default action / implicit AND */ }
      else if (a === '-exec') {
        const cmd = [];
        for (i++; i < args.length && args[i] !== ';' && args[i] !== '+'; i++) cmd.push(args[i]);
        exec = cmd; execPlus = args[i] === '+';
      } else if (a === '!' || a === '-not') {
        i++;
        const f = parseTest(args[i]);
        if (!f) { io.err(`find: unknown predicate '${args[i]}'\n`); return 1; }
        preds.push((p, n) => !f(p, n));
      } else {
        const f = parseTest(a);
        if (!f) { io.err(`find: unknown predicate '${a}'\n`); return 1; }
        preds.push(f);
      }
    }
    const matches = []; let code = 0;
    for (const s of starts) {
      const st = sh.stat(s);
      if (st.err) { io.err(`find: '${s}': ${st.err}\n`); code = 1; continue; }
      const rec = (disp, abs, node, depth) => {
        if (depth >= mindepth && preds.every(f => f(disp, node))) matches.push(disp);
        if (node.t === 'd' && depth < maxdepth) {
          if (sh.user !== 'root' && !sh.vfs.can(node, 4, sh.user, sh.groups)) { io.err(`find: '${disp}': Permission denied\n`); code = 1; return; }
          sh.vfs.list(abs).forEach(k => rec((disp === '/' ? '' : disp.replace(/\/$/, '')) + '/' + k, (abs === '/' ? '' : abs) + '/' + k, node.c[k], depth + 1));
        }
      };
      rec(s, st.abs, st.node, 0);
    }
    if (exec) {
      const runOne = list => {
        const cmdArgs = [];
        exec.slice(1).forEach(x => { if (x === '{}') list.forEach(p => cmdArgs.push(p)); else cmdArgs.push(x); });
        return sh.run(exec[0], cmdArgs, io);
      };
      if (execPlus) runOne(matches); else matches.forEach(m => { const c = exec.slice(1).map(x => x.replace(/\{\}/g, m)); sh.run(exec[0], c, io); });
    } else matches.forEach(m => io.out(m + '\n'));
    return code;
  };

  /* ---------------------------------------------------------------- text tools */
  C.wc = (sh, args, io) => {
    const { o, r } = opts(args);
    const { list, bad } = inputs(sh, io, r, 'wc');
    const none = !o.l && !o.w && !o.c && !o.m;
    const rows = list.map(x => ({ name: r.length ? x.name : '', l: (x.data.match(/\n/g) || []).length, w: x.data.split(/\s+/).filter(Boolean).length, c: PS.utf8(x.data).length }));
    if (rows.length > 1) rows.push({ name: 'total', l: rows.reduce((s, x) => s + x.l, 0), w: rows.reduce((s, x) => s + x.w, 0), c: rows.reduce((s, x) => s + x.c, 0) });
    const width = rows.length > 1 ? Math.max(...rows.map(x => String(x.c).length)) : 0;
    rows.forEach(x => {
      const parts = [];
      if (o.l || none) parts.push(x.l); if (o.w || none) parts.push(x.w); if (o.c || o.m || none) parts.push(x.c);
      io.out(parts.map(p => String(p).padStart(width)).join(' ') + (x.name ? ' ' + x.name : '') + '\n');
    });
    return bad;
  };

  C.sort = (sh, args, io) => {
    const { o, r } = opts(args, 'kt');
    const { list, bad } = inputs(sh, io, r, 'sort');
    let ls = []; list.forEach(x => ls.push(...lines(x.data)));
    const sep = o.t != null ? o.t : null;
    const key = l => {
      if (o.k == null) return l;
      const [f] = String(o.k).split(',');
      const parts = sep != null ? l.split(sep) : l.trim().split(/\s+/);
      return parts[+f.replace(/\D.*/, '') - 1] ?? '';
    };
    const num = s => { const m = /^\s*(-?\d+(\.\d+)?)/.exec(s); return m ? parseFloat(m[1]) : 0; };
    const hnum = s => { const m = /^\s*(\d+(?:\.\d+)?)([KMGT]?)/i.exec(s); return m ? parseFloat(m[1]) * ({ '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12 }[m[2].toUpperCase()]) : 0; };
    ls.sort((a, b) => {
      let ka = key(a), kb = key(b);
      if (o.f) { ka = ka.toLowerCase(); kb = kb.toLowerCase(); }
      let c;
      if (o.n) c = num(ka) - num(kb); else if (o.h) c = hnum(ka) - hnum(kb); else c = ka < kb ? -1 : ka > kb ? 1 : 0;
      if (c === 0 && !o.s) c = a < b ? -1 : a > b ? 1 : 0;
      return c;
    });
    if (o.r) ls.reverse();
    if (o.u) ls = ls.filter((l, i) => i === 0 || key(l) !== key(ls[i - 1]));
    io.out(ls.map(l => l + '\n').join(''));
    return bad;
  };
  C.uniq = (sh, args, io) => {
    const { o, r } = opts(args);
    const { list, bad } = inputs(sh, io, r.slice(0, 1), 'uniq');
    const ls = lines(list[0] ? list[0].data : '');
    const groups = [];
    ls.forEach(l => { const g = groups[groups.length - 1]; if (g && (o.i ? g.l.toLowerCase() === l.toLowerCase() : g.l === l)) g.n++; else groups.push({ l, n: 1 }); });
    groups.forEach(g => { if (o.d && g.n < 2) return; if (o.u && g.n > 1) return; io.out((o.c ? String(g.n).padStart(7) + ' ' : '') + g.l + '\n'); });
    return bad;
  };
  C.cut = (sh, args, io) => {
    const { o, r } = opts(args, 'dfcb');
    const { list, bad } = inputs(sh, io, r, 'cut');
    const spec = o.f ?? o.c;
    if (spec == null) { io.err('cut: you must specify a list of bytes, characters, or fields\n'); return 1; }
    const idx = []; String(spec).split(',').forEach(p => { const m = /^(\d*)-(\d*)$/.exec(p); if (m) { const a = +m[1] || 1, b = +m[2] || 999; for (let k = a; k <= b; k++) idx.push(k); } else idx.push(+p); });
    const d = o.d != null ? o.d : '\t';
    list.forEach(x => lines(x.data).forEach(l => {
      if (o.c != null) { io.out(idx.map(k => l[k - 1] || '').join('') + '\n'); return; }
      if (!l.includes(d)) { if (!o.s) io.out(l + '\n'); return; }
      const f = l.split(d);
      io.out(idx.filter(k => k <= f.length).map(k => f[k - 1]).join(d) + '\n');
    }));
    return bad;
  };
  C.rev = (sh, args, io) => { const { list, bad } = inputs(sh, io, opts(args).r, 'rev'); list.forEach(x => lines(x.data).forEach(l => io.out([...l].reverse().join('') + '\n'))); return bad; };
  C.tr = (sh, args, io) => {
    const { o, r } = opts(args);
    const expand = s => {
      s = s.replace(/\[:upper:\]/g, 'A-Z').replace(/\[:lower:\]/g, 'a-z').replace(/\[:digit:\]/g, '0-9').replace(/\[:alpha:\]/g, 'A-Za-z').replace(/\[:space:\]/g, ' \t\n').replace(/\[:alnum:\]/g, 'A-Za-z0-9');
      let out = ''; for (let i = 0; i < s.length; i++) { if (s[i + 1] === '-' && i + 2 < s.length) { for (let c = s.charCodeAt(i); c <= s.charCodeAt(i + 2); c++) out += String.fromCharCode(c); i += 2; } else if (s[i] === '\\' && s[i + 1] === 'n') { out += '\n'; i++; } else out += s[i]; } return out;
    };
    const a = expand(r[0] || ''), b = r[1] != null ? expand(r[1]) : '';
    let res = '';
    for (const ch of io.stdin || '') {
      const k = a.indexOf(ch);
      if (o.d) { if (k < 0) res += ch; }
      else if (k >= 0) { const rep = b[Math.min(k, b.length - 1)]; if (!(o.s && res.slice(-1) === rep && b.includes(ch))) res += rep; }
      else res += ch;
    }
    io.out(res);
  };
  C.tee = (sh, args, io) => {
    const { o, r } = opts(args);
    r.forEach(f => { const w = sh.writeFile(f, io.stdin || '', !!o.a); if (w.err) io.err(`tee: ${f}: ${w.err}\n`); });
    io.out(io.stdin || '');
  };
  C.sed = (sh, args, io) => {
    const { o, r } = opts(args, 'e');
    const script = o.e != null ? o.e : r.shift();
    const { list, bad } = inputs(sh, io, r, 'sed');
    const cmds = script.split(/;|\n/).map(s => s.trim()).filter(Boolean).map(s => {
      let m = /^(?:(\d+|\$|\/(.+?)\/)(?:,(\d+|\$))?)?\s*(d|p)$/.exec(s);
      if (m) return { kind: m[4], from: m[1], re: m[2] ? PS.Shell.toRegex(m[2]) : null, to: m[3] };
      m = /^s(.)(.*?)(?<!\\)\1(.*?)(?<!\\)\1([gi]*)$/.exec(s);
      if (m) return { kind: 's', re: PS.Shell.toRegex(m[2], m[4].includes('i') ? 'i' : ''), rep: m[3].replace(/\\\//g, '/'), g: m[4].includes('g') };
      return null;
    });
    if (cmds.some(c => !c)) { io.err(`sed: -e expression #1: unsupported or invalid command\n`); return 1; }
    list.forEach(x => {
      const ls = lines(x.data); const out = [];
      ls.forEach((l, idx) => {
        let line = l, del = false, printed = false;
        for (const c of cmds) {
          const n = idx + 1;
          const addrOk = !c.from ? true : c.re ? c.re.test(l) : c.from === '$' ? n === ls.length : c.to ? (n >= +c.from && (c.to === '$' ? true : n <= +c.to)) : n === +c.from;
          if (c.kind === 's') { line = line.replace(c.g ? new RegExp(c.re.source, c.re.flags + 'g') : c.re, c.rep.replace(/&/g, '$&').replace(/\\(\d)/g, '$$$1')); }
          else if (c.kind === 'd' && addrOk) del = true;
          else if (c.kind === 'p' && addrOk) { out.push(line); printed = true; }
        }
        if (!del && !o.n) out.push(line);
      });
      const text = out.map(l => l + '\n').join('');
      if (o.i && r.length) sh.writeFile(x.name, text); else io.out(text);
    });
    return bad;
  };
  C.xargs = (sh, args, io) => {
    const { o, r } = opts(args, 'nI');
    const cmd = r.length ? r : ['echo'];
    const items = (io.stdin || '').split(/\s+/).filter(Boolean);
    if (o.n) { for (let i = 0; i < items.length; i += +o.n) sh.run(cmd[0], cmd.slice(1).concat(items.slice(i, i + +o.n)), io); return 0; }
    return sh.run(cmd[0], cmd.slice(1).concat(items), io);
  };
  C.diff = (sh, args, io) => {
    const r = opts(args).r;
    const a = sh.readFile(r[0]), b = sh.readFile(r[1]);
    if (a.err || b.err) { io.err(`diff: ${a.err ? r[0] + ': ' + a.err : r[1] + ': ' + b.err}\n`); return 2; }
    const la = lines(a.data), lb = lines(b.data); let diff = 1;
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      if (la[i] !== lb[i]) {
        diff = 1;
        if (la[i] !== undefined) io.out(`${i + 1}${lb[i] !== undefined ? 'c' : 'd'}${i + 1}\n< ${la[i]}\n`);
        if (lb[i] !== undefined) io.out(`${la[i] !== undefined ? '---\n' : `${i}a${i + 1}\n`}> ${lb[i]}\n`);
      }
    }
    return la.join('\n') === lb.join('\n') ? 0 : 1;
  };

  /* ---------------------------------------------------------------- binary-ish */
  const bytesOf = s => (/[\u0080-ÿ]/.test(s) && !/[Ā-￿]/.test(s) ? Array.from(s, c => c.charCodeAt(0)) : PS.utf8(s));
  C.file = (sh, args, io) => {
    let code = 0;
    for (const f of opts(args).r) {
      const st = sh.stat(f);
      if (st.err) { io.out(`${f}: cannot open \`${f}' (${st.err})\n`); code = 1; continue; }
      const n = st.node; let t;
      if (n.t === 'd') t = 'directory';
      else if (n.type && n.type !== 'link') t = n.type;
      else if (n.type === 'link') t = `symbolic link to ${n.target}`;
      else if (!n.data) t = 'empty';
      else if (n.data.startsWith('\x7fELF')) t = 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, not stripped';
      else if (n.data.startsWith('\x89PNG')) t = 'PNG image data, 800 x 600, 8-bit/color RGBA, non-interlaced';
      else if (n.data.startsWith('PK\x03\x04')) t = 'Zip archive data, at least v2.0 to extract';
      else if (n.data.startsWith('\x1f\x8b')) t = 'gzip compressed data, from Unix';
      else if (n.data.startsWith('%PDF')) t = 'PDF document, version 1.4';
      else if (n.data.startsWith('MZ')) t = 'PE32+ executable (console) x86-64, for MS Windows';
      else if (/^#!.*(bash|sh)/.test(n.data)) t = 'Bourne-Again shell script, ASCII text executable';
      else if (/^#!.*python/.test(n.data)) t = 'Python script, ASCII text executable';
      else if (/^<\?php/.test(n.data)) t = 'PHP script, ASCII text';
      else if (/^\s*<(!DOCTYPE|html)/i.test(n.data)) t = 'HTML document, ASCII text';
      else if (/[\x00-\x08\x0e-\x1f]/.test(n.data)) t = 'data';
      else if (/[^\x00-\x7f]/.test(n.data)) t = 'Unicode text, UTF-8 text';
      else t = lines(n.data).some(l => l.length > 300) ? 'ASCII text, with very long lines' : 'ASCII text';
      io.out(`${f}: ${t}\n`);
    }
    return code;
  };
  C.strings = (sh, args, io) => {
    const { o, r } = opts(args, 'n');
    const min = +(o.n || 4);
    const { list, bad } = inputs(sh, io, r, 'strings');
    list.forEach(x => { const re = new RegExp(`[\\x20-\\x7e]{${min},}`, 'g'); (x.data.match(re) || []).forEach(s => io.out(s + '\n')); });
    return bad;
  };
  const hexdump = (data, mode) => {
    const b = bytesOf(data); const out = [];
    for (let off = 0; off < b.length; off += 16) {
      const row = b.slice(off, off + 16);
      const asc = row.map(c => (c >= 32 && c < 127 ? String.fromCharCode(c) : '.')).join('');
      if (mode === 'xxd') {
        let h = ''; for (let i = 0; i < 16; i += 2) h += (row[i] !== undefined ? PS.hex(row[i]) : '  ') + (row[i + 1] !== undefined ? PS.hex(row[i + 1]) : '  ') + ' ';
        out.push(`${PS.hex(off, 8)}: ${h} ${asc}`);
      } else {
        const h = row.map(c => PS.hex(c)).join(' ').padEnd(47);
        out.push(`${PS.hex(off, 8)}  ${h.slice(0, 23)} ${h.slice(23)}  |${asc}|`);
      }
    }
    return out.join('\n') + '\n';
  };
  C.xxd = (sh, args, io) => { const { list, bad } = inputs(sh, io, opts(args).r, 'xxd'); list.forEach(x => io.out(hexdump(x.data, 'xxd'))); return bad; };
  C.hexdump = (sh, args, io) => { const { list, bad } = inputs(sh, io, opts(args).r, 'hexdump'); list.forEach(x => io.out(hexdump(x.data, 'C'))); return bad; };
  C.od = C.hexdump;
  C.base64 = (sh, args, io) => {
    const { o, r } = opts(args);
    const { list, bad } = inputs(sh, io, r, 'base64');
    list.forEach(x => {
      if (o.d || o.decode) { try { io.out(PS.b64dec(x.data)); } catch (e) { io.err('base64: invalid input\n'); } }
      else io.out((PS.b64enc(x.data.replace(/\n$/, o.n ? '' : '\n')).match(/.{1,76}/g) || ['']).join('\n') + '\n');
    });
    return bad;
  };
  ['md5', 'sha1', 'sha256'].forEach(alg => {
    C[alg + 'sum'] = (sh, args, io) => {
      const { list, bad } = inputs(sh, io, opts(args).r, alg + 'sum');
      list.forEach(x => io.out(`${PS.hash[alg](x.data)}  ${x.name}\n`));
      return bad;
    };
  });

  /* ---------------------------------------------------------------- identity & system info */
  C.whoami = (sh, a, io) => io.out(sh.user + '\n');
  const gid = { root: 0, sudo: 27, adm: 4, 'www-data': 33, docker: 999, shadow: 42 };
  C.id = (sh, a, io) => {
    const u = a[0] || sh.user; const rec = sh.users[u];
    if (!rec) { io.err(`id: ‘${u}’: no such user\n`); return 1; }
    const g = n => (gid[n] != null ? gid[n] : rec.uid);
    io.out(`uid=${rec.uid}(${u}) gid=${g(rec.groups[0])}(${rec.groups[0]}) groups=${rec.groups.map(n => `${g(n)}(${n})`).join(',')}\n`);
  };
  C.groups = (sh, a, io) => io.out((sh.users[a[0] || sh.user] || { groups: [] }).groups.join(' ') + '\n');
  C.hostname = (sh, a, io) => io.out(sh.host + '\n');
  C.uname = (sh, a, io) => {
    const k = sh.data.kernel || '5.15.0-91-generic';
    io.out(a.includes('-a') ? `Linux ${sh.host} ${k} #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux\n` : a.includes('-r') ? k + '\n' : 'Linux\n');
  };
  C.date = (sh, a, io) => io.out(sh.now.toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) ([\d:]+) GMT$/, '$1 $3 $2 $5 UTC $4') + '\n');
  C.uptime = (sh, a, io) => io.out(` ${sh.now.toISOString().slice(11, 19)} up ${sh.data.uptime || '12 days,  3:41'},  2 users,  load average: 0.08, 0.12, 0.09\n`);
  C.env = C.printenv = (sh, a, io) => { Object.entries({ USER: sh.user, HOME: sh.home, PWD: sh.cwd, HOSTNAME: sh.host, ...sh.env }).forEach(([k, v]) => io.out(`${k}=${v}\n`)); };
  C.export = (sh, args) => { args.forEach(x => { const k = x.indexOf('='); if (k > 0) sh.env[x.slice(0, k)] = x.slice(k + 1); }); };
  C.alias = (sh, args, io) => {
    if (!args.length) { Object.entries(sh.aliases).forEach(([k, v]) => io.out(`alias ${k}='${v}'\n`)); return; }
    args.forEach(x => { const k = x.indexOf('='); if (k > 0) sh.aliases[x.slice(0, k)] = x.slice(k + 1); });
  };
  C.history = (sh, a, io) => { sh.history.forEach((h, i) => io.out(`${String(i + 1).padStart(5)}  ${h}\n`)); };
  C.which = (sh, args, io) => { let c = 0; args.forEach(a => { if (sh.extra[a] || C[a]) io.out(`/usr/bin/${a}\n`); else c = 1; }); return c; };
  C.type = (sh, args, io) => { let c = 0; args.forEach(a => { if (['cd', 'echo', 'export', 'alias', 'history', 'pwd'].includes(a)) io.out(`${a} is a shell builtin\n`); else if (sh.extra[a] || C[a]) io.out(`${a} is /usr/bin/${a}\n`); else { io.err(`bash: type: ${a}: not found\n`); c = 1; } }); return c; };
  C.exit = C.logout = (sh, a, io) => {
    if (sh.userStack.length) { sh.user = sh.userStack.pop(); sh.cwd = sh.users[sh.user].home; } else io.out('logout\n(simulyatorda sessiyanı bağlamaq mümkün deyil — davam edə bilərsən)\n');
  };

  C.sudo = (sh, args, io) => {
    const { o, r } = opts(args, 'u');
    if (o.l) {
      if (!sh.sudoers.includes(sh.user)) { io.err(`Sorry, user ${sh.user} may not run sudo on ${sh.host}.\n`); return 1; }
      io.out(`Matching Defaults entries for ${sh.user} on ${sh.host}:\n    env_reset, mail_badpass\n\nUser ${sh.user} may run the following commands on ${sh.host}:\n`);
      io.out(sh.sudoRules ? sh.sudoRules.map(x => `    (root) NOPASSWD: ${x}\n`).join('') : '    (ALL : ALL) ALL\n');
      return 0;
    }
    if (!sh.sudoers.includes(sh.user)) { io.err(`${sh.user} is not in the sudoers file.  This incident will be reported.\n`); sh.hooks.sudoDenied && sh.hooks.sudoDenied(sh); return 1; }
    let target = o.u || 'root';
    if (o.i || o.s || (r[0] === 'su' && (!r[1] || r[1] === '-'))) { sh.userStack.push(sh.user); sh.user = target; sh.cwd = sh.users[target].home; return 0; }
    if (!r.length) { io.err('usage: sudo [-u user] command\n'); return 1; }
    if (sh.sudoRules && !sh.sudoRules.some(x => x === r[0] || x.endsWith('/' + r[0]))) { io.err(`Sorry, user ${sh.user} is not allowed to execute '${r.join(' ')}' as root on ${sh.host}.\n`); return 1; }
    const prev = sh.user; sh.user = target;
    try { return sh.run(r[0], r.slice(1), io); } finally { sh.user = prev; }
  };
  C.su = (sh, args, io) => { io.err('su: Authentication failure\n(İpucu: parolsuz yüksəlmə üçün `sudo -i` yoxla, əgər icazən varsa.)\n'); return 1; };
  C.passwd = (sh, a, io) => { io.err('passwd: bu simulyatorda parol dəyişmək söndürülüb\n'); return 1; };

  C.help = (sh, a, io) => {
    const names = Object.keys(Object.assign({}, C, sh.extra)).filter(k => !['[', 'test', 'true', 'false', 'egrep', 'fgrep', 'less', 'more', 'bat', 'logout', 'od', 'printenv'].includes(k)).sort();
    io.out('Mövcud əmrlər (ətraflı: man <əmr>):\n\n' + columns(names, 78) + '\nİpucu: Tab — avtomatik tamamlama, ↑/↓ — tarixçə, Ctrl+L — ekranı təmizlə.\n');
  };
  C.man = (sh, args, io) => {
    const cmd = args[args.length - 1];
    if (!cmd) { io.err('What manual page do you want?\n'); return 1; }
    const page = PS.Shell.man[cmd];
    if (!page) { io.err(`No manual entry for ${cmd}\n`); return 16; }
    io.out(`${cmd.toUpperCase()}(1)\n\nSYNOPSIS\n    ${page.syn}\n\nTƏSVİR\n    ${page.desc}\n\nƏSAS OPSİYALAR\n${page.opts.map(x => '    ' + x).join('\n')}\n${page.ex ? '\nNÜMUNƏLƏR\n' + page.ex.map(x => '    ' + x).join('\n') + '\n' : ''}`);
  };

  PS.Shell.man = {
    ls: { syn: 'ls [OPTION]... [FILE]...', desc: 'Qovluğun tərkibini göstərir.', opts: ['-l  ətraflı format (icazələr, sahib, ölçü, tarix)', '-a  gizli (nöqtə ilə başlayan) faylları da göstər', '-h  ölçüləri oxunaqlı göstər (K, M)', '-R  alt qovluqları rekursiv göstər'], ex: ['ls -la /var/log'] },
    cd: { syn: 'cd [DIR]', desc: 'Cari qovluğu dəyişir. `cd` tək başına ev qovluğuna, `cd -` əvvəlki qovluğa qaytarır.', opts: ['..  bir səviyyə yuxarı'] },
    cat: { syn: 'cat [FILE]...', desc: 'Faylın məzmununu ekrana çıxarır.', opts: ['-n  sətir nömrələri ilə'] },
    grep: { syn: 'grep [OPTION]... PATTERN [FILE]...', desc: 'Mətndə şablona uyğun sətirləri axtarır.', opts: ['-i  böyük/kiçik hərfə həssas olma', '-v  uyğun GƏLMƏYƏN sətirlər', '-n  sətir nömrəsi', '-c  uyğun sətirlərin sayı', '-r  qovluğu rekursiv axtar', '-E  genişləndirilmiş regex (a|b)', '-o  yalnız uyğun gələn hissə', '-A/-B/-C N  uyğunluqdan sonra/əvvəl/ətrafında N sətir'], ex: ['grep -i "failed" /var/log/auth.log', 'grep -E "404|500" access.log | wc -l'] },
    find: { syn: 'find [PATH] [EXPRESSION]', desc: 'Fayl sistemində ada, tipə, sahibə, icazəyə görə axtarır.', opts: ['-name "*.log"  ada görə', '-type f|d  fayl və ya qovluq', '-user NAME  sahibə görə', '-perm -4000  SUID bitinə görə', '-size +1M  ölçüyə görə', '-exec CMD {} \\;  tapılan hər fayl üçün əmr'], ex: ['find / -name "*.conf" 2>/dev/null', 'find / -perm -4000 -type f 2>/dev/null'] },
    chmod: { syn: 'chmod MODE FILE...', desc: 'Fayl icazələrini dəyişir. MODE ya rəqəmlə (755), ya da simvolla (u+x, go-w) verilir.', opts: ['r=4 w=2 x=1; sahib/qrup/digərləri üçün üç rəqəm'], ex: ['chmod 600 id_rsa', 'chmod +x script.sh'] },
    chown: { syn: 'chown USER[:GROUP] FILE...', desc: 'Faylın sahibini dəyişir (yalnız root).', opts: [] },
    sudo: { syn: 'sudo [-l] [-u USER] COMMAND', desc: 'Əmri başqa istifadəçi (adətən root) kimi icra edir.', opts: ['-l  icazə verilən əmrlərin siyahısı', '-i  root shell'] },
    ps: { syn: 'ps [aux]', desc: 'İşləyən prosesləri göstərir.', opts: ['aux  bütün istifadəçilərin bütün prosesləri'] },
    kill: { syn: 'kill [-9] PID', desc: 'Prosesə siqnal göndərir (-9 = məcburi dayandır).', opts: [] },
    ss: { syn: 'ss [-tulpn]', desc: 'Açıq şəbəkə soketlərini və dinləyən portları göstərir.', opts: ['-t TCP, -u UDP, -l listening, -p proses, -n rəqəmlə'] },
    head: { syn: 'head [-n N] [FILE]', desc: 'Faylın ilk N sətrini göstərir (default 10).', opts: [] },
    tail: { syn: 'tail [-n N] [FILE]', desc: 'Faylın son N sətrini göstərir.', opts: [] },
    sort: { syn: 'sort [OPTION] [FILE]', desc: 'Sətirləri sıralayır.', opts: ['-n  ədədi', '-r  tərsinə', '-u  təkrarsız', '-k N  N-ci sütuna görə'] },
    uniq: { syn: 'uniq [-c] [FILE]', desc: 'Yanaşı təkrarlanan sətirləri birləşdirir. Əvvəl sort lazımdır.', opts: ['-c  təkrar sayını göstər'], ex: ['cut -d" " -f1 access.log | sort | uniq -c | sort -nr | head'] },
    cut: { syn: 'cut -d DELIM -f FIELDS [FILE]', desc: 'Sətirlərdən sütun seçir.', opts: ['-d  ayırıcı', '-f  sahə nömrələri (1,3 və ya 2-4)', '-c  simvol mövqeləri'] },
    awk: { syn: "awk [-F sep] 'pattern { action }' [FILE]", desc: 'Sütunlarla işləmək üçün mini proqramlaşdırma dili.', opts: ['$1, $2 ... sütunlar, $0 bütün sətir, NF sütun sayı, NR sətir nömrəsi'], ex: ["awk '{print $1}' access.log", "awk '$9 == 404 {print $7}' access.log", "awk '{c[$1]++} END {for (k in c) print c[k], k}' access.log | sort -nr"] },
    sed: { syn: "sed 's/old/new/g' [FILE]", desc: 'Axın redaktoru: əvəzləmə, silmə, sətir seçmə.', opts: ["-n '2,4p'  yalnız 2-4-cü sətir", "'/re/d'  uyğun sətirləri sil"] },
    wc: { syn: 'wc [-lwc] [FILE]', desc: 'Sətir, söz və bayt sayır.', opts: ['-l sətir, -w söz, -c bayt'] },
    tr: { syn: "tr SET1 SET2", desc: 'Simvolları əvəz edir və ya silir (stdin-dən oxuyur).', opts: ['-d  sil'], ex: ["echo hello | tr 'a-z' 'A-Z'", "echo uryyb | tr 'a-zA-Z' 'n-za-mN-ZA-M'"] },
    file: { syn: 'file FILE...', desc: 'Faylın tipini məzmununa (magic bytes) görə təyin edir — adına yox.', opts: [] },
    strings: { syn: 'strings FILE', desc: 'İkili fayldan oxuna bilən mətn hissələrini çıxarır.', opts: ['-n N  minimum uzunluq'] },
    xxd: { syn: 'xxd FILE', desc: 'Faylın hex dump-ını göstərir.', opts: [] },
    base64: { syn: 'base64 [-d] [FILE]', desc: 'Base64 kodlaşdırma/dekodlaşdırma. Bu şifrələmə deyil, sadəcə kodlaşdırmadır!', opts: ['-d  dekod et'], ex: ['echo "salam" | base64', 'echo c2FsYW0K | base64 -d'] },
    md5sum: { syn: 'md5sum FILE', desc: 'MD5 hash hesablayır. sha1sum və sha256sum da eynidir.', opts: [] },
    ping: { syn: 'ping [-c N] HOST', desc: 'ICMP echo göndərib hostun əlçatanlığını və gecikməni yoxlayır.', opts: ['-c N  N paket göndər'] },
    traceroute: { syn: 'traceroute HOST', desc: 'Paketin hədəfə çatana qədər keçdiyi router-ləri (hop) göstərir.', opts: [] },
    nslookup: { syn: 'nslookup [-type=TYPE] NAME', desc: 'DNS sorğusu göndərir.', opts: ['-type=MX|TXT|NS|A'] },
    dig: { syn: 'dig NAME [TYPE] [+short]', desc: 'Ətraflı DNS sorğusu.', opts: ['+short  yalnız cavab'] },
    nmap: { syn: 'nmap [OPTIONS] TARGET', desc: 'Port skaneri: hostları və açıq xidmətləri aşkarlayır. YALNIZ icazə verilən sistemlərdə istifadə et!', opts: ['-sn  host discovery', '-p 1-1000  portlar', '-sV  versiya aşkarlama', '-A  agressiv (OS+versiya+skriptlər)', '-Pn  ping-i atla'] },
    curl: { syn: 'curl [OPTIONS] URL', desc: 'HTTP sorğuları göndərir.', opts: ['-i cavab başlıqları ilə', '-I yalnız başlıqlar (HEAD)', '-v ətraflı', '-X METHOD', '-d DATA', '-H "Header: value"', '-b "cookie=value"', '-L yönləndirməni izlə'] },
    hashcat: { syn: 'hashcat -m MODE HASHFILE WORDLIST', desc: 'Hash sındırma simulyatoru (lüğət hücumu). Mode: 0=MD5, 100=SHA1, 1400=SHA256.', opts: ['--show  əvvəl sındırılanları göstər'] },
  };
})();

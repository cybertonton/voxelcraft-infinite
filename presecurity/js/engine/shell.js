/* Simulated POSIX-like shell: tokenizer, pipes, redirects, globbing, $(...), permissions.
 * Commands live in PS.Shell.commands (see coreutils.js, sysutils.js, netsim.js ...). */
const PS = (globalThis.PS = globalThis.PS || {});

PS.Shell = class Shell {
  constructor(o = {}) {
    this.vfs = o.vfs || new PS.VFS();
    this.users = o.users || {
      analyst: { uid: 1000, home: '/home/analyst', groups: ['analyst'] },
      root: { uid: 0, home: '/root', groups: ['root'] },
    };
    this.user = o.user || 'analyst';
    this.userStack = [];
    this.host = o.host || 'lab';
    this.cwd = o.cwd || (this.users[this.user] || {}).home || '/';
    this.oldcwd = this.cwd;
    this.env = Object.assign({ PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', SHELL: '/bin/bash', LANG: 'en_US.UTF-8', TERM: 'xterm-256color' }, o.env || {});
    this.sudoers = o.sudoers || [];
    this.sudoRules = o.sudoRules || null;
    this.procs = o.procs || [];
    this.sockets = o.sockets || null;
    this.services = o.services || {};
    this.net = o.net || null;
    this.now = o.now || new Date(Date.UTC(2025, 9, 14, 9, 12, 44));
    this.data = o.data || {};
    this.extra = o.commands || {};
    this.aliases = {};
    this.history = [];
    this.lastCode = 0;
    this.onExec = o.onExec || null;
    this.banner = o.banner || '';
    this.flavor = 'linux';
    this.hooks = o.hooks || {};
    Object.entries(this.users).forEach(([u, rec]) => { if (rec.home && !this.vfs.get(rec.home)) this.vfs.mkdirp(rec.home, { owner: u, group: rec.groups[0], mode: u === 'root' ? 0o700 : 0o750 }); });
  }

  /* ------------------------------------------------------------ identity */
  get home() { return (this.users[this.user] || {}).home || '/'; }
  get groups() { return (this.users[this.user] || { groups: [this.user] }).groups; }
  get uid() { return (this.users[this.user] || { uid: 1000 }).uid; }

  prompt() {
    let d = this.cwd;
    if (d === this.home) d = '~';
    else if (d.startsWith(this.home + '/')) d = '~' + d.slice(this.home.length);
    return `${this.user}@${this.host}:${d}${this.user === 'root' ? '#' : '$'} `;
  }

  /* ------------------------------------------------------------ paths */
  abs(p) { return this.vfs.abs(p, this.cwd, this.home); }

  /** Resolve with traversal checks. Returns {abs, node} or {abs, err} */
  stat(p) {
    const abs = this.abs(p);
    if (abs === '/') return { abs, node: this.vfs.root };
    let n = this.vfs.root;
    const parts = abs.split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      if (n.t !== 'd') return { abs, err: 'Not a directory' };
      if (this.user !== 'root' && !this.vfs.can(n, 1, this.user, this.groups)) return { abs, err: 'Permission denied' };
      n = n.c[parts[i]];
      if (!n) return { abs, err: 'No such file or directory' };
    }
    return { abs, node: n };
  }

  readFile(p) {
    const s = this.stat(p);
    if (s.err) return { err: s.err, abs: s.abs };
    if (s.node.t === 'd') return { err: 'Is a directory', abs: s.abs };
    if (!this.vfs.can(s.node, 4, this.user, this.groups)) return { err: 'Permission denied', abs: s.abs };
    return { data: s.node.data, abs: s.abs, node: s.node };
  }

  writeFile(p, data, append = false) {
    const abs = this.abs(p);
    if (abs === '/dev/null') return {};
    const { dir, name } = this.vfs.parentOf(abs);
    const ps = this.stat(dir);
    if (ps.err) return { err: ps.err };
    if (ps.node.t !== 'd') return { err: 'Not a directory' };
    const ex = ps.node.c[name];
    if (ex) {
      if (ex.t === 'd') return { err: 'Is a directory' };
      if (!this.vfs.can(ex, 2, this.user, this.groups)) return { err: 'Permission denied' };
      ex.data = append ? ex.data + data : data;
      return {};
    }
    if (!this.vfs.can(ps.node, 2, this.user, this.groups)) return { err: 'Permission denied' };
    ps.node.c[name] = this.vfs.mkNode('f', { owner: this.user, group: this.groups[0], data, mtime: this.stamp() });
    return {};
  }

  stamp() {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][this.now.getUTCMonth()];
    return `${m} ${String(this.now.getUTCDate()).padStart(2)} ${String(this.now.getUTCHours()).padStart(2, '0')}:${String(this.now.getUTCMinutes()).padStart(2, '0')}`;
  }

  /* ------------------------------------------------------------ tokenizer */
  /** Expand "$VAR", "${VAR}", "$?" at position i of s. Returns [value, newIndex] or null */
  expandVar(s, i) {
    let m;
    const rest = s.slice(i);
    if ((m = /^\$\{(\w+)\}/.exec(rest))) return [this.env[m[1]] ?? '', i + m[0].length];
    if ((m = /^\$\?/.exec(rest))) return [String(this.lastCode), i + 2];
    if ((m = /^\$(\w+)/.exec(rest))) return [this.env[m[1]] ?? (m[1] === 'USER' ? this.user : m[1] === 'HOME' ? this.home : m[1] === 'PWD' ? this.cwd : m[1] === 'HOSTNAME' ? this.host : ''), i + m[0].length];
    return null;
  }

  tokenize(line) {
    const toks = [];
    let cur = null;
    const start = () => { if (!cur) cur = { s: '', glob: false }; return cur; };
    const flush = () => { if (cur) { toks.push({ type: 'w', val: cur.s, glob: cur.glob }); cur = null; } };
    const n = line.length;
    let i = 0;
    const subEnd = j => { // j points after "$("; return index of matching ")"
      let depth = 1;
      for (; j < n; j++) { if (line[j] === '(') depth++; else if (line[j] === ')' && --depth === 0) return j; }
      return -1;
    };
    while (i < n) {
      const c = line[i];
      if (c === ' ' || c === '\t') { flush(); i++; continue; }
      if (c === '#' && !cur) break;
      if (c === "'") {
        const e = line.indexOf("'", i + 1);
        if (e < 0) throw new Error("unexpected EOF while looking for matching `''");
        start().s += line.slice(i + 1, e); i = e + 1; continue;
      }
      if (c === '"') {
        start(); i++;
        let closed = false;
        while (i < n) {
          const d = line[i];
          if (d === '"') { closed = true; i++; break; }
          if (d === '\\' && i + 1 < n && '"\\$`'.includes(line[i + 1])) { cur.s += line[i + 1]; i += 2; continue; }
          if (d === '$' && line[i + 1] === '(') {
            const e = subEnd(i + 2);
            if (e < 0) throw new Error('unexpected EOF while looking for matching `)\'');
            cur.s += this.subshell(line.slice(i + 2, e)); i = e + 1; continue;
          }
          if (d === '$') { const r = this.expandVar(line, i); if (r) { cur.s += r[0]; i = r[1]; continue; } }
          cur.s += d; i++;
        }
        if (!closed) throw new Error('unexpected EOF while looking for matching `"\'');
        continue;
      }
      if (c === '\\' && i + 1 < n) { start().s += line[i + 1]; i += 2; continue; }
      if (c === '$' && line[i + 1] === '(') {
        const e = subEnd(i + 2);
        if (e < 0) throw new Error('unexpected EOF while looking for matching `)\'');
        const out = this.subshell(line.slice(i + 2, e)).split(/\s+/).filter(Boolean);
        out.forEach((w, k) => { if (k) flush(); start().s += w; });
        if (!out.length) start();
        i = e + 1; continue;
      }
      if (c === '$') { const r = this.expandVar(line, i); if (r) { start().s += r[0]; i = r[1]; continue; } }
      if (c === '~' && !cur && (i + 1 >= n || line[i + 1] === '/' || line[i + 1] === ' ')) { start().s += this.home; i++; continue; }
      if (c === '|' || c === ';' || c === '&' || c === '>' || c === '<' || (c === '2' && line[i + 1] === '>' && !cur)) {
        let op;
        if (c === '|') op = line[i + 1] === '|' ? '||' : '|';
        else if (c === ';') op = ';';
        else if (c === '&') op = line[i + 1] === '&' ? '&&' : '&';
        else if (c === '>') op = line[i + 1] === '>' ? '>>' : '>';
        else if (c === '<') op = '<';
        else op = line.slice(i, i + 3) === '2>>' ? '2>>' : line.slice(i, i + 4) === '2>&1' ? '2>&1' : '2>';
        flush();
        toks.push({ type: 'op', val: op });
        i += op.length; continue;
      }
      const w = start();
      if (c === '*' || c === '?' || c === '[') w.glob = true;
      w.s += c; i++;
    }
    flush();
    return toks;
  }

  /** run a nested command line and capture stdout (for $(...)) */
  subshell(line) {
    const r = this.execInner(line, true);
    return r.out.replace(/\n+$/, '');
  }

  globExpand(word) {
    if (!word.glob) return [word.val];
    const pat = word.val;
    const segs = pat.split('/');
    let results = [pat.startsWith('/') ? '/' : ''];
    segs.forEach((seg, idx) => {
      if (idx === 0 && pat.startsWith('/')) return;
      const next = [];
      for (const base of results) {
        const baseAbs = base === '' ? this.cwd : base;
        if (!/[*?[]/.test(seg)) { next.push(base === '' || base === '/' ? base + seg : base + '/' + seg); continue; }
        const st = this.stat(baseAbs);
        if (st.err || st.node.t !== 'd') continue;
        const re = new RegExp('^' + seg.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        for (const k of this.vfs.list(st.abs)) {
          if (k.startsWith('.') && !seg.startsWith('.')) continue;
          if (re.test(k)) next.push(base === '' ? k : base === '/' ? '/' + k : base + '/' + k);
        }
      }
      results = next;
    });
    return results.length ? results : [pat];
  }

  /* ------------------------------------------------------------ execution */
  exec(line) {
    const trimmed = line.trim();
    if (trimmed) this.history.push(trimmed);
    const res = this.execInner(line, false);
    if (this.onExec) { try { this.onExec(trimmed, res, this); } catch (e) { /* hooks must not break the shell */ } }
    return res;
  }

  execInner(line, capture) {
    const chunks = [];
    const result = { chunks, out: '', err: '', code: 0, clear: false };
    const emit = (s, e) => { if (s) chunks.push({ s, e }); };
    let toks;
    try { toks = this.tokenize(line); } catch (e) { emit(`bash: ${e.message}\n`, true); result.code = 2; return this.finish(result); }
    // split into pipelines by ; && ||
    const lists = [];
    let curp = [], curc = { words: [], redirs: [] }, join = ';';
    const endCmd = () => { curp.push(curc); curc = { words: [], redirs: [] }; };
    const endPipe = nextJoin => { endCmd(); lists.push({ join, pipe: curp }); curp = []; join = nextJoin; };
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.type === 'w') { curc.words.push(t); continue; }
      if (t.val === '|') { if (!curc.words.length) { emit("bash: syntax error near unexpected token `|'\n", true); result.code = 2; return this.finish(result); } endCmd(); continue; }
      if (t.val === ';' || t.val === '&&' || t.val === '||' || t.val === '&') {
        if (curc.words.length || curp.length) endPipe(t.val === '&' ? ';' : t.val);
        continue;
      }
      if (t.val === '2>&1') { curc.redirs.push({ op: '2>&1' }); continue; }
      const target = toks[i + 1];
      if (!target || target.type !== 'w') { emit("bash: syntax error near unexpected token `newline'\n", true); result.code = 2; return this.finish(result); }
      curc.redirs.push({ op: t.val, file: target.val }); i++;
    }
    if (curc.words.length || curp.length) endPipe(';');
    for (const item of lists) {
      if (item.join === '&&' && this.lastCode !== 0) continue;
      if (item.join === '||' && this.lastCode === 0) continue;
      this.runPipeline(item.pipe, emit);
    }
    result.code = this.lastCode;
    return this.finish(result);
  }

  finish(result) {
    result.out = result.chunks.filter(c => !c.e).map(c => c.s).join('');
    result.err = result.chunks.filter(c => c.e).map(c => c.s).join('');
    if (this.clearFlag) { result.clear = true; this.clearFlag = false; }
    return result;
  }

  runPipeline(cmds, emit) {
    let input = null;
    for (let ci = 0; ci < cmds.length; ci++) {
      const cmd = cmds[ci];
      const last = ci === cmds.length - 1;
      let words = [];
      cmd.words.forEach(w => { this.globExpand(w).forEach(x => words.push(x)); });
      // VAR=value assignment
      if (words.length && words.every(w => /^[A-Za-z_]\w*=/.test(w))) {
        words.forEach(w => { const k = w.indexOf('='); this.env[w.slice(0, k)] = w.slice(k + 1); });
        this.lastCode = 0; input = ''; continue;
      }
      if (words.length && this.aliases[words[0]]) {
        try { words = this.tokenize(this.aliases[words[0]]).filter(t => t.type === 'w').map(t => t.val).concat(words.slice(1)); } catch (e) { /* ignore */ }
      }
      let stdin = input, errToOut = false, errTarget = null, outTarget = null, outAppend = false;
      let bad = false;
      for (const r of cmd.redirs) {
        if (r.op === '<') {
          const f = this.readFile(r.file);
          if (f.err) { emit(`bash: ${r.file}: ${f.err}\n`, true); bad = true; } else stdin = f.data;
        } else if (r.op === '>' || r.op === '>>') { outTarget = r.file; outAppend = r.op === '>>'; }
        else if (r.op === '2>' || r.op === '2>>') errTarget = r.file;
        else if (r.op === '2>&1') errToOut = true;
      }
      if (bad) { this.lastCode = 1; input = ''; continue; }
      const outBuf = [];
      const io = {
        stdin,
        out: s => { outBuf.push(s); },
        err: s => { if (errTarget) { if (errTarget !== '/dev/null') this.writeFile(errTarget, s, true); } else if (errToOut) outBuf.push(s); else emit(s, true); },
        isTTY: last && !outTarget,
      };
      const name = words[0];
      let code = 0;
      if (name === undefined) { input = ''; continue; }
      try { code = this.run(name, words.slice(1), io) || 0; }
      catch (e) { emit(`bash: ${name}: internal error (${e.message})\n`, true); code = 1; }
      this.lastCode = code;
      const text = outBuf.join('');
      if (outTarget) {
        const w = this.writeFile(outTarget, text, outAppend);
        if (w.err) { emit(`bash: ${outTarget}: ${w.err}\n`, true); this.lastCode = 1; }
        input = '';
      } else if (last) { emit(text, false); input = ''; }
      else input = text;
    }
  }

  /** Execute one command by name (also used by sudo/xargs) */
  run(name, args, io) {
    const fn = this.extra[name] || PS.Shell.commands[name];
    if (!fn) {
      if (name.includes('/')) {
        const st = this.stat(name);
        if (st.err) { io.err(`bash: ${name}: ${st.err}\n`); return 127; }
        if (st.node.t === 'd') { io.err(`bash: ${name}: Is a directory\n`); return 126; }
        if (!this.vfs.can(st.node, 1, this.user, this.groups)) { io.err(`bash: ${name}: Permission denied\n`); return 126; }
        return this.runScript(st.node, args, io);
      }
      io.err(`bash: ${name}: command not found\n`);
      return 127;
    }
    return fn(this, args, io);
  }

  /** Run an executable file: either a shell script (#!) or a lab-defined program (node.run) */
  runScript(node, args, io) {
    if (typeof node.run === 'function') return node.run(this, args, io) || 0;
    if (/^#!/.test(node.data)) {
      let code = 0;
      node.data.split('\n').filter(l => l.trim() && !l.startsWith('#')).forEach(l => {
        const r = this.execInner(l, false);
        r.chunks.forEach(c => (c.e ? io.err(c.s) : io.out(c.s)));
        code = r.code;
      });
      return code;
    }
    io.err('bash: cannot execute binary file: Exec format error\n');
    return 126;
  }

  /* ------------------------------------------------------------ completion */
  complete(line) {
    const m = /^(.*?)(\S*)$/.exec(line);
    const before = m[1], word = m[2];
    const first = !before.trim();
    let cands = [];
    if (first && !word.includes('/')) {
      cands = Object.keys(Object.assign({}, PS.Shell.commands, this.extra)).filter(c => c.startsWith(word));
      if (!cands.length) return { before, word, cands };
    } else {
      const slash = word.lastIndexOf('/');
      const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
      const base = word.slice(slash + 1);
      const st = this.stat(dirPart || '.');
      if (!st.err && st.node.t === 'd' && this.vfs.can(st.node, 4, this.user, this.groups)) {
        cands = this.vfs.list(st.abs).filter(k => k.startsWith(base) && (base.startsWith('.') || !k.startsWith('.')))
          .map(k => dirPart + k + (st.node.c[k].t === 'd' ? '/' : ''));
      }
    }
    return { before, word, cands: cands.sort() };
  }

  /* ------------------------------------------------------------ helpers for commands */
  /** Parse short/long options. bool/val are strings of letters. Returns {o, r} */
  static opts(args, val = '', extraLong = {}) {
    const o = {}, r = [];
    let done = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (done || a === '-' || !a.startsWith('-') || a.length === 1) { r.push(a); continue; }
      if (a === '--') { done = true; continue; }
      if (a.startsWith('--')) {
        const k = a.slice(2), eq = k.indexOf('=');
        if (eq >= 0) o[k.slice(0, eq)] = k.slice(eq + 1); else if (extraLong[k]) o[k] = args[++i]; else o[k] = true;
        continue;
      }
      if (/^-\d+$/.test(a)) { o.num = +a.slice(1); continue; }
      for (let j = 1; j < a.length; j++) {
        const ch = a[j];
        if (val.includes(ch)) {
          const rest = a.slice(j + 1);
          o[ch] = rest !== '' ? rest : args[++i];
          break;
        }
        o[ch] = true;
      }
    }
    return { o, r };
  }

  fail(io, cmd, target, err) { io.err(`${cmd}: ${target}: ${err}\n`); return 1; }

  /** convert a grep/sed style pattern to RegExp (BRE-ish => JS) */
  static toRegex(pat, flags = '', fixed = false) {
    let p = pat;
    if (fixed) p = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    else {
      p = p.replace(/\\\|/g, '|').replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\+/g, '+').replace(/\\\?/g, '?')
        .replace(/\[:digit:\]/g, '0-9').replace(/\[:alpha:\]/g, 'a-zA-Z').replace(/\[:alnum:\]/g, 'a-zA-Z0-9')
        .replace(/\[:upper:\]/g, 'A-Z').replace(/\[:lower:\]/g, 'a-z').replace(/\[:space:\]/g, '\\s').replace(/\[:punct:\]/g, '!-\\/:-@\\[-`{-~')
        .replace(/\\</g, '\\b').replace(/\\>/g, '\\b');
    }
    try { return new RegExp(p, flags); } catch (e) {
      return new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    }
  }
};

PS.Shell.commands = {};

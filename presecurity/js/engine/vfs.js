/* Virtual filesystem with unix-style owners and permission bits */
const PS = (globalThis.PS = globalThis.PS || {});

PS.VFS = class VFS {
  constructor() {
    this.root = this.mkNode('d', { mode: 0o755, owner: 'root', group: 'root' });
  }

  mkNode(t, m = {}) {
    const n = {
      t, mode: m.mode ?? (t === 'd' ? 0o755 : 0o644), owner: m.owner || 'root', group: m.group || m.owner || 'root',
      mtime: m.mtime || 'Oct 14 08:30',
    };
    if (t === 'd') n.c = {}; else n.data = m.data || '';
    if (m.type) n.type = m.type;
    if (m.target) n.target = m.target;
    return n;
  }

  /** Normalise a path against cwd; returns absolute path without trailing slash */
  abs(path, cwd = '/', home = '/') {
    if (path === '~' || path.startsWith('~/')) path = home + path.slice(1);
    if (!path.startsWith('/')) path = cwd + '/' + path;
    const parts = [];
    for (const p of path.split('/')) {
      if (!p || p === '.') continue;
      if (p === '..') parts.pop(); else parts.push(p);
    }
    return '/' + parts.join('/');
  }

  get(abs) {
    let n = this.root;
    if (abs === '/') return n;
    for (const p of abs.split('/').filter(Boolean)) {
      if (!n || n.t !== 'd') return null;
      n = n.c[p];
    }
    return n || null;
  }

  parentOf(abs) {
    const i = abs.lastIndexOf('/');
    return { dir: abs.slice(0, i) || '/', name: abs.slice(i + 1) };
  }

  mkdirp(abs, meta = {}) {
    let n = this.root, cur = '';
    for (const p of abs.split('/').filter(Boolean)) {
      cur += '/' + p;
      if (!n.c[p]) {
        const m = /^\/home\/([^/]+)/.exec(cur);
        n.c[p] = this.mkNode('d', { owner: m ? m[1] : 'root', ...(cur === abs ? meta : {}) });
        if (m && cur === '/home/' + m[1]) n.c[p].mode = 0o750;
      }
      n = n.c[p];
    }
    return n;
  }

  write(abs, data, meta = {}) {
    const { dir, name } = this.parentOf(abs);
    const d = this.mkdirp(dir);
    const m = /^\/home\/([^/]+)/.exec(abs);
    const ex = d.c[name];
    if (ex && ex.t === 'f') { ex.data = data; if (meta.mode != null) ex.mode = meta.mode; return ex; }
    d.c[name] = this.mkNode('f', { owner: m ? m[1] : 'root', ...meta, data });
    return d.c[name];
  }

  /**
   * Bulk load. Values: string | { c: string, mode, owner, group, mtime, type } | { dir: true, mode, owner }
   * Keys ending with "/" create directories.
   */
  load(spec) {
    for (const k of Object.keys(spec)) {
      const v = spec[k];
      if (k.endsWith('/') || (v && v.dir)) { this.mkdirp(k.replace(/\/+$/, '') || '/', v && typeof v === 'object' ? v : {}); continue; }
      if (typeof v === 'string') this.write(k, v);
      else this.write(k, v.c, v);
    }
    return this;
  }

  /** unix permission check. bit: 4=r 2=w 1=x */
  can(node, bit, user, groups) {
    if (user === 'root') return bit !== 1 || node.t === 'd' || (node.mode & 0o111) !== 0;
    let shift = 0;
    if (node.owner === user) shift = 6; else if (groups.includes(node.group)) shift = 3;
    return ((node.mode >> shift) & bit) !== 0;
  }

  size(node) {
    if (node.t === 'd') return 4096;
    return PS.utf8 ? PS.utf8(node.data).length : node.data.length;
  }

  list(abs) {
    const n = this.get(abs);
    return n && n.t === 'd' ? Object.keys(n.c).sort((a, b) => a.replace(/^\./, '').toLowerCase().localeCompare(b.replace(/^\./, '').toLowerCase())) : [];
  }

  walk(abs, fn, depth = 0, maxDepth = Infinity) {
    const n = this.get(abs);
    if (!n) return;
    fn(abs, n, depth);
    if (n.t === 'd' && depth < maxDepth) {
      for (const k of this.list(abs)) this.walk((abs === '/' ? '' : abs) + '/' + k, fn, depth + 1, maxDepth);
    }
  }

  static modeString(n) {
    const t = n.t === 'd' ? 'd' : n.type === 'link' ? 'l' : '-';
    const bits = ['r', 'w', 'x'];
    let s = '';
    for (let i = 0; i < 9; i++) s += n.mode & (1 << (8 - i)) ? bits[i % 3] : '-';
    const sp = (idx, ch, bit) => {
      if (!(n.mode & bit)) return;
      const c = s[idx];
      s = s.slice(0, idx) + (c === 'x' ? ch : ch.toUpperCase()) + s.slice(idx + 1);
    };
    sp(2, 's', 0o4000); sp(5, 's', 0o2000); sp(8, 't', 0o1000);
    return t + s;
  }
};

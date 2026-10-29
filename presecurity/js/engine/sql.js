/* A small MySQL/MariaDB-flavoured SQL engine so SQL injection can be practised for real:
 * string concatenation really changes the query. Supports SELECT ... [UNION [ALL] SELECT ...]
 * WHERE / ORDER BY / LIMIT, comments (-- , #, block), information_schema and common functions. */
const PS = (globalThis.PS = globalThis.PS || {});

PS.SQL = (function () {
  class SQLError extends Error {}

  function tokenize(sql) {
    const toks = []; let i = 0; const n = sql.length;
    const err = (pos) => new SQLError(`You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near '${sql.slice(pos)}' at line 1`);
    while (i < n) {
      const c = sql[i]; const start = i;
      if (/\s/.test(c)) { i++; continue; }
      if (c === '#') { break; }
      if (c === '-' && sql[i + 1] === '-' && (i + 2 >= n || /[\s\x00-\x1f]/.test(sql[i + 2]))) break;
      if (c === '/' && sql[i + 1] === '*') { const e = sql.indexOf('*/', i + 2); if (e < 0) throw err(i); i = e + 2; continue; }
      if (c === "'" || c === '"') {
        let s = ''; i++; let closed = false;
        while (i < n) {
          if (sql[i] === '\\' && i + 1 < n) { const nx = sql[i + 1]; s += { n: '\n', t: '\t', r: '\r', 0: '\0' }[nx] ?? nx; i += 2; continue; }
          if (sql[i] === c) { if (sql[i + 1] === c) { s += c; i += 2; continue; } closed = true; i++; break; }
          s += sql[i++];
        }
        if (!closed) throw err(start);
        toks.push({ k: 'str', v: s, pos: start }); continue;
      }
      if (c === '`') { const e = sql.indexOf('`', i + 1); if (e < 0) throw err(i); toks.push({ k: 'id', v: sql.slice(i + 1, e), pos: start, q: true }); i = e + 1; continue; }
      let m;
      if ((m = /^0x[0-9a-fA-F]+/.exec(sql.slice(i)))) { toks.push({ k: 'str', v: Buffer_hex(m[0].slice(2)), pos: start }); i += m[0].length; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(sql.slice(i)))) { toks.push({ k: 'num', v: parseFloat(m[0]), pos: start }); i += m[0].length; continue; }
      if ((m = /^@@?\w+/.exec(sql.slice(i)))) { toks.push({ k: 'id', v: m[0], pos: start }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][\w$]*/.exec(sql.slice(i)))) { toks.push({ k: 'id', v: m[0], pos: start }); i += m[0].length; continue; }
      const two = sql.slice(i, i + 2);
      if (['<=', '>=', '<>', '!=', '||', '&&'].includes(two)) { toks.push({ k: 'op', v: two, pos: start }); i += 2; continue; }
      if ('=<>+-*/%(),.;'.includes(c)) { toks.push({ k: 'op', v: c, pos: start }); i++; continue; }
      throw err(i);
    }
    return toks;
  }
  function Buffer_hex(h) { let s = ''; for (let i = 0; i + 1 < h.length; i += 2) s += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return s; }

  const AGG = new Set(['count', 'group_concat', 'max', 'min', 'sum']);

  function parse(sql) {
    const toks = tokenize(sql); let p = 0;
    const syntax = () => { const t = toks[p]; return new SQLError(`You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near '${t ? sql.slice(t.pos) : ''}' at line 1`); };
    const peek = () => toks[p];
    const isKw = (...kws) => { const t = toks[p]; return t && t.k === 'id' && !t.q && kws.includes(t.v.toUpperCase()); };
    const isOp = v => toks[p] && toks[p].k === 'op' && toks[p].v === v;
    const eatKw = (...kws) => { if (isKw(...kws)) { p++; return true; } return false; };
    const eatOp = v => { if (isOp(v)) { p++; return true; } return false; };
    const needKw = kw => { if (!eatKw(kw)) throw syntax(); };
    const needOp = v => { if (!eatOp(v)) throw syntax(); };
    const RESERVED = new Set(['SELECT', 'FROM', 'WHERE', 'UNION', 'ORDER', 'LIMIT', 'GROUP', 'HAVING', 'AND', 'OR', 'NOT', 'AS', 'BY', 'ALL', 'DISTINCT', 'LIKE', 'IN', 'IS', 'NULL', 'OFFSET', 'ASC', 'DESC']);

    function parseQuery() {
      needKw('SELECT'); p--;
      const parts = [{ sel: parseSelect(), all: true }];
      while (isKw('UNION')) {
        p++; const all = eatKw('ALL'); eatKw('DISTINCT');
        parts.push({ sel: parseSelect(), all });
      }
      let order = null, limit = null;
      if (eatKw('ORDER')) {
        needKw('BY'); order = [];
        do { const e = parseExpr(); let desc = false; if (eatKw('DESC')) desc = true; else eatKw('ASC'); order.push({ e, desc }); } while (eatOp(','));
      }
      if (eatKw('LIMIT')) {
        const a = parseExpr(); let off = null, cnt = a;
        if (eatOp(',')) { off = a; cnt = parseExpr(); } else if (eatKw('OFFSET')) off = parseExpr();
        limit = { cnt, off };
      }
      eatOp(';');
      if (p < toks.length) throw syntax();
      return { parts, order, limit };
    }
    function parseSelect() {
      needKw('SELECT'); const distinct = eatKw('DISTINCT'); const cols = [];
      do {
        if (isOp('*')) { p++; cols.push({ star: true }); continue; }
        const e = parseExpr(); let alias = null;
        if (eatKw('AS')) { alias = toks[p++]?.v; } else if (peek() && peek().k === 'id' && !RESERVED.has(peek().v.toUpperCase()) && !peek().q) alias = toks[p++].v;
        cols.push({ e, alias, src: sql.slice(0, 0) });
      } while (eatOp(','));
      let from = null, where = null;
      if (eatKw('FROM')) {
        let name = toks[p++]; if (!name || name.k !== 'id') throw syntax();
        let tbl = name.v;
        if (eatOp('.')) { const t2 = toks[p++]; tbl = tbl + '.' + t2.v; }
        let alias = null;
        if (eatKw('AS')) alias = toks[p++].v; else if (peek() && peek().k === 'id' && !RESERVED.has(peek().v.toUpperCase())) alias = toks[p++].v;
        from = { name: tbl, alias };
      }
      if (eatKw('WHERE')) where = parseExpr();
      return { distinct, cols, from, where };
    }

    function parseExpr() { return parseOr(); }
    function parseOr() { let l = parseAnd(); while (isKw('OR') || isOp('||')) { p++; l = { t: 'or', l, r: parseAnd() }; } return l; }
    function parseAnd() { let l = parseNot(); while (isKw('AND') || isOp('&&')) { p++; l = { t: 'and', l, r: parseNot() }; } return l; }
    function parseNot() { if (eatKw('NOT')) return { t: 'not', e: parseNot() }; return parseCmp(); }
    function parseCmp() {
      let l = parseAdd();
      for (;;) {
        const t = peek();
        if (t && t.k === 'op' && ['=', '<>', '!=', '<', '>', '<=', '>='].includes(t.v)) { p++; l = { t: 'cmp', op: t.v, l, r: parseAdd() }; }
        else if (isKw('LIKE')) { p++; l = { t: 'like', l, r: parseAdd(), neg: false }; }
        else if (isKw('NOT') && toks[p + 1] && toks[p + 1].v && /^(LIKE|IN)$/i.test(toks[p + 1].v)) {
          p++; if (eatKw('LIKE')) l = { t: 'like', l, r: parseAdd(), neg: true }; else { p++; needOp('('); const list = []; do list.push(parseExpr()); while (eatOp(',')); needOp(')'); l = { t: 'in', l, list, neg: true }; }
        }
        else if (isKw('IN')) { p++; needOp('('); const list = []; do list.push(parseExpr()); while (eatOp(',')); needOp(')'); l = { t: 'in', l, list, neg: false }; }
        else if (isKw('IS')) { p++; const neg = eatKw('NOT'); needKw('NULL'); l = { t: 'isnull', e: l, neg }; }
        else break;
      }
      return l;
    }
    function parseAdd() { let l = parseMul(); while (isOp('+') || isOp('-')) { const op = toks[p++].v; l = { t: 'bin', op, l, r: parseMul() }; } return l; }
    function parseMul() { let l = parseUnary(); while (isOp('*') || isOp('/') || isOp('%')) { const op = toks[p++].v; l = { t: 'bin', op, l, r: parseUnary() }; } return l; }
    function parseUnary() { if (eatOp('-')) return { t: 'neg', e: parseUnary() }; if (eatOp('+')) return parseUnary(); return parsePrimary(); }
    function parsePrimary() {
      const t = toks[p];
      if (!t) throw syntax();
      if (t.k === 'num') { p++; return { t: 'lit', v: t.v }; }
      if (t.k === 'str') { p++; return { t: 'lit', v: t.v }; }
      if (t.k === 'op' && t.v === '(') {
        p++;
        if (isKw('SELECT')) { const q = parseSubquery(); needOp(')'); return { t: 'subq', q }; }
        const e = parseExpr(); needOp(')'); return e;
      }
      if (t.k === 'id') {
        const up = t.v.toUpperCase();
        if (!t.q && up === 'NULL') { p++; return { t: 'lit', v: null }; }
        if (!t.q && up === 'TRUE') { p++; return { t: 'lit', v: 1 }; }
        if (!t.q && up === 'FALSE') { p++; return { t: 'lit', v: 0 }; }
        if (!t.q && RESERVED.has(up) && up !== 'ALL') throw syntax();
        p++;
        if (isOp('(') && !t.q) {
          p++; const args = []; let star = false;
          if (isOp('*')) { p++; star = true; }
          else if (!isOp(')')) { eatKw('DISTINCT'); do args.push(parseExpr()); while (eatOp(',')); }
          needOp(')');
          return { t: 'fn', name: t.v.toLowerCase(), args, star };
        }
        if (isOp('.')) { p++; const c = toks[p++]; if (!c) throw syntax(); return { t: 'col', table: t.v, name: c.v }; }
        return { t: 'col', name: t.v };
      }
      throw syntax();
    }
    function parseSubquery() { const s = parseSelect(); return { parts: [{ sel: s, all: true }], order: null, limit: null }; }
    return parseQuery();
  }

  const num = v => (typeof v === 'number' ? v : v == null ? 0 : (parseFloat(v) || 0));
  const str = v => (v == null ? '' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(v)) : String(v));
  const truthy = v => v != null && (typeof v === 'number' ? v !== 0 : num(v) !== 0);

  class Engine {
    /** db: {name, version, user, tables: {name: {cols:[...], rows:[[...]]}}} */
    constructor(db) { this.db = db; }

    query(sql) {
      const ast = parse(sql);
      return this.runQuery(ast);
    }

    table(name) {
      let n = name.toLowerCase(), schema = this.db.name;
      if (n.includes('.')) { [schema, n] = n.split('.'); }
      if (schema.toLowerCase() === 'information_schema') {
        const out = { cols: [], rows: [] };
        if (n === 'tables') { out.cols = ['table_schema', 'table_name']; Object.keys(this.db.tables).forEach(t => out.rows.push([this.db.name, t])); return out; }
        if (n === 'columns') { out.cols = ['table_schema', 'table_name', 'column_name']; Object.entries(this.db.tables).forEach(([t, d]) => d.cols.forEach(c => out.rows.push([this.db.name, t, c]))); return out; }
        if (n === 'schemata') { out.cols = ['schema_name']; out.rows = [['information_schema'], [this.db.name]]; return out; }
        throw new SQLError(`Table 'information_schema.${n}' doesn't exist`);
      }
      if (schema.toLowerCase() !== this.db.name.toLowerCase()) throw new SQLError(`Table '${schema}.${n}' doesn't exist`);
      const key = Object.keys(this.db.tables).find(k => k.toLowerCase() === n);
      if (!key) throw new SQLError(`Table '${this.db.name}.${n}' doesn't exist`);
      return this.db.tables[key];
    }

    runQuery(ast) {
      const results = ast.parts.map(pt => this.runSelect(pt.sel, ast.parts.length === 1 ? ast : null));
      const ncols = results[0].cols.length;
      for (const r of results) if (r.cols.length !== ncols) throw new SQLError('The used SELECT statements have a different number of columns');
      let rows = [];
      results.forEach((r, i) => { rows = rows.concat(r.rows); if (i > 0 && !ast.parts[i].all) { const seen = new Set(); rows = rows.filter(x => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; }); } });
      const cols = results[0].cols;
      if (ast.parts.length > 1 && ast.order) rows = this.sortRows(rows, cols, ast.order, null);
      if (ast.limit) rows = this.applyLimit(rows, ast.limit);
      return { cols, rows };
    }

    applyLimit(rows, lim) {
      const cnt = num(this.evalExpr(lim.cnt, {})), off = lim.off ? num(this.evalExpr(lim.off, {})) : 0;
      return rows.slice(off, off + cnt);
    }

    sortRows(rows, cols, order, srcCtxs) {
      const idx = rows.map((r, i) => i);
      const keyOf = (o, i) => {
        if (o.e.t === 'lit' && typeof o.e.v === 'number') {
          if (o.e.v < 1 || o.e.v > cols.length) throw new SQLError(`Unknown column '${o.e.v}' in 'order clause'`);
          return rows[i][o.e.v - 1];
        }
        if (o.e.t === 'col' && !o.e.table) { const ci = cols.findIndex(c => c.toLowerCase() === o.e.name.toLowerCase()); if (ci >= 0) return rows[i][ci]; }
        if (srcCtxs) return this.evalExpr(o.e, srcCtxs[i], "order clause");
        throw new SQLError(`Unknown column '${o.e.name || '?'}' in 'order clause'`);
      };
      const keys = rows.map((r, i) => order.map(o => keyOf(o, i)));
      idx.sort((a, b) => {
        for (let k = 0; k < order.length; k++) {
          const x = keys[a][k], y = keys[b][k]; let c;
          if (typeof x === 'number' && typeof y === 'number') c = x - y; else c = str(x).toLowerCase() < str(y).toLowerCase() ? -1 : str(x).toLowerCase() > str(y).toLowerCase() ? 1 : 0;
          if (c) return order[k].desc ? -c : c;
        }
        return 0;
      });
      return idx.map(i => rows[i]);
    }

    runSelect(sel, outer) {
      let ctxs;
      if (sel.from) {
        const t = this.table(sel.from.name);
        const tname = (sel.from.alias || sel.from.name.split('.').pop()).toLowerCase();
        ctxs = t.rows.map(r => { const o = {}; t.cols.forEach((c, i) => { o[c.toLowerCase()] = r[i]; }); return { row: o, table: tname, cols: t.cols }; });
        this.curCols = t.cols;
      } else ctxs = [{ row: {}, table: '', cols: [] }];
      if (sel.where) ctxs = ctxs.filter(c => truthy(this.evalExpr(sel.where, c, 'where clause')));
      // expand select list
      const out = []; const names = [];
      const tcols = sel.from ? this.table(sel.from.name).cols : [];
      sel.cols.forEach(c => {
        if (c.star) { if (!sel.from) throw new SQLError("No tables used"); tcols.forEach(cn => { out.push({ e: { t: 'col', name: cn } }); names.push(cn); }); }
        else { out.push(c); names.push(c.alias || this.exprName(c.e)); }
      });
      const hasAgg = out.some(c => this.hasAgg(c.e));
      let rows, srcs;
      if (hasAgg) {
        rows = [out.map(c => this.evalAgg(c.e, ctxs))]; srcs = [ctxs[0] || { row: {}, table: '', cols: [] }];
      } else {
        rows = ctxs.map(c => out.map(col => this.evalExpr(col.e, c, 'field list'))); srcs = ctxs;
      }
      if (sel.distinct) { const seen = new Set(); const nr = [], ns = []; rows.forEach((r, i) => { const k = JSON.stringify(r); if (!seen.has(k)) { seen.add(k); nr.push(r); ns.push(srcs[i]); } }); rows = nr; srcs = ns; }
      if (outer && outer.order) rows = this.sortRows(rows, names, outer.order, srcs);
      if (outer && outer.limit) rows = this.applyLimit(rows, outer.limit);
      return { cols: names, rows };
    }

    exprName(e) {
      if (e.t === 'col') return e.name;
      if (e.t === 'lit') return str(e.v);
      if (e.t === 'fn') return `${e.name}(${e.star ? '*' : e.args.map(a => this.exprName(a)).join(',')})`;
      return 'expr';
    }
    hasAgg(e) { if (!e || typeof e !== 'object') return false; if (e.t === 'fn' && AGG.has(e.name)) return true; return Object.values(e).some(v => (Array.isArray(v) ? v.some(x => this.hasAgg(x)) : this.hasAgg(v))); }
    evalAgg(e, ctxs) {
      if (e.t === 'fn' && AGG.has(e.name)) {
        const vals = e.star ? ctxs.map(() => 1) : ctxs.map(c => this.evalExpr(e.args[0], c, 'field list'));
        if (e.name === 'count') return e.star ? vals.length : vals.filter(v => v != null).length;
        if (e.name === 'group_concat') return vals.length ? vals.map(str).join(',') : null;
        if (e.name === 'max') return vals.reduce((a, b) => (a == null || num(b) > num(a) ? b : a), null);
        if (e.name === 'min') return vals.reduce((a, b) => (a == null || num(b) < num(a) ? b : a), null);
        return vals.reduce((a, b) => a + num(b), 0);
      }
      return this.evalExpr(e, ctxs[0] || { row: {}, table: '', cols: [] }, 'field list');
    }

    evalExpr(e, ctx, clause = 'where clause') {
      const ev = x => this.evalExpr(x, ctx, clause);
      switch (e.t) {
        case 'lit': return e.v;
        case 'col': {
          const k = e.name.toLowerCase();
          if (k === '@@version') return this.db.version;
          if (k === '@@hostname') return this.db.host || 'web01';
          if (k === '@@datadir') return '/var/lib/mysql/';
          if (e.table && ctx.table && e.table.toLowerCase() !== ctx.table && e.table.toLowerCase() !== (this.db.name || '').toLowerCase()) throw new SQLError(`Unknown column '${e.table}.${e.name}' in '${clause}'`);
          if (!(k in ctx.row)) throw new SQLError(`Unknown column '${e.name}' in '${clause}'`);
          return ctx.row[k];
        }
        case 'neg': return -num(ev(e.e));
        case 'not': return truthy(ev(e.e)) ? 0 : 1;
        case 'or': return truthy(ev(e.l)) || truthy(ev(e.r)) ? 1 : 0;
        case 'and': return truthy(ev(e.l)) && truthy(ev(e.r)) ? 1 : 0;
        case 'isnull': return (ev(e.e) == null) !== e.neg ? 1 : 0;
        case 'bin': { const a = num(ev(e.l)), b = num(ev(e.r)); return e.op === '+' ? a + b : e.op === '-' ? a - b : e.op === '*' ? a * b : e.op === '/' ? (b === 0 ? null : a / b) : (b === 0 ? null : a % b); }
        case 'cmp': {
          const a = ev(e.l), b = ev(e.r);
          if (a == null || b == null) return null;
          let x, y;
          if (typeof a === 'number' || typeof b === 'number') { x = num(a); y = num(b); } else { x = str(a).toLowerCase(); y = str(b).toLowerCase(); }
          return (e.op === '=' ? x === y : e.op === '<>' || e.op === '!=' ? x !== y : e.op === '<' ? x < y : e.op === '>' ? x > y : e.op === '<=' ? x <= y : x >= y) ? 1 : 0;
        }
        case 'like': {
          const a = str(ev(e.l)), b = str(ev(e.r));
          const re = new RegExp('^' + b.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'is');
          return re.test(a) !== e.neg ? 1 : 0;
        }
        case 'in': { const a = ev(e.l); const hit = e.list.some(x => { const v = ev(x); return typeof a === 'number' || typeof v === 'number' ? num(a) === num(v) : str(a).toLowerCase() === str(v).toLowerCase(); }); return hit !== e.neg ? 1 : 0; }
        case 'subq': { const r = this.runQuery(e.q); return r.rows[0] ? r.rows[0][0] : null; }
        case 'fn': return this.fn(e, ev);
        default: throw new SQLError('Unsupported expression');
      }
    }

    fn(e, ev) {
      const a = e.args.map(ev);
      switch (e.name) {
        case 'version': return this.db.version;
        case 'database': case 'schema': return this.db.name;
        case 'user': case 'current_user': case 'session_user': case 'system_user': return this.db.user;
        case 'concat': return a.some(x => x == null) ? null : a.map(str).join('');
        case 'concat_ws': return a.slice(1).filter(x => x != null).map(str).join(str(a[0]));
        case 'length': case 'char_length': return str(a[0]).length;
        case 'lower': case 'lcase': return str(a[0]).toLowerCase();
        case 'upper': case 'ucase': return str(a[0]).toUpperCase();
        case 'substring': case 'substr': case 'mid': { const s = str(a[0]); const st = num(a[1]); return s.substr(st > 0 ? st - 1 : Math.max(0, s.length + st), a[2] != null ? num(a[2]) : undefined); }
        case 'ascii': return str(a[0]).charCodeAt(0) || 0;
        case 'char': return a.map(x => String.fromCharCode(num(x))).join('');
        case 'md5': return PS.hash.md5(str(a[0]));
        case 'sha1': return PS.hash.sha1(str(a[0]));
        case 'if': return truthy(a[0]) ? a[1] : a[2];
        case 'ifnull': return a[0] == null ? a[1] : a[0];
        case 'sleep': return 0;
        case 'hex': return Array.from(PS.utf8(str(a[0]))).map(b => PS.hex(b)).join('').toUpperCase();
        case 'now': return '2025-10-14 09:12:44';
        case 'count': case 'group_concat': case 'max': case 'min': case 'sum': throw new SQLError('Invalid use of group function');
        default: throw new SQLError(`FUNCTION ${this.db.name}.${e.name.toUpperCase()} does not exist`);
      }
    }
  }

  return { Engine, SQLError, parse, tokenize };
})();

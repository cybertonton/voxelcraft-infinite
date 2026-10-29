/* A compact AWK interpreter (subset) for log-analysis labs: patterns, print/printf, arrays,
 * BEGIN/END, if/for/while, common builtins. */
const PS = (globalThis.PS = globalThis.PS || {});

PS.awk = (function () {
  const KEYWORDS = new Set(['BEGIN', 'END', 'print', 'printf', 'if', 'else', 'for', 'while', 'in', 'next', 'exit', 'delete']);

  function tokenize(src) {
    const toks = []; let i = 0;
    const valueEnd = () => { const t = toks[toks.length - 1]; return t && (t.k === 'num' || t.k === 'str' || t.k === 'id' || t.v === ')' || t.v === ']' || t.k === 'regex'); };
    while (i < src.length) {
      const c = src[i];
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '\n') { toks.push({ k: 'op', v: ';' }); i++; continue; }
      if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
      let m;
      if ((m = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i))) || (m = /^\.\d+/.exec(src.slice(i)))) { toks.push({ k: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (c === '"') {
        let s = ''; i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i] === '\\') { const n = src[++i]; s += { n: '\n', t: '\t', '"': '"', '\\': '\\', '/': '/' }[n] ?? '\\' + n; } else s += src[i];
          i++;
        }
        i++; toks.push({ k: 'str', v: s }); continue;
      }
      if (c === '/' && !valueEnd()) {
        let s = ''; i++;
        while (i < src.length && src[i] !== '/') { if (src[i] === '\\' && src[i + 1] === '/') { s += '/'; i += 2; continue; } s += src[i++]; }
        i++; toks.push({ k: 'regex', v: s }); continue;
      }
      if ((m = /^[A-Za-z_]\w*/.exec(src.slice(i)))) {
        const w = m[0]; i += w.length;
        if (KEYWORDS.has(w)) toks.push({ k: 'kw', v: w });
        else if (src[i] === '(') toks.push({ k: 'fn', v: w });
        else toks.push({ k: 'id', v: w });
        continue;
      }
      const three = src.slice(i, i + 2);
      if (['&&', '||', '==', '!=', '<=', '>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '!~'].includes(three)) { toks.push({ k: 'op', v: three }); i += 2; continue; }
      toks.push({ k: 'op', v: c }); i++;
    }
    return toks;
  }

  function parse(src) {
    const toks = tokenize(src); let p = 0;
    const peek = () => toks[p] || { k: 'eof' };
    const isOp = v => peek().k === 'op' && peek().v === v;
    const isKw = v => peek().k === 'kw' && peek().v === v;
    const eat = v => { if (isOp(v)) { p++; return true; } return false; };
    const need = v => { if (!eat(v)) throw new Error(`syntax error at '${peek().v ?? 'end'}', expected '${v}'`); };
    const skipSemi = () => { while (isOp(';')) p++; };

    function parseProgram() {
      const rules = []; skipSemi();
      while (peek().k !== 'eof') {
        let rule = { pattern: null, body: null, kind: 'main' };
        if (isKw('BEGIN')) { p++; rule.kind = 'begin'; rule.body = parseBlock(); }
        else if (isKw('END')) { p++; rule.kind = 'end'; rule.body = parseBlock(); }
        else {
          if (!isOp('{')) rule.pattern = parseExpr();
          if (isOp('{')) rule.body = parseBlock();
        }
        rules.push(rule); skipSemi();
      }
      return rules;
    }
    function parseBlock() {
      need('{'); const stmts = []; skipSemi();
      while (!isOp('}')) { if (peek().k === 'eof') throw new Error('syntax error: missing }'); stmts.push(parseStmt()); skipSemi(); }
      need('}'); return stmts;
    }
    function parseStmtOrBlock() { if (isOp('{')) return { t: 'block', body: parseBlock() }; const s = parseStmt(); return s; }
    function parseStmt() {
      const t = peek();
      if (t.k === 'kw') {
        if (t.v === 'print' || t.v === 'printf') {
          p++; const args = [];
          if (!isOp(';') && !isOp('}') && peek().k !== 'eof') { args.push(parseExpr()); while (eat(',')) args.push(parseExpr()); }
          return { t: t.v, args };
        }
        if (t.v === 'next') { p++; return { t: 'next' }; }
        if (t.v === 'exit') { p++; return { t: 'exit' }; }
        if (t.v === 'delete') { p++; const name = peek().v; p++; need('['); const idx = parseExpr(); need(']'); return { t: 'delete', name, idx }; }
        if (t.v === 'if') {
          p++; need('('); const cond = parseExpr(); need(')'); skipSemi();
          const then = parseStmtOrBlock(); skipSemi();
          let els = null;
          if (isKw('else')) { p++; skipSemi(); els = parseStmtOrBlock(); }
          return { t: 'if', cond, then, els };
        }
        if (t.v === 'while') { p++; need('('); const cond = parseExpr(); need(')'); skipSemi(); return { t: 'while', cond, body: parseStmtOrBlock() }; }
        if (t.v === 'for') {
          p++; need('(');
          if (peek().k === 'id' && toks[p + 1] && toks[p + 1].v === 'in') {
            const v = peek().v; p += 2; const arr = peek().v; p++; need(')'); skipSemi();
            return { t: 'forin', v, arr, body: parseStmtOrBlock() };
          }
          const init = isOp(';') ? null : parseExpr(); need(';');
          const cond = isOp(';') ? null : parseExpr(); need(';');
          const incr = isOp(')') ? null : parseExpr(); need(')'); skipSemi();
          return { t: 'for', init, cond, incr, body: parseStmtOrBlock() };
        }
      }
      if (isOp('{')) return { t: 'block', body: parseBlock() };
      return { t: 'expr', e: parseExpr() };
    }

    function parseExpr() { return parseAssign(); }
    function parseAssign() {
      const left = parseTernary();
      const t = peek();
      if (t.k === 'op' && ['=', '+=', '-=', '*=', '/=', '%='].includes(t.v) && ['var', 'idx', 'field'].includes(left.t)) {
        p++; return { t: 'assign', op: t.v, left, right: parseAssign() };
      }
      return left;
    }
    function parseTernary() {
      const c = parseOr();
      if (eat('?')) { const a = parseAssign(); need(':'); const b = parseAssign(); return { t: 'cond', c, a, b }; }
      return c;
    }
    function parseOr() { let l = parseAnd(); while (isOp('||')) { p++; l = { t: 'or', l, r: parseAnd() }; } return l; }
    function parseAnd() { let l = parseIn(); while (isOp('&&')) { p++; l = { t: 'and', l, r: parseIn() }; } return l; }
    function parseIn() {
      let l = parseMatch();
      while (isKw('in')) { p++; const arr = peek().v; p++; l = { t: 'in', key: l, arr }; }
      return l;
    }
    function parseMatch() {
      let l = parseCmp();
      while (isOp('~') || isOp('!~')) { const neg = peek().v === '!~'; p++; l = { t: 'match', l, r: parseCmp(), neg }; }
      return l;
    }
    function parseCmp() {
      let l = parseConcat();
      const t = peek();
      if (t.k === 'op' && ['<', '<=', '>', '>=', '==', '!='].includes(t.v)) { p++; return { t: 'cmp', op: t.v, l, r: parseConcat() }; }
      return l;
    }
    const startsExpr = () => {
      const t = peek();
      return t.k === 'num' || t.k === 'str' || t.k === 'id' || t.k === 'fn' || (t.k === 'op' && (t.v === '$' || t.v === '(' || t.v === '!')) || t.k === 'regex';
    };
    function parseConcat() {
      let l = parseAdd();
      while (startsExpr() && !(peek().k === 'op' && peek().v === '!')) l = { t: 'concat', l, r: parseAdd() };
      return l;
    }
    function parseAdd() {
      let l = parseMul();
      while (isOp('+') || isOp('-')) { const op = peek().v; p++; l = { t: 'bin', op, l, r: parseMul() }; }
      return l;
    }
    function parseMul() {
      let l = parseUnary();
      while (isOp('*') || isOp('/') || isOp('%')) { const op = peek().v; p++; l = { t: 'bin', op, l, r: parseUnary() }; }
      return l;
    }
    function parseUnary() {
      if (eat('!')) return { t: 'not', e: parseUnary() };
      if (eat('-')) return { t: 'neg', e: parseUnary() };
      if (eat('+')) return { t: 'pos', e: parseUnary() };
      return parsePow();
    }
    function parsePow() { const b = parsePostfix(); if (eat('^')) return { t: 'bin', op: '^', l: b, r: parseUnary() }; return b; }
    function parsePostfix() {
      if (isOp('++') || isOp('--')) { const op = peek().v; p++; const e = parsePrimary(); return { t: 'incr', op, e, pre: true }; }
      const e = parsePrimary();
      if ((isOp('++') || isOp('--')) && ['var', 'idx', 'field'].includes(e.t)) { const op = peek().v; p++; return { t: 'incr', op, e, pre: false }; }
      return e;
    }
    function parsePrimary() {
      const t = peek();
      if (t.k === 'num') { p++; return { t: 'num', v: t.v }; }
      if (t.k === 'str') { p++; return { t: 'str', v: t.v }; }
      if (t.k === 'regex') { p++; return { t: 'regex', v: t.v }; }
      if (t.k === 'op' && t.v === '$') { p++; return { t: 'field', e: parsePostfixNoIncr() }; }
      if (t.k === 'op' && t.v === '(') { p++; const e = parseExpr(); need(')'); return { t: 'group', e }; }
      if (t.k === 'fn') {
        p++; need('('); const args = [];
        if (!isOp(')')) { args.push(parseExpr()); while (eat(',')) args.push(parseExpr()); }
        need(')'); return { t: 'call', name: t.v, args };
      }
      if (t.k === 'id') {
        p++;
        if (isOp('[')) { p++; const idx = parseExpr(); need(']'); return { t: 'idx', name: t.v, idx }; }
        return { t: 'var', name: t.v };
      }
      throw new Error(`syntax error at '${t.v ?? 'end of program'}'`);
    }
    function parsePostfixNoIncr() { return parsePrimary(); }
    return parseProgram();
  }

  const NEXT = { next: true }, EXIT = { exit: true };
  const looksNum = s => typeof s === 'string' && /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(s);
  const toNum = v => (typeof v === 'number' ? v : (parseFloat(v) || 0));
  const toStr = v => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(parseFloat(v.toPrecision(6)))) : v == null ? '' : String(v));

  function format(fmt, args) {
    let ai = 0;
    return fmt.replace(/%([-+ 0#]*)(\d+)?(?:\.(\d+))?([sdifcxXeEgGo%])/g, (m, flags, width, prec, conv) => {
      if (conv === '%') return '%';
      const a = args[ai++];
      let s;
      if (conv === 's') { s = toStr(a); if (prec != null) s = s.slice(0, +prec); }
      else if (conv === 'c') s = typeof a === 'number' ? String.fromCharCode(a) : toStr(a)[0] || '';
      else if (conv === 'd' || conv === 'i') s = String(Math.trunc(toNum(a)));
      else if (conv === 'f') s = toNum(a).toFixed(prec != null ? +prec : 6);
      else if (conv === 'x') s = Math.trunc(toNum(a)).toString(16);
      else if (conv === 'X') s = Math.trunc(toNum(a)).toString(16).toUpperCase();
      else if (conv === 'o') s = Math.trunc(toNum(a)).toString(8);
      else s = String(toNum(a));
      if (flags.includes('+') && 'dif'.includes(conv) && toNum(a) >= 0) s = '+' + s;
      const w = +width || 0;
      if (s.length < w) s = flags.includes('-') ? s.padEnd(w) : flags.includes('0') && 'difxX'.includes(conv) ? s.padStart(w, '0') : s.padStart(w);
      return s;
    });
  }

  function run(rules, text, opts = {}) {
    const vars = { FS: opts.FS ?? ' ', OFS: ' ', NR: 0, NF: 0, ORS: '\n', RSTART: 0, RLENGTH: -1 };
    (opts.assign || []).forEach(([k, v]) => { vars[k] = looksNum(v) ? parseFloat(v) : v; });
    const arrs = {};
    let fields = [''], out = '';
    const emit = s => { out += s; };
    const setRecord = line => {
      const fs = toStr(vars.FS);
      let parts;
      if (fs === ' ') parts = line.trim() === '' ? [] : line.trim().split(/[ \t]+/);
      else if (fs.length === 1) parts = line === '' ? [] : line.split(fs);
      else parts = line === '' ? [] : line.split(new RegExp(fs));
      fields = [line, ...parts]; vars.NF = parts.length;
    };
    const getField = n => { n = Math.trunc(toNum(n)); if (n === 0) return fields[0]; return fields[n] ?? ''; };
    const setField = (n, v) => {
      n = Math.trunc(toNum(n)); v = toStr(v);
      if (n === 0) { setRecord(v); return; }
      while (fields.length <= n) fields.push('');
      fields[n] = v; vars.NF = Math.max(vars.NF, n);
      fields[0] = fields.slice(1, vars.NF + 1).join(toStr(vars.OFS));
    };
    const reOf = (node, e) => {
      if (node.t === 'regex') return new RegExp(node.v);
      const s = toStr(ev(node));
      try { return new RegExp(s); } catch (x) { return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }
    };
    function assignTo(left, v) {
      if (left.t === 'var') vars[left.name] = v;
      else if (left.t === 'idx') { (arrs[left.name] = arrs[left.name] || {})[toStr(ev(left.idx))] = v; }
      else setField(ev(left.e), v);
      return v;
    }
    function ev(n) {
      switch (n.t) {
        case 'num': return n.v;
        case 'str': return n.v;
        case 'group': return ev(n.e);
        case 'regex': return new RegExp(n.v).test(fields[0]) ? 1 : 0;
        case 'var': return n.name in vars ? vars[n.name] : '';
        case 'field': return getField(ev(n.e));
        case 'idx': { const a = arrs[n.name]; const k = toStr(ev(n.idx)); return a && k in a ? a[k] : ''; }
        case 'assign': {
          let v = ev(n.right);
          if (n.op !== '=') {
            const cur = toNum(ev(n.left)), r = toNum(v);
            v = n.op === '+=' ? cur + r : n.op === '-=' ? cur - r : n.op === '*=' ? cur * r : n.op === '/=' ? cur / r : cur % r;
          }
          return assignTo(n.left, v);
        }
        case 'incr': {
          const cur = toNum(ev(n.e)); const nv = n.op === '++' ? cur + 1 : cur - 1;
          assignTo(n.e, nv); return n.pre ? nv : cur;
        }
        case 'cond': return truthy(ev(n.c)) ? ev(n.a) : ev(n.b);
        case 'or': return truthy(ev(n.l)) || truthy(ev(n.r)) ? 1 : 0;
        case 'and': return truthy(ev(n.l)) && truthy(ev(n.r)) ? 1 : 0;
        case 'not': return truthy(ev(n.e)) ? 0 : 1;
        case 'neg': return -toNum(ev(n.e));
        case 'pos': return toNum(ev(n.e));
        case 'in': { const a = arrs[n.arr]; return a && toStr(ev(n.key)) in a ? 1 : 0; }
        case 'match': { const l = toStr(ev(n.l)); const hit = reOf(n.r).test(l); return hit !== n.neg ? 1 : 0; }
        case 'cmp': {
          const a = ev(n.l), b = ev(n.r);
          const strMode = n.l.t === 'str' || n.r.t === 'str' || n.l.t === 'concat' || n.r.t === 'concat';
          const numeric = !strMode && (typeof a === 'number' || looksNum(a) || a === '') && (typeof b === 'number' || looksNum(b) || b === '') && !(a === '' && b === '');
          const x = numeric ? toNum(a) : toStr(a), y = numeric ? toNum(b) : toStr(b);
          const r = n.op === '==' ? x === y : n.op === '!=' ? x !== y : n.op === '<' ? x < y : n.op === '<=' ? x <= y : n.op === '>' ? x > y : x >= y;
          return r ? 1 : 0;
        }
        case 'concat': return toStr(ev(n.l)) + toStr(ev(n.r));
        case 'bin': {
          const a = toNum(ev(n.l)), b = toNum(ev(n.r));
          return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : n.op === '/' ? (b === 0 ? (() => { throw new Error('division by zero'); })() : a / b) : n.op === '%' ? a % b : Math.pow(a, b);
        }
        case 'call': return call(n);
        default: throw new Error('unsupported expression ' + n.t);
      }
    }
    const truthy = v => (typeof v === 'number' ? v !== 0 : v !== '' && v != null && !(looksNum(v) && parseFloat(v) === 0 && false));
    function call(n) {
      const a = n.args;
      switch (n.name) {
        case 'length': return a.length ? (a[0].t === 'var' && arrs[a[0].name] ? Object.keys(arrs[a[0].name]).length : toStr(ev(a[0])).length) : fields[0].length;
        case 'tolower': return toStr(ev(a[0])).toLowerCase();
        case 'toupper': return toStr(ev(a[0])).toUpperCase();
        case 'int': return Math.trunc(toNum(ev(a[0])));
        case 'sqrt': return Math.sqrt(toNum(ev(a[0])));
        case 'substr': { const s = toStr(ev(a[0])); let st = Math.trunc(toNum(ev(a[1]))); const len = a[2] ? Math.trunc(toNum(ev(a[2]))) : s.length; if (st < 1) st = 1; return s.substr(st - 1, len); }
        case 'index': return toStr(ev(a[0])).indexOf(toStr(ev(a[1]))) + 1;
        case 'sprintf': return format(toStr(ev(a[0])), a.slice(1).map(ev));
        case 'split': {
          const s = toStr(ev(a[0])); const sep = a[2] ? (a[2].t === 'regex' ? new RegExp(a[2].v) : toStr(ev(a[2]))) : toStr(vars.FS);
          const parts = sep === ' ' ? s.trim().split(/\s+/).filter(Boolean) : s.split(sep);
          arrs[a[1].name] = {}; parts.forEach((x, i) => { arrs[a[1].name][String(i + 1)] = x; }); return parts.length;
        }
        case 'sub': case 'gsub': {
          const re = a[0].t === 'regex' ? new RegExp(a[0].v, n.name === 'gsub' ? 'g' : '') : new RegExp(toStr(ev(a[0])), n.name === 'gsub' ? 'g' : '');
          const target = a[2] || { t: 'field', e: { t: 'num', v: 0 } };
          const cur = toStr(ev(target)); let cnt = 0;
          const res = cur.replace(re, m => { cnt++; return toStr(ev(a[1])).replace(/\\&/g, '\u0001').replace(/&/g, m).replace(/\u0001/g, '&'); });
          if (cnt) assignTo(target, res); return cnt;
        }
        case 'match': { const re = reOf(a[1]); const m = re.exec(toStr(ev(a[0]))); vars.RSTART = m ? m.index + 1 : 0; vars.RLENGTH = m ? m[0].length : -1; return vars.RSTART; }
        default: throw new Error(`function ${n.name} never defined`);
      }
    }
    function exec(stmts) {
      for (const s of stmts) execOne(s);
    }
    function execOne(s) {
      switch (s.t) {
        case 'print': emit((s.args.length ? s.args.map(a => toStr(ev(a))).join(toStr(vars.OFS)) : fields[0]) + toStr(vars.ORS)); break;
        case 'printf': emit(format(toStr(ev(s.args[0])), s.args.slice(1).map(ev))); break;
        case 'expr': ev(s.e); break;
        case 'block': exec(s.body); break;
        case 'if': if (truthy(ev(s.cond))) execOne(s.then); else if (s.els) execOne(s.els); break;
        case 'while': { let guard = 0; while (truthy(ev(s.cond)) && guard++ < 1e6) execOne(s.body); break; }
        case 'for': { if (s.init) ev(s.init); let guard = 0; while ((!s.cond || truthy(ev(s.cond))) && guard++ < 1e6) { execOne(s.body); if (s.incr) ev(s.incr); } break; }
        case 'forin': { const a = arrs[s.arr] || {}; for (const k of Object.keys(a)) { vars[s.v] = k; execOne(s.body); } break; }
        case 'delete': if (arrs[s.name]) delete arrs[s.name][toStr(ev(s.idx))]; break;
        case 'next': throw NEXT;
        case 'exit': throw EXIT;
        default: throw new Error('unsupported statement ' + s.t);
      }
    }
    try {
      try { rules.filter(r => r.kind === 'begin').forEach(r => exec(r.body)); } catch (e) { if (e !== EXIT) throw e; return out; }
      const main = rules.filter(r => r.kind === 'main');
      if (main.length || !rules.some(r => r.kind === 'end') ) {
        const ls = text.split('\n'); if (ls[ls.length - 1] === '') ls.pop();
        try {
          for (const line of ls) {
            vars.NR++; setRecord(line);
            try {
              for (const r of main) {
                if (r.pattern && !truthy(ev(r.pattern))) continue;
                if (r.body) exec(r.body); else emit(fields[0] + toStr(vars.ORS));
              }
            } catch (e) { if (e !== NEXT) throw e; }
          }
        } catch (e) { if (e !== EXIT) throw e; }
      } else {
        const ls = text.split('\n'); if (ls[ls.length - 1] === '') ls.pop();
        ls.forEach(() => {}); // END-only programs still consume input for NR
        vars.NR = ls.length; if (ls.length) setRecord(ls[ls.length - 1]);
      }
      rules.filter(r => r.kind === 'end').forEach(r => exec(r.body));
    } catch (e) {
      if (e === EXIT) return out;
      throw e;
    }
    return out;
  }

  return { parse, run };
})();

PS.Shell.commands.awk = function (sh, args, io) {
  const { o, r } = PS.Shell.opts(args, 'Fv');
  const prog = r.shift();
  if (prog === undefined) { io.err('usage: awk [-F fs] \'program\' [file ...]\n'); return 2; }
  let text = '';
  if (!r.length) text = io.stdin || '';
  else for (const f of r) {
    const rd = sh.readFile(f);
    if (rd.err) { io.err(`awk: fatal: cannot open file \`${f}' for reading: ${rd.err}\n`); return 2; }
    text += rd.data.endsWith('\n') || !rd.data ? rd.data : rd.data + '\n';
  }
  try {
    const fs = o.F != null ? String(o.F).replace(/^\\t$/, '\t') : ' ';
    const assign = o.v ? [String(o.v).split(/=(.*)/s).slice(0, 2)] : [];
    io.out(PS.awk.run(PS.awk.parse(prog), text, { FS: fs, assign }));
  } catch (e) { io.err(`awk: ${e.message}\n`); return 2; }
  return 0;
};

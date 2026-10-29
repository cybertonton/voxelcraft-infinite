/* Pre Security Lab — core helpers (no dependencies, works in browser and Node) */
const PS = (globalThis.PS = globalThis.PS || {});

PS.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

PS.norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

/** Deterministic PRNG (mulberry32) */
PS.rng = function (seed) {
  let a = typeof seed === 'string' ? PS.strSeed(seed) : seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
PS.strSeed = function (s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
PS.pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
PS.shuffle = function (arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

PS.pad = (s, n, ch = ' ') => String(s).padStart(n, ch);
PS.padEnd = (s, n, ch = ' ') => String(s).padEnd(n, ch);

/** Persistent store with in-memory fallback (private mode, file://, tests) */
PS.store = (function () {
  const mem = {};
  let ls = null;
  try { ls = globalThis.localStorage || null; ls && ls.setItem('__ps', '1'); ls && ls.removeItem('__ps'); } catch (e) { ls = null; }
  return {
    get(k, d) {
      try { const v = ls ? ls.getItem('ps.' + k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { const s = JSON.stringify(v); if (ls) ls.setItem('ps.' + k, s); else mem[k] = s; } catch (e) { /* quota */ }
    },
    del(k) { try { if (ls) ls.removeItem('ps.' + k); else delete mem[k]; } catch (e) { /* ignore */ } },
  };
})();

/** Tiny DOM helper: el('div.cls#id', {attrs}, ...children) */
PS.el = function (tag, attrs, ...kids) {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
  const node = document.createElement(m[1] || 'div');
  (m[2] || '').replace(/([.#])([\w-]+)/g, (_, k, v) => { if (k === '.') node.classList.add(v); else node.id = v; });
  if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs) || typeof attrs === 'string')) { kids.unshift(attrs); attrs = null; }
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  const add = k => {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(add);
    else node.appendChild(k.nodeType ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return node;
};

/* ----------------------------------------------------------------------------
 * Mini-markdown renderer. Supports: # ## ###, paragraphs, **bold**, *italic*,
 * `code`, fenced code blocks, lists (- and 1.), tables, > quotes and
 * > [!tip|warn|info|danger|lab] callouts, [text](https://url), ---
 * -------------------------------------------------------------------------- */
PS.md = function (src) {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const inline = text => {
    const codes = [];
    let t = String(text).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = PS.esc(t);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|#[^)\s]*)\)/g, (_, a, u) =>
        `<a href="${u}"${u[0] === '#' ? '' : ' target="_blank" rel="noopener noreferrer"'}>${a}</a>`);
    return t.replace(/\u0000(\d+)\u0000/g, (_, n) => '<code>' + PS.esc(codes[+n]) + '</code>');
  };
  PS.mdInline = inline;
  while (i < lines.length) {
    const ln = lines[i];
    if (!ln.trim()) { i++; continue; }
    let m;
    if ((m = /^```(\w*)\s*$/.exec(ln))) {
      const buf = []; i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="code${m[1] ? ' lang-' + m[1] : ''}"><code>${PS.esc(buf.join('\n'))}</code></pre>`);
    } else if ((m = /^(#{1,3})\s+(.*)$/.exec(ln))) {
      const lvl = m[1].length + 1;
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); i++;
    } else if (/^---+\s*$/.test(ln)) { out.push('<hr>'); i++; }
    else if (/^>/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      const cm = /^\[!(tip|warn|info|danger|lab)\]\s*(.*)$/.exec(buf[0]);
      if (cm) {
        const icon = { tip: '💡', warn: '⚠️', info: 'ℹ️', danger: '⛔', lab: '🧪' }[cm[1]];
        const title = cm[2] ? `<div class="callout-title">${icon} ${inline(cm[2])}</div>` : '';
        out.push(`<div class="callout callout-${cm[1]}">${title}${PS.md(buf.slice(1).join('\n'))}</div>`);
      } else out.push(`<blockquote>${PS.md(buf.join('\n'))}</blockquote>`);
    } else if (/^\s*[-*]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s*[-*]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out.push('<ul>' + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>');
    } else if (/^\s*\d+[.)]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && (/^\s*\d+[.)]\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out.push('<ol>' + items.map(x => `<li>${inline(x)}</li>`).join('') + '</ol>');
    } else if (/^\|/.test(ln) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const row = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = row(ln); i += 2;
      const body = [];
      while (i < lines.length && /^\|/.test(lines[i])) body.push(row(lines[i++]));
      out.push('<div class="table-wrap"><table><thead><tr>' + head.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+[.)]\s+|\|.*\|\s*$|---+\s*$)/.test(lines[i])) buf.push(lines[i++]);
      if (!buf.length) { buf.push(lines[i++]); }
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
  }
  return out.join('\n');
};

/* Byte / string helpers shared by hash, shell and packet code */
PS.utf8 = function (s) {
  if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(s));
  return Array.from(Buffer.from(s, 'utf8'));
};
PS.b64enc = s => { const b = PS.utf8(s); let bin = ''; b.forEach(x => (bin += String.fromCharCode(x))); return btoa(bin); };
PS.b64dec = s => {
  const bin = atob(s.replace(/\s+/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : Buffer.from(bytes).toString('utf8');
};
PS.hex = (n, w = 2) => (n >>> 0).toString(16).padStart(w, '0');

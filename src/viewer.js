// Builds index.html: a self-contained, offline, searchable reader for the whole archive.
// The chats travel inside it as JSON (with "<" escaped so they can never close the script tag), and the
// page escapes every string before it renders it. No network, no external fonts or scripts.
(function (root) {
  const NS = (root.DCE = root.DCE || {});

  function viewerProject(p, a, opts) {
    const R = NS;
    const chats = p.chats.map((chat, ci) => {
      const ctx = R.chatContext(chat);
      const entry = p.entries[ci] || {};
      const m = (chat.messages || []).filter(Boolean).map((msg) => {
        const v = R.messageView(msg, { includeSteps: opts.includeSteps !== false }, ctx);
        return v.kind === 'event' ? { k: 'e', t: v.ts || null, b: v.body } : { k: v.kind, w: v.who, t: v.ts || null, b: v.body, x: (v.extra || []).join('\n') };
      });
      return { ti: R.oneLine(chat.title) || `Chat ${ci + 1}`, fi: entry.file || '', m };
    });
    return { n: a.name, f: p.folder, cs: !!opts.caseStudy, st: { chats: a.stats.chats, messages: a.stats.messages, yours: a.stats.yours, answered: a.stats.answered, turns: a.stats.turns, first: a.stats.first, last: a.stats.last }, chats };
  }

  // ------------------------------------------------------------------ the page's own script (runs offline)
  function app() {
    const D = JSON.parse(document.getElementById('archive-data').textContent);
    const $ = (s, r = document) => r.querySelector(s);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fd = (t, time) => { if (t == null) return ''; const d = new Date(t); if (isNaN(d)) return ''; const s = `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; return time ? `${s}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : s; };
    const href = (path) => path.split('/').map(encodeURIComponent).join('/');

    function inline(t) {
      let s = esc(t);
      s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
      s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return s;
    }
    function table(rows) {
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const body = rows.filter((r) => !/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(r)).map(cells);
      if (!body.length) return '';
      const [head, ...rest] = body;
      return `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    // Every branch below consumes at least one line, so the loop always ends, whatever the text.
    function md(src, depth = 0) {
      const L = String(src || '').replace(/\r/g, '').split('\n'); let h = '', i = 0;
      const isList = (l) => /^\s*([-*+]|\d+\.)\s/.test(l);
      const isFence = (l) => /^```/.test(l), isHead = (l) => /^#{1,6}\s/.test(l), isQuote = (l) => depth < 6 && /^>/.test(l);
      // A table needs a header row and a separator row; anything else starting with "|" is ordinary text.
      const SEP = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/; // e.g. |---|:--:|
      const isTable = (k) => /^\|/.test(L[k] || '') && SEP.test(L[k + 1] || '');
      const startsBlock = (k) => isFence(L[k]) || isHead(L[k]) || isQuote(L[k]) || isTable(k) || isList(L[k]);
      while (i < L.length) {
        const l = L[i];
        if (isFence(l)) { const b = []; i++; while (i < L.length && !isFence(L[i])) b.push(L[i++]); i++; h += `<pre><code>${esc(b.join('\n'))}</code></pre>`; continue; }
        if (!l.trim()) { i++; continue; }
        if (isHead(l)) { h += `<h4>${inline(l.replace(/^#+\s*/, ''))}</h4>`; i++; continue; }
        if (isQuote(l)) { const b = []; while (i < L.length && /^>/.test(L[i])) b.push(L[i++].replace(/^>\s?/, '')); h += `<blockquote>${md(b.join('\n'), depth + 1)}</blockquote>`; continue; }
        if (isTable(i)) { const b = []; while (i < L.length && /^\|/.test(L[i])) b.push(L[i++]); h += table(b); continue; }
        if (isList(l)) {
          const ord = /^\s*\d+\./.test(l); const b = [];
          while (i < L.length && (isList(L[i]) || (/^\s{2,}\S/.test(L[i]) && b.length))) { if (isList(L[i])) b.push(L[i].replace(/^\s*([-*+]|\d+\.)\s/, '')); else b[b.length - 1] += '\n' + L[i].trim(); i++; }
          h += `<${ord ? 'ol' : 'ul'}>${b.map((x) => `<li>${inline(x.replace(/^\[( |x)\]\s/, (m, c) => (c === 'x' ? '☑ ' : '☐ '))).replace(/\n/g, '<br>')}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`; continue;
        }
        const b = [L[i++]]; // the current line always belongs to this paragraph
        while (i < L.length && L[i].trim() && !startsBlock(i)) b.push(L[i++]);
        h += `<p>${inline(b.join('\n')).replace(/\n/g, '<br>')}</p>`;
      }
      return h;
    }

    const nav = $('#nav'), main = $('#main'), q = $('#q');
    function sidebar(active) {
      nav.innerHTML = `<button class="navhome ${active == null ? 'on' : ''}" data-go="home">Overview</button>` +
        (D.prompts && D.prompts.length ? `<button class="navhome ${active === 'prompts' ? 'on' : ''}" data-go="prompts">Prompt library</button>` : '') +
        `<h2>Projects</h2>` + D.projects.map((p, i) => `<button class="proj ${active === i ? 'on' : ''}" data-p="${i}"><span>${esc(p.n)}</span><small>${p.chats.length} chat${p.chats.length === 1 ? '' : 's'}</small></button>`).join('');
    }
    function home() {
      sidebar(null);
      const w = D.wrapped;
      main.innerHTML = `<header class="hero"><h1>Your Claude Design archive</h1><p>Exported ${esc(fd(D.exportedAt, true))}. ${D.projects.length} project${D.projects.length === 1 ? '' : 's'}, every chat in order. Search above, or pick a project.</p></header>` +
        (D.hasWrappedPng ? `<figure class="wrapped"><img src="wrapped.png" alt="Your Claude Design in numbers"><figcaption>wrapped.png is in this folder, ready to share. It never shows project names.</figcaption></figure>` : '') +
        `<div class="cards">${D.projects.map((p, i) => `<button class="card" data-p="${i}"><b>${esc(p.n)}</b><span>${p.st.yours.toLocaleString('en')} message${p.st.yours === 1 ? '' : 's'} from you, ${p.st.answered} decision${p.st.answered === 1 ? '' : 's'} answered</span><small>${esc(fd(p.st.first))}${p.st.last && fd(p.st.last) !== fd(p.st.first) ? ' to ' + esc(fd(p.st.last)) : ''}</small></button>`).join('')}</div>`;
      main.scrollTop = 0;
    }
    function prompts() {
      sidebar('prompts');
      main.innerHTML = `<header class="hero"><h1>Prompt library</h1><p><strong>Kept</strong> marks prompts after which Claude made or changed files and you carried on in the same direction. It is worked out automatically, so treat it as a hint. Copy any prompt into Claude.</p></header>` +
        D.prompts.map((g) => `<section class="pgroup"><h3>${esc(g.n)}</h3>${g.p.map((x) => `<div class="prompt ${x.k ? 'kept' : ''}"><div class="ptop"><span>${x.k ? 'Kept' : 'Tried'}</span><small>${esc(fd(x.t))}, ${esc(x.c)}</small><button class="copy" data-copy="${esc(x.x)}">Copy</button></div><p>${esc(x.x)}</p></div>`).join('')}</section>`).join('');
      main.scrollTop = 0;
    }
    function project(pi, ci = 0, mi = null, needle = '') {
      const p = D.projects[pi]; if (!p) return home();
      sidebar(pi);
      const c = p.chats[ci];
      const tabs = p.chats.length > 1 ? `<div class="tabs">${p.chats.map((x, j) => `<button class="${j === ci ? 'on' : ''}" data-p="${pi}" data-c="${j}">${esc(x.ti)}</button>`).join('')}</div>` : '';
      const links = `<div class="links">${p.cs ? `<a href="${href(p.f + '/case-study.html')}" target="_blank">Open case study</a>` : ''}${c && c.fi ? `<a href="${href(p.f + '/' + c.fi)}" target="_blank">Markdown file</a>` : ''}</div>`;
      const msgs = c ? c.m.map((m, j) => {
        if (m.k === 'e') return `<div class="ev" id="m${j}">${esc(m.b)}${m.t ? ` <small>${esc(fd(m.t, true))}</small>` : ''}</div>`;
        return `<article class="msg ${esc(m.k)}" id="m${j}"><header><b>${esc(m.w)}</b><small>${esc(fd(m.t, true))}</small></header><div class="body">${md(m.b)}</div>${m.x ? `<div class="extra">${md(m.x)}</div>` : ''}</article>`;
      }).join('') : '<p class="empty">This project has no chats to show.</p>';
      main.innerHTML = `<header class="phead"><h1>${esc(p.n)}</h1><p>${p.st.chats} chat${p.st.chats === 1 ? '' : 's'}, ${p.st.messages.toLocaleString('en')} messages, ${esc(fd(p.st.first))}${p.st.last && fd(p.st.last) !== fd(p.st.first) ? ' to ' + esc(fd(p.st.last)) : ''}</p>${links}</header>${tabs}<div class="thread">${msgs}</div>`;
      if (mi != null) {
        const el = document.getElementById('m' + mi);
        if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('hit'); if (needle) mark(el, needle); }
      } else main.scrollTop = 0;
    }
    function mark(el, needle) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const nodes = []; let n;
      while ((n = walker.nextNode())) nodes.push(n);
      const lo = needle.toLowerCase();
      for (const t of nodes) {
        const i = t.data.toLowerCase().indexOf(lo); if (i < 0) continue;
        const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + needle.length);
        const m = document.createElement('mark'); r.surroundContents(m);
      }
    }

    let index = null;
    function search(term) {
      if (!index) { index = []; D.projects.forEach((p, pi) => p.chats.forEach((c, ci) => c.m.forEach((m, mi) => index.push({ pi, ci, mi, lo: String(m.b || '').toLowerCase(), raw: String(m.b || ''), w: m.w || '', t: m.t })))); }
      const lo = term.toLowerCase(); const hits = [];
      for (const e of index) { const i = e.lo.indexOf(lo); if (i >= 0) { hits.push({ ...e, i }); if (hits.length >= 300) break; } }
      sidebar(-1);
      main.innerHTML = `<header class="hero"><h1>${hits.length >= 300 ? '300+' : hits.length} result${hits.length === 1 ? '' : 's'} for “${esc(term)}”</h1></header>` +
        (hits.length ? `<div class="results">${hits.map((h) => { const s = Math.max(0, h.i - 70); const snip = h.raw.slice(s, h.i + term.length + 110).replace(/\s+/g, ' ');
          const at = snip.toLowerCase().indexOf(lo);
          return `<button class="res" data-p="${h.pi}" data-c="${h.ci}" data-m="${h.mi}"><small>${esc(D.projects[h.pi].n)} → ${esc(D.projects[h.pi].chats[h.ci].ti)}${h.w ? ', ' + esc(h.w) : ''}, ${esc(fd(h.t))}</small><span>${s > 0 ? '…' : ''}${esc(snip.slice(0, at))}<mark>${esc(snip.slice(at, at + term.length))}</mark>${esc(snip.slice(at + term.length))}…</span></button>`; }).join('')}</div>` : '<p class="empty">Nothing matched. Try a shorter word.</p>');
      main.scrollTop = 0;
    }

    document.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.copy != null) { navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1400); }); return; }
      if (b.dataset.go === 'home') { q.value = ''; return home(); }
      if (b.dataset.go === 'prompts') { q.value = ''; return prompts(); }
      if (b.dataset.p != null) project(+b.dataset.p, b.dataset.c != null ? +b.dataset.c : 0, b.dataset.m != null ? +b.dataset.m : null, b.dataset.m != null ? q.value.trim() : '');
    });
    let tmr; q.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { const v = q.value.trim(); if (v.length >= 2) search(v); else if (!v) home(); }, 180); });
    document.addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); } });
    home();
  }

  const CSS = `
:root{--paper:#F7F1E3;--card:#FFFCF3;--ink:#1B2340;--soft:#5D6278;--rule:#E0D3B4;--rust:#B4502F;--manila:#EAD9AE;--you:#EFE3C2;--navy:#161E38;
--serif:Charter,"Iowan Old Style","Palatino Linotype",Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--paper:#121830;--card:#1A2242;--ink:#ECE6D6;--soft:#A3AAC2;--rule:#2C365C;--you:#2A2F45;--manila:#3A3A3A}}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--paper);color:var(--ink);font:15.5px/1.55 var(--sans);display:grid;grid-template-columns:288px 1fr;grid-template-rows:auto 1fr}
.top{grid-column:1/-1;display:flex;align-items:center;gap:16px;padding:12px 20px;background:var(--navy);color:#FBF6E9}
.top b{font:700 18px var(--serif);white-space:nowrap}
.top input{flex:1;max-width:560px;font:15px var(--sans);padding:9px 14px;border-radius:8px;border:1px solid #39446E;background:#0F1530;color:#FBF6E9}
.top input::placeholder{color:#8F97B3}.top kbd{font:12px var(--mono);color:#8F97B3}
nav{overflow:auto;border-right:1px solid var(--rule);padding:14px 10px}
nav h2{font:600 12px var(--sans);color:var(--soft);margin:18px 10px 6px;letter-spacing:.02em}
nav button{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;border:0;background:none;color:inherit;font:inherit;padding:8px 10px;border-radius:8px;cursor:pointer}
nav button:hover{background:var(--card)}nav button.on{background:var(--manila);color:#1B2340}
nav button small{color:var(--soft);font-size:12px}nav button.on small{color:#4F5A78}
#main{overflow:auto;padding:36px clamp(20px,5vw,64px) 80px}
h1{font:700 clamp(28px,4vw,40px)/1.1 var(--serif);margin:0 0 8px}
.hero p,.phead p{color:var(--soft);margin:0 0 18px;max-width:46em}
.links{display:flex;gap:10px;margin-bottom:18px}.links a{font-weight:600;color:var(--ink);background:var(--manila);padding:7px 12px;border-radius:8px;text-decoration:none;color:#1B2340}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:20px}
.card{text-align:left;border:1px solid var(--rule);background:var(--card);border-radius:12px;padding:16px;cursor:pointer;color:inherit;font:inherit;display:flex;flex-direction:column;gap:4px}
.card:hover{border-color:var(--ink)}.card b{font:700 19px var(--serif)}.card span,.card small{color:var(--soft)}
.wrapped{margin:8px 0 24px;max-width:360px}.wrapped img{width:100%;border-radius:12px;display:block}.wrapped figcaption{font-size:13px;color:var(--soft);margin-top:6px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 20px}.tabs button{border:1px solid var(--rule);background:var(--card);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:14px;cursor:pointer}
.tabs button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.thread{max-width:820px;display:flex;flex-direction:column;gap:14px}
.msg{border-radius:14px;padding:14px 18px;background:var(--card);border:1px solid var(--rule);content-visibility:auto;contain-intrinsic-size:auto 160px}
.msg.you,.msg.answer{background:var(--you);border-color:transparent;margin-left:min(12%,80px)}
.msg.question{border-left:4px solid var(--rust)}
.msg header{display:flex;gap:10px;align-items:baseline;margin-bottom:4px}.msg header small{color:var(--soft);font-size:12px}
.msg.hit{outline:3px solid var(--rust);outline-offset:3px}
.body p{margin:0 0 .7em}.body p:last-child{margin-bottom:0}.body h4{font:700 16px var(--serif);margin:.8em 0 .3em}
.body ul,.body ol{margin:.3em 0 .7em;padding-left:1.3em}
blockquote{margin:.4em 0;padding:.2em 0 .2em 12px;border-left:3px solid var(--rule);color:var(--soft)}
pre{background:#0F1530;color:#E6E1D2;padding:12px 14px;border-radius:8px;overflow:auto;font:13px/1.5 var(--mono)}
code{font:13px var(--mono);background:var(--manila);color:#1B2340;padding:1px 5px;border-radius:4px}pre code{background:none;color:inherit;padding:0}
table{border-collapse:collapse;margin:.5em 0;font-size:14px}th,td{border-bottom:1px solid var(--rule);padding:5px 10px 5px 0;text-align:left}
.extra{margin-top:8px;font-size:13.5px;color:var(--soft)}.extra blockquote{border:0;padding:0;margin:.2em 0}
.ev{text-align:center;font-size:13px;color:var(--soft)}
mark{background:#F2C14E;color:#1B2340;border-radius:3px;padding:0 2px}
.results{display:flex;flex-direction:column;gap:8px;max-width:820px}
.res{text-align:left;border:1px solid var(--rule);background:var(--card);border-radius:10px;padding:10px 14px;cursor:pointer;color:inherit;font:inherit;display:flex;flex-direction:column;gap:3px}
.res small{color:var(--soft)}.res:hover{border-color:var(--ink)}
.pgroup h3{font:700 22px var(--serif);margin:28px 0 10px}
.prompt{border:1px solid var(--rule);background:var(--card);border-radius:12px;padding:12px 16px;margin-bottom:10px;max-width:820px}
.prompt.kept{border-left:4px solid #3E7B57}.ptop{display:flex;gap:10px;align-items:center;margin-bottom:6px}.ptop span{font-weight:700}.ptop small{color:var(--soft);flex:1}
.prompt p{margin:0;white-space:pre-wrap;font:16px/1.55 var(--serif)}
.copy{border:1px solid var(--rule);background:transparent;color:inherit;border-radius:6px;padding:3px 10px;cursor:pointer;font:inherit;font-size:13px}
.empty{color:var(--soft)}
@media (max-width:760px){body{grid-template-columns:1fr;grid-template-rows:auto auto 1fr}nav{border-right:0;border-bottom:1px solid var(--rule);max-height:34vh}.msg.you,.msg.answer{margin-left:0}}
`;

  function viewerHtml(data) {
    const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(new RegExp('[\\u2028\\u2029]', 'g'), (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Claude Design archive</title><style>${CSS}</style></head>
<body><div class="top"><b>Design Chat Archive</b><input id="q" type="search" placeholder="Search every chat" aria-label="Search every chat" autocomplete="off"><kbd>/</kbd></div>
<nav id="nav" aria-label="Projects"></nav><main id="main"></main>
<script type="application/json" id="archive-data">${json}</script>
<script>(${app.toString()})();</script>
</body></html>
`;
  }

  Object.assign(NS, { viewerProject, viewerHtml });
})(typeof globalThis !== 'undefined' ? globalThis : this);

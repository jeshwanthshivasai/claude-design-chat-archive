// Builds a self-contained, printable case study page for one project from analyzeProject()'s output.
// Every piece of text from the chats is HTML-escaped; the page runs no script.
(function (root) {
  const NS = (root.DCE = root.DCE || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dLong = (ms) => { if (ms == null) return ''; const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const dShort = (ms) => { if (ms == null) return ''; const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const hm = (ms) => { if (ms == null) return ''; const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const plural = (n, w) => `${n.toLocaleString('en')} ${w}${n === 1 ? '' : 's'}`;
  const paras = (t) => esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

  // Merge same-day file events and keep the timeline readable on very long projects.
  function condense(events) {
    const out = [];
    for (const e of events) {
      const prev = out[out.length - 1];
      if (e.kind === 'files' && prev && prev.kind === 'files' && e.t && prev.t && new Date(e.t).toDateString() === new Date(prev.t).toDateString()) {
        prev.files = [...new Set([...prev.files, ...e.files])]; continue;
      }
      out.push({ ...e, files: e.files ? [...e.files] : undefined });
    }
    return out;
  }

  function eventHtml(e) {
    const time = `<span class="time">${esc(hm(e.t))}</span>`;
    if (e.kind === 'brief') return `<li class="ev ev-brief">${time}<div><strong>The brief went in.</strong> ${esc(e.text)}</div></li>`;
    if (e.kind === 'turn') return `<li class="ev turn">${time}<div><span class="tag">You changed direction</span><blockquote>${esc(e.text)}</blockquote></div></li>`;
    if (e.kind === 'files') {
      const shown = e.files.slice(0, 6).map((f) => `<code>${esc(f)}</code>`).join(' ');
      return `<li class="ev files">${time}<div>Claude made ${shown}${e.files.length > 6 ? ` and ${e.files.length - 6} more` : ''}</div></li>`;
    }
    if (e.kind === 'question' || e.kind === 'answer') {
      const qa = (e.answers || e.items || []).filter((x) => x && x.a);
      const qs = e.kind === 'question' && !qa.length ? `<ul class="qs">${(e.items || []).map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : '';
      const ans = qa.length ? `<dl>${qa.map((x) => `<dt>${esc(x.q)}</dt><dd>${esc(x.a)}</dd>`).join('')}</dl>` : '';
      return `<li class="ev decision">${time}<div><span class="tag">Claude asked: ${esc(e.title || 'a few questions')}</span>${ans || qs}</div></li>`;
    }
    return '';
  }

  function caseStudyHtml(a) {
    const s = a.stats;
    const span = s.first && s.last ? (dLong(s.first) === dLong(s.last) ? dLong(s.first) : `${dLong(s.first)} to ${dLong(s.last)}`) : '';
    const events = condense(a.events);
    // Group by day for the timeline.
    const days = [];
    for (const e of events) {
      const key = e.t ? new Date(e.t).toDateString() : 'Undated';
      if (!days.length || days[days.length - 1].key !== key) days.push({ key, t: e.t, items: [] });
      days[days.length - 1].items.push(e);
    }
    const timeline = days.map((d) => `<section class="day"><h3>${esc(d.t ? dShort(d.t) : 'Undated')}</h3><ol>${d.items.map(eventHtml).join('')}</ol></section>`).join('');
    const kept = a.prompts.filter((p) => p.kept).slice(0, 6);
    const assets = a.assets.filter((x) => x.name).sort((x, y) => y.versions - x.versions).slice(0, 12);

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.name)}: case study</title>
<style>
:root{--paper:#F7F1E3;--ink:#1B2340;--soft:#5D6278;--rule:#E0D3B4;--rust:#B4502F;--manila:#EAD9AE;
--serif:Charter,"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;color:var(--ink);font:17px/1.6 var(--serif)}
main{max-width:760px;margin:0 auto;padding:72px 28px 96px}
h1{font-size:clamp(40px,7vw,68px);line-height:1.02;margin:0 0 18px;letter-spacing:-.015em;font-weight:700}
.lede{font:18px/1.5 var(--sans);color:var(--soft);margin:0 0 40px;max-width:36em}
.ledger{display:grid;grid-template-columns:repeat(5,1fr);border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin:0 0 64px}
.ledger div{padding:14px 12px 16px 0}.ledger b{display:block;font:700 30px/1.1 var(--serif);font-variant-numeric:tabular-nums}
.ledger span{font:13px/1.3 var(--sans);color:var(--soft)}
h2{font:700 28px/1.2 var(--serif);margin:72px 0 20px}
.brief{border-left:4px solid var(--rust);padding:2px 0 2px 24px;font-size:20px;line-height:1.55}
.brief p{margin:0 0 .8em}
.by{font:14px var(--sans);color:var(--soft);margin:-8px 0 14px}
.day{display:grid;grid-template-columns:96px 1fr;gap:0 20px;border-top:1px solid var(--rule);padding:16px 0}
.day h3{font:600 14px/1.4 var(--sans);margin:4px 0 0;color:var(--soft);text-transform:none}
.day ol{list-style:none;margin:0;padding:0}
.ev{display:grid;grid-template-columns:48px 1fr;gap:12px;padding:6px 0;font:15.5px/1.55 var(--sans)}
.time{font:12px/2 var(--mono);color:var(--soft)}
.tag{display:block;font-weight:650;margin-bottom:4px}
.turn .tag{color:var(--rust)}
blockquote{margin:0;padding:8px 14px;background:#fff8;border-radius:6px;font:16px/1.5 var(--serif)}
dl{margin:6px 0 0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:4px 16px}
dt{color:var(--soft)}dd{margin:0;font-weight:600}
.qs{margin:4px 0 0;padding-left:18px;color:var(--soft)}
code{font:13px var(--mono);background:var(--manila);padding:1px 6px;border-radius:4px;white-space:nowrap}
table{width:100%;border-collapse:collapse;font:15px/1.45 var(--sans)}th{text-align:left;font-weight:600;color:var(--soft);border-bottom:2px solid var(--ink);padding:8px 10px 8px 0}
td{border-bottom:1px solid var(--rule);padding:10px 10px 10px 0;vertical-align:top}td.n,th.n{font-variant-numeric:tabular-nums;text-align:right}
.prompt{border-top:1px solid var(--rule);padding:16px 0}.prompt p{margin:0 0 6px;white-space:pre-wrap;font:16px/1.55 var(--serif)}
.prompt small{font:13px var(--sans);color:var(--soft)}
footer{margin-top:80px;padding-top:16px;border-top:1px solid var(--rule);font:13px/1.5 var(--sans);color:var(--soft)}
@media (max-width:640px){.ledger{grid-template-columns:repeat(2,1fr)}.day{grid-template-columns:1fr}dl{grid-template-columns:1fr}}
@media print{html{background:#fff}main{padding:0}h2{break-after:avoid}.day,.prompt{break-inside:avoid}}
</style></head><body><main>
<h1>${esc(a.name)}</h1>
<p class="lede">Designed with Claude${span ? `, ${esc(span)}` : ''}. ${esc(plural(s.chats, 'conversation'))}, ${esc(plural(s.days, 'working day'))}.</p>
<div class="ledger">
<div><b>${s.yours.toLocaleString('en')}</b><span>messages from you</span></div>
<div><b>${s.answered.toLocaleString('en')}</b><span>decisions answered</span></div>
<div><b>${s.turns.toLocaleString('en')}</b><span>changes of direction</span></div>
<div><b>${s.filesCreated.toLocaleString('en')}</b><span>files made</span></div>
<div><b>${s.messages.toLocaleString('en')}</b><span>messages in all</span></div>
</div>
${a.brief ? `<h2>The brief</h2>${a.briefBy ? `<p class="by">Written by ${esc(a.briefBy)}</p>` : ''}<div class="brief">${paras(a.brief)}</div>` : ''}
${days.length ? `<h2>How it took shape</h2>${timeline}` : ''}
${assets.length ? `<h2>What came out of it</h2><table><thead><tr><th>File</th><th class="n">Versions</th><th>Last note</th></tr></thead><tbody>${assets.map((x) => `<tr><td><code>${esc(x.name)}</code></td><td class="n">${x.versions}</td><td>${esc(x.note)}</td></tr>`).join('')}</tbody></table>` : ''}
${kept.length ? `<h2>Prompts that worked</h2>${kept.map((p) => `<div class="prompt"><p>${esc(p.text)}</p><small>${esc(dLong(p.t))}, ${esc(p.chat)}</small></div>`).join('')}` : ''}
<footer>Drafted automatically from your Claude Design chats by Design Chat Archive. "Changes of direction" and "prompts that worked" are detected from wording and file changes, so check them before you publish. Edit this file freely; it is plain HTML.</footer>
</main></body></html>
`;
  }

  Object.assign(NS, { caseStudyHtml, escHtml: esc });
})(typeof globalThis !== 'undefined' ? globalThis : this);

// The side panel. It talks only to this extension's script on the Claude Design tab (bridge.js) over a
// private port; that script reads your projects with your own session and builds the ZIP in the tab.
// The panel keeps nothing but your option choices, in this browser's local storage.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, w, ws) => `${(n || 0).toLocaleString('en')} ${n === 1 ? w : (ws || w + 's')}`;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DEADLINE = new Date(2026, 11, 14); // 14 Dec 2026, local midnight
  const DESIGN_URL = 'https://claude.ai/design';

  const view = $('#view'), folderLabel = $('#folder-label');

  // ------------------------------------------------------------------ options (remembered in this browser)
  const OPT_KEY = 'dca-options-v2';
  const DEFAULTS = { caseStudy: true, viewer: true, prompts: true, wrapped: true, includeSteps: true, includeRaw: false };
  let opts = { ...DEFAULTS };
  try { const saved = JSON.parse(localStorage.getItem(OPT_KEY) || '{}'); for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === 'boolean') opts[k] = saved[k]; } catch (e) { /* storage unavailable */ }
  const saveOpts = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) { /* fine */ } };

  // ------------------------------------------------------------------ state
  const state = { view: 'connecting', projects: [], selected: new Set(), query: '', here: null, job: null, result: null, origin: null, error: '', notice: '' };
  let windowId = null, tabId = null, port = null, helloTimer = null, forcedTab = null, exports = 0;

  // ------------------------------------------------------------------ masthead: the days that are left
  function daysLeft() {
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((DEADLINE - today) / 86400000);
  }
  function masthead() {
    const d = daysLeft();
    const h1 = $('#deadline'), sub = $('#deadline-sub');
    if (d > 1) h1.textContent = `${d} days left to save your Claude Design chats.`;
    else if (d === 1) h1.textContent = 'One day left to save your Claude Design chats.';
    else if (d === 0) h1.textContent = 'Today is the last day to save your Claude Design chats.';
    else h1.textContent = 'Claude Design’s own site has closed.';
    sub.textContent = d >= 0
      ? 'Its standalone site closes on 14 Dec 2026, and the chats there are deleted. This saves them to your computer first.'
      : 'If your chats can still be opened, you can still save them here.';
    drawRuler(d);
  }
  function drawRuler(days) {
    const el = $('#ruler');
    if (days < 1 || days > 400) { el.hidden = true; return; }
    el.hidden = false;
    const W = Math.max(200, el.clientWidth || 320), n = days + 1, step = (W - 10) / (n - 1);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let s = '';
    for (let i = 0; i < n - 1; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const month = d.getDate() === 1, week = d.getDay() === 1;
      if (step < 2.6 && i && !week && !month) continue;
      const x = (2 + i * step).toFixed(1), h = i === 0 ? 20 : month ? 18 : week ? 12 : 7;
      s += `<line class="tick${i === 0 ? ' today' : ''}${week || month ? ' week' : ''}" x1="${x}" x2="${x}" y1="${26 - h}" y2="26"/>`;
      if (month && i > 3) s += `<text x="${x}" y="6" text-anchor="middle">${MON[d.getMonth()]}</text>`;
    }
    const xe = (2 + (n - 1) * step).toFixed(1);
    s += `<line x1="${xe}" x2="${xe}" y1="20" y2="26" stroke="#C45634" stroke-width="2"/><circle class="end" cx="${xe}" cy="17" r="5"/>`;
    s += `<text x="0" y="39">Today</text><text class="endlabel" x="${xe}" y="39" text-anchor="end">14 Dec, deleted</text>`;
    el.innerHTML = `<svg viewBox="0 0 ${W} 40" width="${W}" height="40" role="img">${s}</svg>`;
  }
  new ResizeObserver(() => drawRuler(daysLeft())).observe($('#ruler'));

  // ------------------------------------------------------------------ connection to the Claude Design tab
  function drop() {
    clearTimeout(helloTimer);
    if (port) { const p = port; port = null; try { p.disconnect(); } catch (e) { /* gone */ } }
  }
  function follow(id) {
    if (state.view === 'running' && port) return; // stay with the tab that is doing the work
    if (id === tabId && port) return;
    drop(); tabId = id;
    if (id == null) return show('nopage');
    connect(id);
  }
  function connect(id) {
    drop();
    let p;
    try { p = chrome.tabs.connect(id, { name: 'dca' }); } catch (e) { return show('nopage'); }
    port = p;
    let heard = false;
    p.onMessage.addListener((m) => { if (port !== p) return; heard = true; clearTimeout(helloTimer); onMessage(m); });
    p.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      if (port !== p) return;
      port = null; clearTimeout(helloTimer);
      show(state.view === 'running' ? 'lost' : 'nopage');
    });
    p.postMessage({ type: 'hello' });
    // No reply yet but the connection is open: the tab is there but busy (packing a big ZIP, say). Wait for it;
    // never suggest reloading, which would end an export in progress. A tab without the archive script
    // disconnects at once instead.
    helloTimer = setTimeout(() => { if (port === p && !heard && (state.view === 'connecting' || state.view === 'nopage' || state.view === 'loading')) show('waiting'); }, 2500);
  }
  const send = (m) => { if (port) { try { port.postMessage(m); return true; } catch (e) { /* closed */ } } return false; };

  function onMessage(m) {
    if (!m || typeof m.type !== 'string') return;
    if (m.type === 'hello') {
      state.here = m.projectId || null;
      if (m.job) { startRunning(m.job.origin, m.job.total, m.job.names); if (m.job.last) progress(m.job.last); return; }
      if (state.view === 'done') { send({ type: 'list' }); return; } // refresh quietly; keep showing the result
      if (!state.projects.length) show('loading');
      send({ type: 'list' });
      return;
    }
    if (m.type === 'projects') {
      setProjects(Array.isArray(m.projects) ? m.projects : []);
      if (state.view !== 'done' && state.view !== 'running') show('ready');
      return;
    }
    if (m.type === 'error') {
      if (m.where === 'list') { state.error = m.message || 'Unknown error'; if (state.view !== 'done') show('error'); }
      else { state.notice = m.message || 'That didn’t work.'; if (state.view === 'ready') renderNotice(); }
      return;
    }
    if (m.type === 'started') return startRunning(m.origin, m.total, m.names);
    if (m.type === 'progress') return progress(m);
    if (m.type === 'done') return finish(m.origin, m.result || {});
    if (m.type === 'failed') { state.error = m.message || 'Unknown error'; return show('failed'); }
  }

  function setProjects(list) {
    const clean = list.filter((p) => p && typeof p.id === 'string').map((p) => ({ id: p.id, name: String(p.name || 'Untitled'), source: p.source === 'org' ? 'org' : 'yours', owner: String(p.owner || ''), updated: p.updated || null }));
    const had = state.projects.length > 0;
    const ids = new Set(clean.map((p) => p.id));
    state.selected = had ? new Set([...state.selected].filter((id) => ids.has(id))) : new Set(clean.filter((p) => p.source !== 'org').map((p) => p.id));
    state.projects = clean;
  }

  // ------------------------------------------------------------------ views
  function show(v) {
    state.view = v;
    const labels = { waiting: 'Your projects', connecting: 'Your projects', loading: 'Your projects', ready: 'Your projects', nopage: 'Getting started', error: 'Your projects', running: 'Archiving', done: 'Archived', lost: 'Stopped', failed: 'Stopped' };
    folderLabel.textContent = labels[v] || 'Your projects';
    ({ waiting: renderWaiting, connecting: renderLoading, loading: renderLoading, ready: renderReady, nopage: renderNoPage, error: renderError, running: renderRunning, done: renderDone, lost: renderLost, failed: renderFailed }[v] || renderLoading)();
  }

  function renderLoading() {
    view.innerHTML = `<div class="scroll"><div class="row"><h2>${state.view === 'connecting' ? 'Connecting to Claude Design…' : 'Reading your projects…'}</h2></div>
      <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
  }

  function renderWaiting() {
    view.innerHTML = `<div class="scroll"><div class="notice">
      <h2>Waiting for Claude Design</h2>
      <p>The tab is busy, perhaps finishing an export. This panel connects as soon as it’s free; there’s no need to reload.</p>
      <div class="skeleton"></div>
    </div></div>`;
  }

  function renderNoPage() {
    view.innerHTML = `<div class="scroll"><div class="notice">
      <h2>Open Claude Design to begin</h2>
      <p>This panel saves the chats from your projects on claude.ai/design. Open it and your projects appear here.</p>
      <div class="actions">
        <button class="primary" data-act="open">Open Claude Design</button>
        <button class="secondary" data-act="reload">Reload this tab</button>
      </div>
      <p>Claude Design already open in this tab? Reload it once. The archive connects when the page loads.</p>
    </div></div>`;
  }

  function renderError() {
    view.innerHTML = `<div class="scroll"><div class="notice">
      <h2>Your projects didn’t load</h2>
      <p class="error-text">${esc(state.error)}</p>
      <p>Check that you’re signed in to Claude in this tab, then try again.</p>
      <div class="actions"><button class="primary" data-act="retry">Try again</button></div>
    </div></div>`;
  }

  function renderLost() {
    view.innerHTML = `<div class="scroll"><div class="notice">
      <h2>The archive stopped</h2>
      <p>The Claude Design tab was closed or reloaded before the ZIP was ready, so nothing was downloaded.</p>
      <div class="actions"><button class="primary" data-act="restart">Start again</button></div>
    </div></div>`;
  }

  function renderFailed() {
    view.innerHTML = `<div class="scroll"><div class="notice">
      <h2>The archive didn’t finish</h2>
      <p class="error-text">${esc(state.error)}</p>
      <p>Nothing was downloaded. Reload the Claude Design tab, then try again.</p>
      <div class="actions"><button class="primary" data-act="back">Back to projects</button></div>
    </div></div>`;
  }

  const OPTION_ROWS = [
    ['caseStudy', 'A case study for each project', 'A first draft of how each design took shape: your brief, Claude’s questions and your answers, where you changed direction, and what came out of it.', 'feature'],
    ['viewer', 'Offline reader', 'One page that opens every chat and searches across all of them, with no internet.'],
    ['prompts', 'Prompt library', 'Every prompt you wrote, with the ones that led to work you kept marked.'],
    ['wrapped', 'Wrapped card', 'Your Claude Design in numbers, as an image to share. Project names never appear on it.'],
  ];
  const optRow = ([k, title, text, cls]) => `<label class="opt ${cls || ''}"><input type="checkbox" data-opt="${k}" ${opts[k] ? 'checked' : ''}><span><b>${title}</b><small>${text}</small></span></label>`;

  function renderReady() {
    const many = state.projects.length > 6;
    view.innerHTML = `<div class="scroll">
      <section class="section">
        <div class="row"><h2>Projects</h2><span class="links"><button class="link" data-sel="all">Select all</button><button class="link" data-sel="none">Clear</button></span></div>
        ${many ? `<input class="search" id="search" type="search" placeholder="Find a project" aria-label="Find a project" autocomplete="off" value="${esc(state.query)}">` : ''}
        <ul class="list" id="list" aria-label="Projects to archive"></ul>
      </section>
      <section class="section">
        <h2>What goes in the archive</h2>
        <div class="options">
          <label class="opt locked"><input type="checkbox" checked disabled><span><b>Chat transcripts</b><small>Every message, question and answer, as Markdown files. Always included.</small></span></label>
          ${OPTION_ROWS.map(optRow).join('')}
        </div>
        <details class="more"><summary>More options</summary>
          ${optRow(['includeSteps', 'Show Claude’s steps', 'The files Claude read and edited, listed under each reply.'])}
          ${optRow(['includeRaw', 'Raw data (JSON)', 'Everything as Claude Design stores it, including file contents and internal IDs. Keep it private.'])}
        </details>
      </section>
    </div>
    <div class="foot">
      <p class="error-text" id="notice" hidden></p>
      <button class="primary" id="go"></button>
      <p class="fine">Downloads one ZIP. Nothing leaves this browser.</p>
    </div>`;
    renderList(); renderNotice();
  }

  function shortDate(v) {
    const d = new Date(v || NaN); if (isNaN(d)) return '';
    return d.getFullYear() === new Date().getFullYear() ? `${d.getDate()} ${MON[d.getMonth()]}` : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  }
  function visibleProjects() {
    const q = state.query.trim().toLowerCase();
    return q ? state.projects.filter((p) => p.name.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q)) : state.projects;
  }
  function renderList() {
    const list = $('#list'); if (!list) return;
    const shown = visibleProjects();
    if (!state.projects.length) list.innerHTML = '<li class="empty">No projects in this account yet.</li>';
    else if (!shown.length) list.innerHTML = '<li class="empty">No project matches that name.</li>';
    else list.innerHTML = shown.map((p) => {
      const bits = [];
      if (p.source === 'org') bits.push(`Shared by ${esc(p.owner || 'a teammate')}`);
      const when = shortDate(p.updated); if (when) bits.push(`${bits.length ? 'edited' : 'Edited'} ${when}`);
      const here = p.id === state.here ? '<span class="here">Open now</span> ' : '';
      const title = p.source === 'org' ? ' title="Someone else’s project. Its chats are saved only if the owner shared them."' : '';
      return `<li><label class="check"${title}><input type="checkbox" data-id="${esc(p.id)}" ${state.selected.has(p.id) ? 'checked' : ''}><span><span class="name">${esc(p.name)}</span><span class="meta">${here}${bits.join(', ')}</span></span></label></li>`;
    }).join('');
    updateGo();
  }
  function updateGo() {
    const go = $('#go'); if (!go) return;
    const n = state.projects.filter((p) => state.selected.has(p.id)).length;
    go.disabled = n === 0;
    go.textContent = n === 0 ? 'Choose at least one project' : n === state.projects.length && n > 1 ? `Archive all ${n} projects` : `Archive ${plural(n, 'project')}`;
  }
  function renderNotice() {
    const el = $('#notice'); if (!el) return;
    el.hidden = !state.notice; el.textContent = state.notice;
  }

  // ------------------------------------------------------------------ running
  function startRunning(origin, total, names) {
    const t = Math.max(1, Number(total) || 1);
    state.job = { origin, total: t, names: Array.isArray(names) ? names.map(String) : [], statuses: new Array(t).fill(''), stopping: false };
    state.notice = '';
    show('running');
  }
  function renderRunning() {
    const j = state.job;
    const names = j.names.length ? j.names : Array.from({ length: j.total }, (_, i) => `Project ${i + 1}`);
    view.innerHTML = `<div class="scroll"><div class="run">
      <h2>${j.origin === 'button' ? 'Saving this project' : `Archiving ${j.total === 1 ? 'one project' : `${j.total} projects`}`}</h2>
      <p class="now" id="now">Starting…</p>
      <div class="segments" id="segs" style="gap:${j.total > 40 ? 0 : 3}px" aria-hidden="true">${names.map(() => '<i></i>').join('')}</div>
      <ul class="status">${names.map((n, i) => `<li><span class="n">${esc(n)}</span><span class="s" data-s="${i}">Waiting</span></li>`).join('')}</ul>
      <p class="fine" style="text-align:left">You can keep working in Claude Design while this runs. Keep its tab open until the ZIP downloads.</p>
    </div></div>
    <div class="foot"><button class="secondary" style="width:100%" data-act="stop" ${j.stopping ? 'disabled' : ''}>${j.stopping ? 'Stopping…' : 'Stop'}</button></div>`;
  }
  function progress(m) {
    if (state.view !== 'running' || !state.job) return;
    const j = state.job, i = Number(m.index);
    const seg = Number.isInteger(i) ? $('#segs').children[i] : null;
    const st = Number.isInteger(i) ? view.querySelector(`[data-s="${i}"]`) : null;
    const now = $('#now');
    if (m.phase === 'project') {
      if (seg) seg.className = 'on';
      if (st) { st.textContent = 'Reading…'; st.className = 's'; }
      now.innerHTML = `Reading <strong>${esc(m.name)}</strong>${j.total > 1 ? `, ${i + 1} of ${j.total}` : ''}`;
    } else if (m.phase === 'done-project') {
      if (seg) seg.className = 'ok';
      if (st) { st.textContent = plural(m.chats, 'chat'); st.className = 's ok'; }
    } else if (m.phase === 'error') {
      if (seg) seg.className = 'bad';
      if (st) { st.textContent = 'Couldn’t save'; st.className = 's bad'; st.title = m.error || ''; }
    } else if (m.phase === 'extras') {
      now.textContent = 'Writing the case studies, prompt library and reader…';
    } else if (m.phase === 'pack') {
      now.textContent = 'Packing the ZIP…';
    }
  }

  // ------------------------------------------------------------------ done
  function finish(origin, r) {
    state.origin = origin; state.result = r; state.job = null;
    if (r.empty) {
      state.error = r.stopped ? 'You stopped it before any project was saved.' : 'None of the chosen projects had chats you can save.';
      return show('failed');
    }
    exports++;
    show('done');
    // If you moved to another tab while it ran, follow it now so the next export uses the tab you can see.
    activeTab().then((id) => { if (id != null && id !== tabId) follow(id); });
  }
  function fmtBytes(b) { if (!b) return ''; if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`; return `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`; }
  function renderDone() {
    const r = state.result, saved = r.projects.filter((p) => !p.failed && p.chats > 0);
    const unshared = r.projects.filter((p) => !p.failed && /shared/i.test(p.note || '')).length;
    const lines = [];
    if (r.stopped) lines.push(`<p class="warn">You stopped it part way, so this ZIP has the projects finished before that.</p>`);
    if (r.failed) lines.push(`<p class="warn">${plural(r.failed, 'project')} couldn’t be saved. Each has an <code>_error.txt</code> in its folder saying why.</p>`);
    if (unshared) lines.push(`<p class="next">${plural(unshared, 'shared project')} had no chats to save because the owner hasn’t shared them.</p>`);
    const showCard = r.stats && state.origin === 'panel' && r.extras && r.extras.wrapped;
    view.innerHTML = `<div class="scroll"><div class="done">
      <span class="stamp thunk" aria-hidden="true">ARCHIVED</span>
      <h2>${plural(r.totalChats, 'chat')} saved from ${plural(saved.length, 'project')}.</h2>
      <div class="file">
        <svg viewBox="0 0 26 26" aria-hidden="true"><rect x="3" y="7" width="20" height="16" rx="3" fill="#CDB884"/><rect x="3" y="4.5" width="9" height="5" rx="2.2" fill="#CDB884"/><rect x="3" y="10" width="20" height="13" rx="3" fill="#161E38"/><path d="M13 12.5v6m-2.6-2.6L13 18.5l2.6-2.6" stroke="#EAD9AE" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span><b>${esc(r.filename || 'Archive.zip').replace(/-/g, '-<wbr>')}</b><small>${esc(fmtBytes(r.bytes))}${r.bytes ? ', ' : ''}sent to your Downloads</small></span>
      </div>
      <p class="next">${r.extras && r.extras.viewer ? 'Unzip it and open <code>index.html</code> to read and search every chat.' : 'Unzip it. README.md lists every project folder.'}${r.extras && r.extras.caseStudy ? ' Each project folder has its <code>case-study.html</code>.' : ''}</p>
      ${exports > 1 ? '<p class="next">Not in Downloads? Chrome may be asking whether this site can download multiple files. Choose Allow, then archive again.</p>' : ''}
      ${lines.join('')}
      ${showCard ? `<section class="card">
        <h2>Your Wrapped card</h2>
        <canvas id="card" width="1080" height="1350" role="img" aria-label="Your Claude Design in numbers"></canvas>
        <label class="opt"><input type="checkbox" id="words"><span><b>Show my most-used words</b><small>The copy in the ZIP leaves them off. Turn this on only if you’re happy to share them.</small></span></label>
        <button class="primary" data-act="card">Save card as PNG</button>
      </section>` : ''}
    </div></div>
    <div class="foot"><button class="secondary" style="width:100%" data-act="back">Back to projects</button></div>`;
    if (showCard) drawCard();
  }
  function drawCard() {
    const c = $('#card'); if (!c || !globalThis.DCE || !DCE.drawWrapped) return;
    DCE.drawWrapped(c, state.result.stats, { words: !!($('#words') && $('#words').checked) });
  }
  function saveCard() {
    const c = $('#card'); if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'my-claude-design-archived.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }, 'image/png');
  }

  // ------------------------------------------------------------------ events
  view.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.id) { if (t.checked) state.selected.add(t.dataset.id); else state.selected.delete(t.dataset.id); state.notice = ''; renderNotice(); return updateGo(); }
    if (t.dataset.opt && t.dataset.opt in DEFAULTS) { opts[t.dataset.opt] = t.checked; return saveOpts(); }
    if (t.id === 'words') return drawCard();
  });
  view.addEventListener('input', (e) => { if (e.target.id === 'search') { state.query = e.target.value; renderList(); } });
  view.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.sel) {
      const shown = visibleProjects();
      for (const p of shown) { if (b.dataset.sel === 'all') state.selected.add(p.id); else state.selected.delete(p.id); }
      return renderList();
    }
    if (b.id === 'go') {
      const ids = state.projects.filter((p) => state.selected.has(p.id)).map((p) => p.id);
      if (!ids.length) return;
      if (!send({ type: 'export', ids, options: { ...opts, extras: { caseStudy: opts.caseStudy, viewer: opts.viewer, prompts: opts.prompts, wrapped: opts.wrapped } } })) return show('nopage');
      b.disabled = true; b.textContent = 'Starting…';
      return;
    }
    const act = b.dataset.act;
    if (act === 'open') return chrome.tabs.create({ url: DESIGN_URL });
    if (act === 'reload') { if (tabId != null) chrome.tabs.reload(tabId); return show('connecting'); }
    if (act === 'retry') { show('loading'); if (!send({ type: 'list' })) follow(tabId); return; }
    if (act === 'stop') { if (state.job) state.job.stopping = true; b.disabled = true; b.textContent = 'Stopping…'; send({ type: 'stop' }); return; }
    if (act === 'card') return saveCard();
    if (act === 'back' || act === 'restart') {
      state.result = null; state.error = '';
      if (port && state.projects.length) return show('ready');
      show('connecting'); drop(); return activeTab().then(follow);
    }
  });

  async function activeTab() {
    if (forcedTab != null) return forcedTab;
    try { const [t] = await chrome.tabs.query({ active: true, windowId }); return t ? t.id : null; } catch (e) { return null; }
  }

  async function init() {
    masthead();
    show('connecting');
    // Tests open the panel as a tab aimed at a given tab id. Only an unpacked (development) copy honours that.
    const fromUrl = Number(new URLSearchParams(location.search).get('tab'));
    if (Number.isInteger(fromUrl) && fromUrl > 0) {
      try { if ((await chrome.management.getSelf()).installType === 'development') forcedTab = fromUrl; } catch (e) { /* not available */ }
    }
    try { windowId = (await chrome.windows.getCurrent()).id; } catch (e) { windowId = null; }
    chrome.tabs.onActivated.addListener((info) => { if (forcedTab == null && info.windowId === windowId) follow(info.tabId); });
    chrome.tabs.onUpdated.addListener((id, info) => { if (id === tabId && info.status === 'complete' && !port) connect(id); });
    chrome.runtime.onMessage.addListener((msg, sender) => {
      if (msg && msg.type === 'dca-ready' && sender && sender.tab && sender.tab.id === tabId && !port) connect(tabId);
    });
    follow(await activeTab());
    // The countdown changes at midnight; check now and then.
    setInterval(masthead, 10 * 60 * 1000);
  }
  init();
})();

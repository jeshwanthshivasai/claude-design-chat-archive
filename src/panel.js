// The in-page "archive folder" UI. Lives in a shadow root so it never clashes with Claude Design's styles.
(function () {
  if (window.__dceMounted) return;
  window.__dceMounted = true;
  const D = globalThis.DCE;

  const css = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .wrap {
    --manila: #EAD9AE; --manila-deep: #DCC48C; --ink: #1E2A4A; --ink-soft: #4F5A78;
    --paper: #FBF6E9; --stamp: #A8321F;
    --serif: Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font: 13px/1.45 var(--sans); color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  button { font: inherit; color: inherit; cursor: pointer; }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  .tab {
    position: fixed; right: 0; top: 58%; z-index: 2147483646;
    writing-mode: vertical-rl; transform: rotate(180deg);
    background: var(--manila); color: var(--ink); border: 0;
    border-radius: 0 8px 8px 0;
    padding: 16px 9px; font: 600 12.5px/1 var(--sans); letter-spacing: .02em;
    box-shadow: 2px 0 0 var(--manila-deep), 0 6px 18px rgba(0,0,0,.35);
  }
  .tab:hover { padding-right: 13px; }
  .tab[aria-expanded="true"] { display: none; }

  .folder {
    position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
    width: min(380px, calc(100vw - 32px));
    max-height: calc(100vh - 40px); display: none; flex-direction: column;
    filter: drop-shadow(0 18px 40px rgba(0,0,0,.45));
  }
  .folder.open { display: flex; }
  @media (prefers-reduced-motion: no-preference) {
    .folder.open { animation: slide .18s ease-out; }
    @keyframes slide { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
  }
  .folder-tab {
    align-self: flex-start; background: var(--manila); border-radius: 8px 8px 0 0;
    padding: 8px 14px 6px; display: flex; align-items: baseline; gap: 10px;
  }
  .folder-tab h2 { margin: 0; font: 600 16px/1.2 var(--serif); }
  .body {
    background: var(--manila); border-radius: 0 8px 8px 8px; padding: 14px 16px 16px;
    display: flex; flex-direction: column; gap: 12px; min-height: 0;
    border-top: 1px solid var(--manila-deep);
  }
  .close {
    position: absolute; right: 8px; top: 34px; border: 0; background: transparent;
    width: 28px; height: 28px; border-radius: 50%; font-size: 18px; line-height: 1; color: var(--ink-soft);
  }
  .close:hover { background: var(--manila-deep); color: var(--ink); }
  p { margin: 0; }
  .lede { color: var(--ink-soft); max-width: 34em; padding-right: 20px; }

  .listhead { display: flex; justify-content: space-between; align-items: baseline; }
  .listhead strong { font-weight: 600; }
  .linkish { border: 0; background: none; padding: 0; color: var(--ink-soft); text-decoration: underline; text-underline-offset: 2px; }
  .linkish:hover { color: var(--ink); }
  .sel { display: inline-flex; gap: 12px; }
  .list {
    list-style: none; margin: 0; padding: 4px 0; background: var(--paper);
    border-radius: 4px; overflow: auto; max-height: 240px; min-height: 48px;
    box-shadow: inset 0 0 0 1px var(--manila-deep);
  }
  .list li label {
    display: grid; grid-template-columns: 18px 1fr auto; gap: 10px; align-items: center;
    padding: 7px 10px; cursor: pointer;
  }
  .list li + li label { border-top: 1px solid #EFE4C6; }
  .list li label:hover { background: #F5ECD3; }
  .list .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .list .shared { display: block; font-size: 11.5px; color: var(--ink-soft); }
  .list .date { color: var(--ink-soft); font-size: 12px; }
  .list .status { font-size: 12px; }
  .list .ok { color: var(--ink); }
  .list .bad { color: var(--stamp); }
  .empty { padding: 12px 10px; color: var(--ink-soft); }
  input[type=checkbox] { accent-color: var(--ink); width: 15px; height: 15px; margin: 0; }

  .opts { display: flex; flex-wrap: wrap; gap: 6px 18px; }
  .opts label { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }

  .actions { display: flex; gap: 8px; align-items: center; }
  .primary {
    flex: 1; border: 0; border-radius: 4px; background: var(--ink); color: var(--paper);
    padding: 10px 14px; font-weight: 600;
  }
  .primary:hover { background: #2B3A63; }
  .primary:disabled { background: var(--ink-soft); color: #E6E0CF; cursor: default; }
  .secondary { border: 1px solid var(--ink); background: transparent; border-radius: 4px; padding: 9px 12px; }

  .progress { display: none; flex-direction: column; gap: 6px; }
  .progress.on { display: flex; }
  .readout { font: 15px/1.3 var(--serif); }
  .bar { height: 6px; background: var(--manila-deep); border-radius: 3px; overflow: hidden; }
  .bar > i { display: block; height: 100%; width: 0; background: var(--ink); transition: width .25s ease; }
  @media (prefers-reduced-motion: reduce) { .bar > i { transition: none; } }
  .error { color: var(--stamp); }
  .foot { font-size: 11.5px; color: var(--ink-soft); border-top: 1px solid var(--manila-deep); padding-top: 10px; }
  `;

  const host = document.createElement('div');
  host.id = 'design-chat-archive';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${css}</style>
    <div class="wrap">
      <button class="tab" aria-expanded="false" aria-controls="dce-folder">Export chats</button>
      <section class="folder" id="dce-folder" role="dialog" aria-labelledby="dce-title" aria-modal="false">
        <div class="folder-tab"><h2 id="dce-title">Chat archive</h2></div>
        <div class="body">
          <button class="close" aria-label="Close">×</button>
          <p class="lede">Saves every conversation in your Claude Design projects as readable Markdown, one folder per project. Everything happens in this browser; nothing is sent anywhere.</p>
          <div class="listhead">
            <strong id="dce-count">Projects</strong>
            <span class="sel"><button class="linkish" data-sel="all">Select all</button><button class="linkish" data-sel="none">None</button></span>
          </div>
          <ul class="list" aria-labelledby="dce-count"><li class="empty">Loading your projects…</li></ul>
          <div class="opts">
            <label><input type="checkbox" id="dce-steps" checked> Show Claude's steps</label>
            <label><input type="checkbox" id="dce-raw" checked> Include raw data (JSON)</label>
          </div>
          <div class="progress" aria-live="polite">
            <p class="readout"></p>
            <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
          </div>
          <div class="actions">
            <button class="primary" disabled>Export</button>
            <button class="secondary" hidden>Stop</button>
          </div>
          <p class="foot">Unofficial tool, not made by Anthropic. The standalone Claude Design site closes on 14 December 2026, and its chats are deleted after that.</p>
        </div>
      </section>
    </div>`;
  document.documentElement.appendChild(host);

  const $ = (s) => root.querySelector(s);
  const tab = $('.tab'), folder = $('.folder'), list = $('.list'), countEl = $('#dce-count');
  const primary = $('.primary'), stopBtn = $('.secondary'), progress = $('.progress');
  const readout = $('.readout'), bar = $('.bar'), barFill = $('.bar > i');

  let projects = null, running = false, signal = { aborted: false };

  const shortDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const checked = () => [...list.querySelectorAll('input[type=checkbox]:checked')].map((c) => projects[Number(c.dataset.i)]);

  function refreshButton() {
    if (running) return;
    const n = projects ? checked().length : 0;
    primary.disabled = n === 0;
    primary.textContent = n === 0 ? 'Choose projects to export' : `Export ${n} project${n === 1 ? '' : 's'}`;
  }

  async function loadProjects() {
    try {
      projects = await D.listProjects();
    } catch (e) {
      list.innerHTML = `<li class="empty error">Couldn't load your projects. ${esc(e.message)}</li>`;
      return;
    }
    countEl.textContent = `${projects.length} project${projects.length === 1 ? '' : 's'}`;
    if (!projects.length) { list.innerHTML = '<li class="empty">No projects found in this account.</li>'; return refreshButton(); }
    list.innerHTML = projects.map((p, i) => `
      <li><label>
        <input type="checkbox" data-i="${i}" ${p.source === 'org' ? '' : 'checked'}>
        <span class="name">${esc(p.name || 'Untitled')}${p.source === 'org' ? `<span class="shared">Shared by ${esc(p.ownerDisplayName || 'a teammate')}</span>` : ''}</span>
        <span class="date" data-status="${i}">${esc(shortDate(p.updatedAt || p.viewedAt))}</span>
      </label></li>`).join('');
    refreshButton();
  }

  function open() {
    folder.classList.add('open'); tab.setAttribute('aria-expanded', 'true');
    if (!projects) loadProjects();
    setTimeout(() => $('.close').focus(), 0);
  }
  function close() {
    folder.classList.remove('open'); tab.setAttribute('aria-expanded', 'false'); tab.focus();
  }

  function setProgress(fraction, text) {
    const pct = Math.round(fraction * 100);
    barFill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(pct));
    readout.textContent = text;
  }

  function download(chunks, filename) {
    const url = URL.createObjectURL(new Blob(chunks, { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    root.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function run() {
    const chosen = checked();
    if (!chosen.length) return;
    running = true; signal = { aborted: false };
    primary.disabled = true; primary.textContent = 'Exporting…'; stopBtn.hidden = false;
    root.querySelectorAll('input').forEach((c) => (c.disabled = true));
    progress.classList.add('on'); readout.classList.remove('error');
    setProgress(0, `Starting with ${chosen[0].name}`);

    const statusFor = (id) => {
      const i = projects.findIndex((p) => p.projectId === id);
      return i >= 0 ? list.querySelector(`[data-status="${i}"]`) : null;
    };

    try {
      const { files, summary, rootDir } = await D.exportProjects(chosen, {
        includeSteps: $('#dce-steps').checked,
        includeRaw: $('#dce-raw').checked,
        signal,
        onProgress: (p) => {
          const s = statusFor(p.id);
          if (p.phase === 'project') setProgress(p.index / p.total, `Saving ${p.name} (${p.index + 1} of ${p.total})`);
          if (p.phase === 'done-project' && s) { s.textContent = `${p.chats} chat${p.chats === 1 ? '' : 's'}`; s.className = 'status ok'; }
          if (p.phase === 'error' && s) { s.textContent = 'Failed'; s.className = 'status bad'; s.title = p.error; }
        },
      });
      const done = summary.projects.length;
      if (!done) { setProgress(0, 'Stopped before anything was saved.'); return; }
      setProgress(1, 'Packing the ZIP…');
      await new Promise((r) => setTimeout(r, 30));
      download(D.makeZip(files), `${rootDir}.zip`);
      const stopped = signal.aborted && done < chosen.length ? ` Stopped after ${done} of ${chosen.length} projects.` : '';
      const failed = summary.failed ? ` ${summary.failed} project${summary.failed === 1 ? '' : 's'} failed; see _error.txt in the ZIP.` : '';
      setProgress(1, `Exported ${summary.totalChats} chats (${summary.totalMessages.toLocaleString()} messages) from ${done - summary.failed} project${done - summary.failed === 1 ? '' : 's'}.${stopped}${failed}`);
      if (summary.failed) readout.classList.add('error');
    } catch (e) {
      readout.classList.add('error');
      setProgress(0, `Export failed: ${e.message}`);
    } finally {
      running = false; stopBtn.hidden = true;
      root.querySelectorAll('input').forEach((c) => (c.disabled = false));
      refreshButton();
      if (!primary.disabled) primary.textContent = 'Export again';
    }
  }

  tab.addEventListener('click', open);
  $('.close').addEventListener('click', close);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !running) close(); });
  list.addEventListener('change', refreshButton);
  root.querySelectorAll('[data-sel]').forEach((b) => b.addEventListener('click', () => {
    if (running) return;
    list.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = b.dataset.sel === 'all'));
    refreshButton();
  }));
  primary.addEventListener('click', run);
  stopBtn.addEventListener('click', () => { signal.aborted = true; stopBtn.hidden = true; readout.textContent = 'Stopping after this project…'; });
})();

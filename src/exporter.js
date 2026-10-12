// Reads projects and chats from Claude Design using your own signed-in session.
// Read-only: it only calls ListProjects, ListOrgProjects and GetProject, the same
// requests the Claude Design page makes when you open it.
(function (root) {
  const NS = (root.DCE = root.DCE || {});
  // Absolute on purpose: a relative path would follow a <base href> on the page.
  const BASE = 'https://claude.ai/design/anthropic.omelette.api.v1alpha.OmeletteService/';
  const MAX_RETRY_AFTER_MS = 30_000;

  class RpcError extends Error {
    constructor(method, status, message) {
      super(`${method} failed (${status}): ${message}`);
      this.status = status;
    }
  }

  const isAbort = (e) => e && (e.name === 'AbortError' || e.code === 20);
  const aborted = (signal) => !!(signal && signal.aborted);
  const abortError = () => {
    try { return new DOMException('Export stopped', 'AbortError'); }
    catch (e) { const err = new Error('Export stopped'); err.name = 'AbortError'; return err; }
  };

  // A sleep that ends early (and rejects) when the signal is aborted.
  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (aborted(signal)) return reject(abortError());
      const t = setTimeout(() => { off(); resolve(); }, ms);
      const onAbort = () => { clearTimeout(t); off(); reject(abortError()); };
      const off = () => { if (signal && signal.removeEventListener) signal.removeEventListener('abort', onAbort); };
      if (signal && signal.addEventListener) signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function rpc(method, body, { retries = 4, fetchImpl, signal } = {}) {
    const f = fetchImpl || root.fetch.bind(root);
    let wait = 1000;
    for (let attempt = 0; ; attempt++) {
      if (aborted(signal)) throw abortError();
      let res;
      try {
        res = await f(BASE + method, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
          body: JSON.stringify(body || {}),
          signal: signal && signal.addEventListener ? signal : undefined,
        });
      } catch (e) {
        if (isAbort(e) || aborted(signal)) throw abortError();
        if (attempt >= retries) throw new RpcError(method, 'network', e.message || String(e));
        await sleep(wait, signal); wait *= 2; continue;
      }
      if (res.ok) {
        const type = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
        if (res.redirected || (type && !/json/i.test(type))) {
          throw new RpcError(method, 'session', 'your Claude session may have expired. Reload Claude Design, sign in if asked, and try again.');
        }
        try { return await res.json(); }
        catch (e) { throw new RpcError(method, 'format', 'the reply was not JSON. Reload Claude Design and try again.'); }
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < retries) {
        const ra = Number(res.headers && res.headers.get && res.headers.get('retry-after'));
        const delay = ra > 0 ? Math.min(ra * 1000, MAX_RETRY_AFTER_MS) : wait;
        await sleep(delay, signal); wait = Math.min(wait * 2, MAX_RETRY_AFTER_MS); continue;
      }
      let msg = res.statusText || `HTTP ${res.status}`;
      try { msg = (await res.json()).message || msg; } catch (e) { /* keep the status text */ }
      if (res.status === 401 || res.status === 403) msg = 'not signed in, or no access. Reload Claude Design and try again.';
      throw new RpcError(method, res.status, msg);
    }
  }

  const str = (v, fallback = '') => (typeof v === 'string' ? v : v == null ? fallback : String(v));
  const projectName = (p) => str(p && p.name).trim() || 'Untitled';

  async function listProjects(opts) {
    const byId = new Map();
    const mine = await rpc('ListProjects', {}, opts);
    for (const p of mine.items || []) if (p && p.projectId) byId.set(p.projectId, { ...p, name: projectName(p), source: 'yours' });
    // Team/Enterprise: projects shared in your organization. Optional; ignore if unavailable.
    try {
      const org = await rpc('ListOrgProjects', { type: 'PROJECT_TYPE_PROJECT' }, { ...opts, retries: 1 });
      for (const p of org.items || []) {
        if (p && p.projectId && !byId.has(p.projectId)) byId.set(p.projectId, { ...p, name: projectName(p), source: 'org' });
      }
    } catch (e) {
      if (isAbort(e)) throw e;
      /* personal accounts may not support this */
    }
    return [...byId.values()]
      .filter((p) => !p.type || p.type === 'PROJECT_TYPE_PROJECT')
      .sort((a, b) => str(b.updatedAt || b.viewedAt).localeCompare(str(a.updatedAt || a.viewedAt)));
  }

  function decodeData(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    const text = String(raw).trim();
    if (text.startsWith('{')) return JSON.parse(text);
    const bin = atob(text);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /**
   * @param {object[]} projects  items from listProjects
   * @param {{includeSteps?:boolean, includeRaw?:boolean, onProgress?:Function, signal?:AbortSignal, fetchImpl?:Function, delayMs?:number}} opts
   * @returns {Promise<{files:{path:string,data:string}[], summary:object, rootDir:string}>}
   */
  async function exportProjects(projects, opts = {}) {
    const R = NS;
    const signal = opts.signal;
    const exportedAt = new Date().toISOString();
    const rootDir = `claude-design-chats-${R.fileDate(exportedAt)}`;
    const files = [];
    const usedFolders = new Set(['readme.md']); // the archive README lives at the root
    const summary = { exportedAt, includeRaw: !!opts.includeRaw, projects: [], totalChats: 0, totalMessages: 0, failed: 0, stopped: false };
    const progress = opts.onProgress || (() => {});
    const includeSteps = opts.includeSteps !== false;

    for (let i = 0; i < projects.length; i++) {
      if (aborted(signal)) { summary.stopped = true; break; }
      const meta = projects[i];
      const name = projectName(meta);
      const folder = R.uniqueName(R.sanitizeName(name, 60), usedFolders);
      const dir = `${rootDir}/${folder}`;
      progress({ phase: 'project', id: meta.projectId, index: i, total: projects.length, name });

      const fail = (e) => {
        summary.failed++;
        summary.projects.push({ name, folder, failed: true, chats: 0, messages: 0, note: `Not exported: ${e.message}` });
        files.push({ path: `${dir}/_error.txt`, data: `Could not export this project.\n${e.message}\nProject ID: ${meta.projectId}\n` });
        progress({ phase: 'error', id: meta.projectId, index: i, total: projects.length, name, error: e.message });
      };

      let project, data, rawWritten = false;
      try {
        project = await rpc('GetProject', { projectId: meta.projectId }, opts);
        data = decodeData(project.data);
      } catch (e) {
        if (isAbort(e) || aborted(signal)) { summary.stopped = true; break; }
        fail(e);
        continue;
      }

      try {
        const finalName = str(project.name).trim() || name;
        const proj = { ...meta, ...project, name: finalName, created: data.created };
        // Respect sharing: if the owner has not shared chats, don't export any, whatever the payload holds.
        const canSeeChats = project.callerCanSeeChats !== false;
        const chats = canSeeChats ? R.sortedChats(data) : [];
        const usedFiles = new Set();
        const entries = [];
        chats.forEach((chat, c) => {
          const idx = c + 1;
          const stats = R.chatStats(chat);
          const title = str(chat.title).trim() || `Chat ${idx}`;
          const base = `${String(idx).padStart(2, '0')} ${R.sanitizeName(title, 60)} (${R.fileDate(chat.created || stats.first)})`;
          const file = R.uniqueName(base, usedFiles, '.md');
          files.push({ path: `${dir}/${file}`, data: R.renderChat(proj, chat, idx, { includeSteps, chatCount: chats.length }) });
          entries.push({ idx, title, file, stats });
        });

        let note = '';
        if (!canSeeChats) note = 'Owner has not shared chats with you';
        else if (!chats.length) note = 'No chats';

        files.push({ path: `${dir}/_index.md`, data: R.renderProjectIndex(proj, entries) });
        files.push({ path: `${dir}/_resume-in-claude.md`, data: R.renderResume(proj, entries) });
        if (opts.includeRaw && canSeeChats) {
          const raw = { exportedAt, projectId: meta.projectId, name: finalName, createdAt: project.createdAt, updatedAt: project.updatedAt, owner: project.ownerDisplayName, data };
          files.push({ path: `${dir}/_raw/project-data.json`, data: JSON.stringify(raw, null, 2) });
          rawWritten = true;
        }

        const messages = entries.reduce((s, e) => s + e.stats.total, 0);
        summary.projects.push({ name: finalName, folder, chats: chats.length, messages, note });
        summary.totalChats += chats.length;
        summary.totalMessages += messages;
        progress({ phase: 'done-project', id: meta.projectId, index: i, total: projects.length, name: finalName, chats: chats.length, messages });
      } catch (e) {
        // Rendering hit a shape we didn't expect. Keep the raw data so nothing is lost, and carry on.
        const keep = { exportedAt, projectId: meta.projectId, name, data };
        if (!rawWritten) {
          try { files.push({ path: `${dir}/_raw/project-data.json`, data: JSON.stringify(keep, null, 2) }); } catch (e2) { /* unserialisable; nothing more to keep */ }
        }
        fail(new Error(`${e.message} (the raw data was saved in _raw/project-data.json)`));
      }

      if (i < projects.length - 1) {
        try { await sleep(opts.delayMs == null ? 400 : opts.delayMs, signal); }
        catch (e) { summary.stopped = true; break; }
      }
    }

    let readme;
    try { readme = R.renderReadme(summary); }
    catch (e) { readme = `# Claude Design chat archive\n\nExported ${exportedAt}. The index could not be written (${e.message}); the project folders are complete.\n`; }
    files.unshift({ path: `${rootDir}/README.md`, data: readme });
    return { files, summary, rootDir };
  }

  Object.assign(NS, { rpc, listProjects, exportProjects, decodeData, sleep });
})(typeof globalThis !== 'undefined' ? globalThis : this);

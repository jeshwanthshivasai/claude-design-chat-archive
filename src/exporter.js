// Reads projects and chats from Claude Design using your own signed-in session.
// Read-only: it only calls ListProjects, ListOrgProjects and GetProject.
(function (root) {
  const NS = (root.DCE = root.DCE || {});
  const BASE = '/design/anthropic.omelette.api.v1alpha.OmeletteService/';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class RpcError extends Error {
    constructor(method, status, message) {
      super(`${method} failed (${status}): ${message}`);
      this.status = status;
    }
  }

  async function rpc(method, body, { retries = 4, fetchImpl } = {}) {
    const f = fetchImpl || root.fetch.bind(root);
    let wait = 1000;
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await f(BASE + method, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
          body: JSON.stringify(body || {}),
        });
      } catch (e) {
        if (attempt >= retries) throw new RpcError(method, 'network', e.message || String(e));
        await sleep(wait); wait *= 2; continue;
      }
      if (res.ok) return res.json();
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < retries) {
        const ra = Number(res.headers.get('retry-after'));
        await sleep(ra > 0 ? ra * 1000 : wait); wait *= 2; continue;
      }
      let msg = res.statusText;
      try { msg = (await res.json()).message || msg; } catch (e) { /* ignore */ }
      if (res.status === 401 || res.status === 403) msg = 'not signed in, or no access. Reload Claude Design and try again.';
      throw new RpcError(method, res.status, msg);
    }
  }

  async function listProjects(opts) {
    const byId = new Map();
    const mine = await rpc('ListProjects', {}, opts);
    for (const p of mine.items || []) byId.set(p.projectId, { ...p, source: 'yours' });
    // Team/Enterprise: projects shared in your organization. Optional; ignore if unavailable.
    try {
      const org = await rpc('ListOrgProjects', { type: 'PROJECT_TYPE_PROJECT' }, { ...opts, retries: 1 });
      for (const p of org.items || []) if (!byId.has(p.projectId)) byId.set(p.projectId, { ...p, source: 'org' });
    } catch (e) { /* personal accounts may not support this */ }
    return [...byId.values()]
      .filter((p) => !p.type || p.type === 'PROJECT_TYPE_PROJECT')
      .sort((a, b) => String(b.updatedAt || b.viewedAt || '').localeCompare(String(a.updatedAt || a.viewedAt || '')));
  }

  function decodeData(b64) {
    if (!b64) return {};
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /**
   * @param {object[]} projects  items from listProjects
   * @param {{includeSteps:boolean, includeRaw:boolean, onProgress?:Function, signal?:{aborted:boolean}, fetchImpl?:Function, delayMs?:number}} opts
   * @returns {Promise<{files:{path:string,data:string}[], summary:object}>}
   */
  async function exportProjects(projects, opts = {}) {
    const R = NS;
    const exportedAt = new Date().toISOString();
    const rootDir = `claude-design-chats-${R.fmtDate(exportedAt, false)}`;
    const files = [];
    const usedFolders = new Set();
    const summary = { exportedAt, includeRaw: !!opts.includeRaw, projects: [], totalChats: 0, totalMessages: 0, failed: 0 };
    const progress = opts.onProgress || (() => {});

    for (let i = 0; i < projects.length; i++) {
      if (opts.signal && opts.signal.aborted) break;
      const meta = projects[i];
      const folder = R.uniqueName(R.sanitizeName(meta.name, 60), usedFolders);
      const dir = `${rootDir}/${folder}`;
      progress({ phase: 'project', id: meta.projectId, index: i, total: projects.length, name: meta.name });

      let project, data;
      try {
        project = await rpc('GetProject', { projectId: meta.projectId }, opts);
        data = decodeData(project.data);
      } catch (e) {
        summary.failed++;
        summary.projects.push({ name: meta.name, folder, failed: true, chats: 0, messages: 0, note: `Not exported: ${e.message}` });
        files.push({ path: `${dir}/_error.txt`, data: `Could not export this project.\n${e.message}\nProject ID: ${meta.projectId}\n` });
        progress({ phase: 'error', id: meta.projectId, index: i, total: projects.length, name: meta.name, error: e.message });
        continue;
      }

      const proj = { ...meta, ...project, name: project.name || meta.name, created: data.created };
      const chats = R.sortedChats(data);
      const usedFiles = new Set();
      const entries = [];
      chats.forEach((chat, c) => {
        const idx = c + 1;
        const stats = R.chatStats(chat);
        const title = chat.title || `Chat ${idx}`;
        const file = R.uniqueName(`${String(idx).padStart(2, '0')} ${R.sanitizeName(title, 60)} (${R.fmtDate(chat.created || stats.first, false)}).md`, usedFiles);
        files.push({ path: `${dir}/${file}`, data: R.renderChat(proj, chat, idx, { includeSteps: opts.includeSteps !== false, chatCount: chats.length }) });
        entries.push({ idx, title, file, stats });
      });

      let note = '';
      if (!chats.length && project.callerCanSeeChats === false) note = 'Owner has not shared chats with you';
      else if (!chats.length) note = 'No chats';

      files.push({ path: `${dir}/_index.md`, data: R.renderProjectIndex(proj, entries) });
      files.push({ path: `${dir}/_resume-in-claude.md`, data: R.renderResume(proj, entries) });
      if (opts.includeRaw) {
        const raw = { exportedAt, projectId: meta.projectId, name: proj.name, createdAt: project.createdAt, updatedAt: project.updatedAt, owner: project.ownerDisplayName, data };
        files.push({ path: `${dir}/_raw/project-data.json`, data: JSON.stringify(raw, null, 2) });
      }

      const messages = entries.reduce((s, e) => s + e.stats.total, 0);
      summary.projects.push({ name: proj.name, folder, chats: chats.length, messages, note });
      summary.totalChats += chats.length;
      summary.totalMessages += messages;
      progress({ phase: 'done-project', id: meta.projectId, index: i, total: projects.length, name: proj.name, chats: chats.length, messages });

      if (i < projects.length - 1) await sleep(opts.delayMs == null ? 400 : opts.delayMs);
    }

    files.unshift({ path: `${rootDir}/README.md`, data: R.renderReadme(summary) });
    return { files, summary, rootDir };
  }

  Object.assign(NS, { rpc, listProjects, exportProjects, decodeData });
})(typeof globalThis !== 'undefined' ? globalThis : this);

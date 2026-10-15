// Connects the side panel to this Claude Design tab. The panel asks; this script reads your projects with
// your own session (same as before), runs the export here, and reports progress back. Only this
// extension's own pages can open the connection, and every request is checked before it is acted on.
(function () {
  const NS = globalThis.DCE;
  if (!NS || NS.__bridge) return;
  NS.__bridge = true;
  const VERSION = (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '';

  // ------------------------------------------------------------------ one export at a time, for any caller
  const listeners = new Set();
  let job = null;
  const emit = (msg) => { for (const fn of [...listeners]) { try { fn(msg); } catch (e) { /* a closed panel */ } } };
  const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  const projectId = () => { const m = location.pathname.match(/^\/design\/p\/([A-Za-z0-9_-]{6,})/); return m ? m[1] : null; };

  function liteResult(r) {
    const s = r.summary;
    return {
      empty: !!r.empty, filename: r.filename || null, bytes: r.bytes || 0, extras: r.extras || {}, stats: r.stats || null,
      stopped: !!s.stopped, failed: s.failed, totalChats: s.totalChats, totalMessages: s.totalMessages,
      projects: s.projects.map((p) => ({ name: p.name, chats: p.chats, messages: p.messages, failed: !!p.failed, note: p.note || '' })),
    };
  }

  async function startJob(projects, options, origin) {
    if (job || NS.isBusy()) throw new Error('An export is already running in this tab.');
    const controller = new AbortController();
    job = { origin, controller, total: projects.length, last: null, names: projects.map((p) => p.name) };
    emit({ type: 'started', origin, total: projects.length, names: job.names });
    try {
      const r = await NS.runExport(projects, {
        includeSteps: options.includeSteps !== false,
        includeRaw: !!options.includeRaw,
        requireChats: !!options.requireChats,
        myUuid: options.myUuid || null,
        extras: options.extras,
        rootDir: options.rootDir,
        signal: controller.signal,
        onProgress: (p) => {
          const msg = { type: 'progress', phase: p.phase, index: p.index, total: p.total, name: p.name, chats: p.chats, error: p.error };
          job.last = msg; emit(msg);
        },
      });
      const lite = liteResult(r);
      emit({ type: 'done', origin, result: lite });
      return lite;
    } catch (e) {
      emit({ type: 'failed', origin, message: e.message || String(e) });
      throw e;
    } finally {
      job = null;
    }
  }
  const stopJob = () => { if (job) job.controller.abort(); };
  const jobState = () => (job ? { origin: job.origin, total: job.total, names: job.names, last: job.last } : null);

  Object.assign(NS, { startJob, stopJob, jobState, onJob: on, currentProjectId: projectId });

  // ------------------------------------------------------------------ the side panel's connection
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'dca' || !port.sender || port.sender.id !== chrome.runtime.id) return;
    let projects = null;
    const send = (m) => { try { port.postMessage(m); } catch (e) { /* panel closed */ } };
    const off = on(send);
    port.onDisconnect.addListener(off);

    port.onMessage.addListener(async (msg) => {
      if (!msg || typeof msg.type !== 'string') return;
      if (msg.type === 'hello') return send({ type: 'hello', version: VERSION, projectId: projectId(), job: jobState() });
      if (msg.type === 'list') {
        try {
          projects = await NS.listProjects();
          send({ type: 'projects', projects: projects.map((p) => ({ id: String(p.projectId), name: p.name, source: p.source, owner: p.source === 'org' ? (p.ownerDisplayName || '') : '', updated: p.updatedAt || p.viewedAt || null })) });
        } catch (e) { send({ type: 'error', where: 'list', message: e.message || String(e) }); }
        return;
      }
      if (msg.type === 'stop') return stopJob();
      if (msg.type === 'export') {
        if (!projects) return send({ type: 'error', where: 'export', message: 'The project list is out of date. Reload the panel.' });
        const ids = new Set(Array.isArray(msg.ids) ? msg.ids.filter((x) => typeof x === 'string') : []);
        const chosen = projects.filter((p) => ids.has(String(p.projectId)));
        if (!chosen.length) return send({ type: 'error', where: 'export', message: 'Choose at least one project.' });
        const o = (msg.options && typeof msg.options === 'object') ? msg.options : {};
        const x = (o.extras && typeof o.extras === 'object') ? o.extras : {};
        const options = {
          includeSteps: bool(o.includeSteps, true), includeRaw: bool(o.includeRaw, false), requireChats: true,
          extras: { viewer: bool(x.viewer, true), caseStudy: bool(x.caseStudy, true), prompts: bool(x.prompts, true), wrapped: bool(x.wrapped, true) },
          myUuid: (projects.find((p) => p.isOwned === true && p.ownerUuid) || {}).ownerUuid || null,
        };
        if (job || NS.isBusy()) return send({ type: 'error', where: 'export', message: 'An export is already running in this tab.' });
        startJob(chosen, options, 'panel').catch(() => { /* reported to the panel through 'failed' */ });
      }
    });
  });

  // Tell an open side panel that this tab is ready, so it can connect without a reload.
  try { const p = chrome.runtime.sendMessage({ type: 'dca-ready' }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* no panel open */ }
})();

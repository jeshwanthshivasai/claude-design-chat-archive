// Runs one export from start to finish: fetch and render the chats, add the extras (offline reader,
// case studies, prompt library, Wrapped card), pack the ZIP and hand it to the browser's downloads.
// Used by the side panel (through bridge.js) and by the in-page "Save chats" button.
(function (root) {
  const NS = (root.DCE = root.DCE || {});
  let busy = false;

  const DEFAULT_EXTRAS = { viewer: true, caseStudy: true, prompts: true, wrapped: true };

  // The link is never added to the page's DOM. The page's own scripts can still notice the download through
  // the Navigation API (they see the blob: URL and the file name), as they could for any download it starts;
  // the data in it came from that same site.
  function downloadBlob(parts, filename, type = 'application/zip') {
    const url = URL.createObjectURL(new Blob(parts, { type }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // Above this much chat text, one reader page would be too big for a browser tab to build or open.
  const READER_MAX_CHARS = 60_000_000;
  const readerChars = (vp) => vp.reduce((n, p) => n + p.chats.reduce((m, c) => m + c.m.reduce((k, x) => k + (x.b ? x.b.length : 0) + (x.x ? x.x.length : 0), 0), 0), 0);

  function promptGroups(analyses) {
    return analyses.filter((a) => a.prompts.length).map((a) => ({
      n: a.name,
      p: [...a.prompts].sort((x, y) => (y.kept - x.kept) || ((x.t || 0) - (y.t || 0))).map((p) => ({ x: p.text, k: p.kept, t: p.t, c: p.chat })),
    }));
  }

  const isBusy = () => busy;

  /**
   * @param {object[]} projects  items from listProjects
   * @param {{extras?:object, includeSteps?:boolean, includeRaw?:boolean, rootDir?:string, signal?:AbortSignal,
   *          onProgress?:Function, download?:boolean, makePng?:boolean, requireChats?:boolean, myUuid?:string,
   *          fetchImpl?:Function, delayMs?:number}} opts
   */
  async function runExport(projects, opts = {}) {
    if (busy) throw new Error('An export is already running in this tab. Wait for it to finish.');
    busy = true;
    try {
      const R = NS;
      const want = { ...DEFAULT_EXTRAS, ...(opts.extras || {}) };
      const includeSteps = opts.includeSteps !== false;
      const progress = opts.onProgress || (() => {});
      const analyses = [], viewerProjects = [], problems = [];
      // Whose words are whose: your account is the owner of the projects listed as yours.
      const myUuid = opts.myUuid || ((projects.find((p) => p && p.isOwned === true && p.ownerUuid) || {}).ownerUuid) || null;
      const note = (what, e) => problems.push(`${what}: ${(e && e.message) || e}`);

      const res = await R.exportProjects(projects, {
        ...opts,
        onProjectData: (p) => {
          const owned = p.meta.isOwned === true || (p.meta.isOwned == null && p.meta.source === 'yours');
          const a = R.analyzeProject(p.proj, p.chats, p.data, { owned, myUuid }); // a failure here is caught by exportProjects
          analyses.push(a);
          if (want.caseStudy) {
            try { p.files.push({ path: `${p.dir}/case-study.html`, data: R.caseStudyHtml(a) }); a.hasCaseStudy = true; }
            catch (e) { note(`Case study for ${a.name}`, e); }
          }
          if (want.viewer) {
            try { viewerProjects.push(R.viewerProject(p, a, { includeSteps, caseStudy: !!a.hasCaseStudy })); }
            catch (e) { note(`Reader page for ${a.name}`, e); }
          }
        },
      });
      const { files, summary, rootDir } = res;
      if (!summary.projects.length) return { summary, rootDir, empty: true };
      // A one-project save with no readable chats would only download an empty folder.
      if (opts.requireChats && !summary.totalChats) return { summary, rootDir, empty: true };

      // Each extra is optional: if one fails, the transcripts and the other extras are still saved.
      const made = { viewer: false, caseStudy: want.caseStudy && analyses.some((a) => a.hasCaseStudy), prompts: false, wrapped: false };
      let stats = null;
      if (analyses.length) {
        progress({ phase: 'extras' });
        try { stats = R.wrappedStats(analyses); } catch (e) { note('Wrapped numbers', e); }
        if (want.prompts) {
          try { files.push({ path: `${rootDir}/prompts.md`, data: R.promptsMarkdown(analyses) }); made.prompts = true; }
          catch (e) { note('Prompt library', e); }
        }
        if (want.wrapped && stats && opts.makePng !== false && R.wrappedPng) {
          try {
            const png = await R.wrappedPng(stats, { words: false }); // the shared card never shows your words by default
            files.push({ path: `${rootDir}/wrapped.png`, data: png.bytes }); made.wrapped = true;
          } catch (e) { note('Wrapped card', e); }
        }
        if (want.viewer && viewerProjects.length) {
          if (readerChars(viewerProjects) > READER_MAX_CHARS) {
            note('Offline reader', 'these chats are too large for one page, so index.html was left out. Read the Markdown files instead, or archive fewer projects at a time');
          } else {
            try {
              const data = { exportedAt: summary.exportedAt, projects: viewerProjects, prompts: made.prompts ? promptGroups(analyses) : [], hasWrappedPng: made.wrapped };
              files.push({ path: `${rootDir}/index.html`, data: R.viewerHtml(data) }); made.viewer = true;
            } catch (e) { note('Offline reader', e); }
          }
          viewerProjects.length = 0; // let the copies go before the ZIP is packed
        }
      }
      if (problems.length) files.push({ path: `${rootDir}/_extras-error.txt`, data: `Some extras could not be made. Your chat transcripts are complete.\n\n${problems.join('\n')}\n` });
      summary.extrasProblems = problems.length;
      summary.extras = made;
      // The README was written before the extras existed; write it again so it lists only what is really there.
      if (files[0] && files[0].path === `${rootDir}/README.md`) {
        try { files[0] = { path: files[0].path, data: R.renderReadme(summary) }; } catch (e) { /* keep the first README */ }
      }

      progress({ phase: 'pack' });
      await new Promise((r) => setTimeout(r, 30)); // let the progress message paint before the busy work
      const chunks = R.makeZip(files);
      const filename = `${rootDir}.zip`;
      const bytes = chunks.reduce((n, c) => n + c.length, 0);
      if (opts.download !== false) downloadBlob(chunks, filename);
      return { summary, rootDir, filename, bytes, stats, extras: made, problems: problems.length, chunks: opts.download === false ? chunks : undefined };
    } finally {
      busy = false;
    }
  }

  Object.assign(NS, { runExport, downloadBlob, isBusy, promptGroups });
})(typeof globalThis !== 'undefined' ? globalThis : this);

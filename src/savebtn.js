// Puts a "Save chats" button in each project's toolbar, just before Share. One click saves that project's
// chats, its case study and an offline reader as a ZIP. The button copies the toolbar's own type and colours
// so it looks at home in light and dark mode; it lives in a closed shadow root so the page can't restyle it.
(function () {
  const NS = globalThis.DCE;
  if (!NS || NS.__savebtn) return;
  NS.__savebtn = true;

  const ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h3.1l1.4 1.5H13c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6.6v4.1M6.2 9l1.8 1.8L9.8 9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let host = null, button = null, scheduled = false;

  const isProject = () => !!NS.currentProjectId();
  const lum = (rgb) => { const m = String(rgb).match(/[\d.]+/g); if (!m || m.length < 3) return 0; const [r, g, b] = m.slice(0, 3).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

  function findShare() {
    for (const b of document.querySelectorAll('button')) {
      const label = (b.getAttribute('aria-label') || b.textContent || '').trim();
      if (!/^share$/i.test(label)) continue;
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.top < 140) return b;
    }
    return null;
  }
  // Share sits inside a couple of single-child wrappers; go up to the one that sits in the toolbar row.
  function slotFor(share) {
    let el = share;
    while (el.parentElement && el.parentElement !== document.body && el.parentElement.children.length === 1) el = el.parentElement;
    return el;
  }

  // The markup is fixed text. The toolbar's font and colour are copied in as CSS custom properties with
  // setProperty, so nothing the page controls is ever parsed as HTML inside the shadow root.
  const BUTTON_HTML = `<style>
      :host{all:initial;display:inline-flex}
      button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 9px;border-radius:8px;cursor:pointer;white-space:nowrap;
        font-weight:var(--w,500);font-size:var(--s,12px);line-height:16px;font-family:var(--f,system-ui,sans-serif);color:var(--c,inherit);
        border:1px solid var(--b);transition:background .15s,border-color .15s}
      button:hover{background:var(--hb);border-color:var(--hbd)}
      button:focus-visible{outline:2px solid var(--a);outline-offset:2px}
      button[aria-busy=true]{cursor:progress;opacity:.75}
      svg{width:14px;height:14px;color:var(--a);flex:none}
      @media (prefers-reduced-motion:reduce){button{transition:none}}
    </style><button type="button" title="Design Chat Archive (unofficial extension): save this project's chats, a case study and an offline reader as a ZIP. Nothing leaves your browser.">${ICON}<span>Save chats</span></button>`;

  function build(share) {
    const ref = document.querySelector('button[aria-label="Present"]') || share;
    const cs = getComputedStyle(ref);
    const dark = lum(cs.color) > 0.55; // light text means a dark toolbar
    host = document.createElement('span');
    host.style.cssText = 'display:inline-flex;align-items:center;flex:none';
    const vars = {
      '--w': cs.fontWeight, '--s': cs.fontSize, '--f': cs.fontFamily, '--c': cs.color,
      '--b': dark ? 'rgba(234,217,174,.28)' : 'rgba(180,80,47,.30)', '--hb': dark ? 'rgba(234,217,174,.10)' : 'rgba(180,80,47,.07)',
      '--hbd': dark ? 'rgba(234,217,174,.5)' : 'rgba(180,80,47,.55)', '--a': dark ? '#EAD9AE' : '#B4502F',
    };
    for (const [k, v] of Object.entries(vars)) if (v) host.style.setProperty(k, String(v));
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = BUTTON_HTML;
    button = root.querySelector('button');
    button.addEventListener('click', (e) => { if (e.isTrusted) save(); }); // only a real click by you
  }

  function ensure() {
    scheduled = false;
    if (!isProject()) { if (host && host.isConnected) host.remove(); return; }
    if (host && host.isConnected) return;
    const share = findShare(); if (!share) return;
    if (!host) build(share);
    const slot = slotFor(share);
    if (slot.parentElement) slot.parentElement.insertBefore(host, slot);
  }
  const schedule = () => { if (!scheduled) { scheduled = true; setTimeout(ensure, 250); } };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();

  // ------------------------------------------------------------------ toast
  let toastHost = null, toastRoot = null, hideTimer = null;
  function toast({ title, text = '', busy = false, tone = 'ok', linger = 0 }) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastRoot = toastHost.attachShadow({ mode: 'closed' });
      toastRoot.innerHTML = `<style>
        :host{all:initial}
        .t{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;width:min(440px,calc(100vw - 32px));
          display:grid;grid-template-columns:28px 1fr 24px;gap:12px;align-items:start;padding:14px 14px 14px 16px;border-radius:14px;
          background:#161E38;color:#FBF6E9;box-shadow:0 18px 50px rgba(0,0,0,.45),0 0 0 1px rgba(234,217,174,.18);
          font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
        .t.bad{box-shadow:0 18px 50px rgba(0,0,0,.45),0 0 0 1px rgba(196,86,52,.7)}
        .mark{width:28px;height:28px;border-radius:7px;background:#EAD9AE;color:#161E38;display:grid;place-items:center}
        .bad .mark{background:#C45634;color:#FBF6E9}
        .mark svg{width:16px;height:16px}
        b{display:block;font:600 14px/1.3 Charter,"Iowan Old Style",Georgia,serif;margin:2px 0 2px}
        p{margin:0;color:#C9CEDF}
        .who{display:block;font-size:11px;color:#8F97B3;letter-spacing:.01em}
        .bar{height:3px;border-radius:2px;background:rgba(234,217,174,.2);overflow:hidden;margin-top:10px}
        .bar i{display:block;height:100%;width:35%;background:#EAD9AE;border-radius:2px;animation:slide 1.1s ease-in-out infinite}
        @keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(290%)}}
        @media (prefers-reduced-motion:reduce){.bar i{animation:none;width:100%;opacity:.5}}
        .x{all:unset;cursor:pointer;width:24px;height:24px;border-radius:6px;display:grid;place-items:center;color:#AEB5CC;font:18px/1 system-ui}
        .x:hover{background:rgba(255,255,255,.08);color:#FBF6E9}.x:focus-visible{outline:2px solid #EAD9AE}
      </style><div class="t" role="status" aria-live="polite"><span class="mark">${ICON}</span><div><small class="who">Design Chat Archive (unofficial)</small><b></b><p></p><div class="bar"><i></i></div></div><button class="x" aria-label="Dismiss">×</button></div>`;
      toastRoot.querySelector('.x').addEventListener('click', () => toastHost.remove());
      toastRoot.querySelector('.t').addEventListener('mouseenter', () => clearTimeout(hideTimer));
    }
    if (!toastHost.isConnected) document.documentElement.appendChild(toastHost);
    const box = toastRoot.querySelector('.t');
    box.classList.toggle('bad', tone === 'bad');
    toastRoot.querySelector('b').textContent = title;
    toastRoot.querySelector('p').textContent = text;
    toastRoot.querySelector('.bar').style.display = busy ? '' : 'none';
    clearTimeout(hideTimer);
    if (linger) hideTimer = setTimeout(() => toastHost.remove(), linger);
  }

  const plural = (n, w) => `${(n || 0).toLocaleString('en')} ${w}${n === 1 ? '' : 's'}`;

  async function save() {
    const id = NS.currentProjectId();
    if (!id) return;
    if (NS.jobState() || NS.isBusy()) return toast({ title: 'An export is already running', text: 'Wait for it to finish, then try again.', linger: 5000 });
    button.setAttribute('aria-busy', 'true');
    toast({ title: 'Saving this project’s chats', text: 'Finding the project…', busy: true });
    const off = NS.onJob((m) => {
      if (m.type !== 'progress') return;
      const words = { project: 'Reading the chats…', 'done-project': `Read ${plural(m.chats, 'chat')}. Writing the case study…`, extras: 'Writing the case study and the offline reader…', pack: 'Packing the ZIP…' };
      if (words[m.phase]) toast({ title: 'Saving this project’s chats', text: words[m.phase], busy: true });
    });
    try {
      let meta = null;
      try { meta = (await NS.listProjects()).find((p) => String(p.projectId) === id) || null; } catch (e) { if (e && e.status === 401) throw e; }
      // Not in either list: treat it as someone else's, so chats are saved only if the owner shared them.
      if (!meta) meta = { projectId: id, name: (document.title || '').trim() || 'This project', source: 'org' };
      const rootDir = `${NS.sanitizeName(meta.name, 40)} chats ${NS.fileDate(new Date().toISOString())}`;
      const r = await NS.startJob([meta], { includeSteps: true, includeRaw: false, requireChats: true, rootDir, extras: { viewer: true, caseStudy: true, prompts: true, wrapped: false } }, 'button');
      const p = r.projects[0] || {};
      if (p.failed) toast({ title: 'Couldn’t save this project', text: p.note || 'Reload the page and try again.', tone: 'bad', linger: 12000 });
      else if (!r.totalChats) toast({ title: 'Nothing to save', text: p.note && /shared/i.test(p.note) ? 'The owner hasn’t shared this project’s chats with you.' : 'This project has no chats yet.', linger: 8000 });
      else toast({ title: `Saved ${plural(r.totalChats, 'chat')} from ${p.name || 'this project'}`, text: 'Unzip it and open index.html to read and search them. The case study is in the project folder.', linger: 12000 });
    } catch (e) {
      toast({ title: 'Couldn’t save this project', text: (e && e.message) || String(e), tone: 'bad', linger: 12000 });
    } finally {
      off(); button.removeAttribute('aria-busy');
    }
  }

})();

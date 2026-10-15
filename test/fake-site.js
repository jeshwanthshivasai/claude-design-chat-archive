// A fake Claude Design for tests and store screenshots: dummy hobby projects, the real API's shapes.
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const EXT = path.resolve(__dirname, '..');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
const T = (d, h, m = 0) => `2026-${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;
const M = (role, content, ts, extra = {}) => ({ role, content, timestamp: ts, ...extra });

// Dummy hobby projects only.
const PROJECTS = {
  'p-ceramics-0001': { name: 'Ceramics studio site', updatedAt: T('10-12', 10), chats: {
    a: { title: 'Landing page', created: T('09-02', 9), messages: [
      M('user', 'Design a landing page for a small ceramics studio in Bangalore. Warm and tactile, no stock photos, room for class bookings.', T('09-02', 9)),
      M('assistant', 'A few questions first.', T('09-02', 9, 1), { questionRecord: { event: 'asked', questionId: 'q1', spec: { title: 'Direction', questions: [{ id: 'tone', title: 'Tone' }, { id: 'type', title: 'Typeface feel' }] } } }),
      M('user', '', T('09-02', 9, 3), { questionReceipt: { questionId: 'q1', payload: { tone: { choice: 'Earthy and calm' }, type: { text: 'A serif with some grit' } } } }),
      M('assistant', 'Here is a first pass with a full-bleed hero, class cards and a footer map.', T('09-02', 9, 6), { turnChanges: { created: ['index.html', 'styles.css'] } }),
      M('user', 'Too busy. Strip it back: one photo of hands on clay, the name, and a single “Book a class” button.', T('09-02', 10)),
      M('assistant', 'Simplified the hero and moved classes below the fold.', T('09-02', 10, 4), { turnChanges: { edited: ['index.html'] } }),
      M('user', 'Better. Add a booking section with three class types, prices in rupees and a weekday/weekend toggle.', T('09-03', 18)),
      M('assistant', 'Added the booking section.', T('09-03', 18, 5), { turnChanges: { created: ['booking.html'] } }),
    ] },
    b: { title: 'Shop page', created: T('09-10', 20), messages: [
      M('user', 'Now a shop page for mugs and plates. Grid of products, each with glaze name and price.', T('09-10', 20)),
      M('assistant', 'Shop grid done.', T('09-10', 20, 7), { turnChanges: { created: ['shop.html'] } }),
      M('user', 'Make the cards less generic, more like handwritten price tags tied with string.', T('09-10', 21)),
      M('assistant', 'Reworked the cards as tags.', T('09-10', 21, 6), { turnChanges: { edited: ['shop.html'] } }),
    ] },
  }, assets: { 'index.html': { versions: [{ createdAt: T('09-02', 9, 6), subtitle: 'First pass' }, { createdAt: T('09-02', 10, 4), subtitle: 'Quieter hero' }] }, 'shop.html': { versions: [{ createdAt: T('09-10', 21, 6), subtitle: 'Price tags' }] } } },
  'p-recipes-0002': { name: 'Weeknight recipe app', updatedAt: T('10-05', 19), chats: {
    a: { title: 'Home screen', created: T('09-20', 19), messages: [
      M('user', 'Mobile home screen for a recipe app for busy people: what can I cook in 20 minutes with what I have?', T('09-20', 19)),
      M('assistant', 'Built a home screen with an ingredient picker.', T('09-20', 19, 4), { turnChanges: { created: ['home.html'] } }),
      M('user', 'Instead of a picker, let me scan the fridge shelf with the camera.', T('09-21', 8)),
      M('assistant', 'Swapped in a camera-first flow. Files:\n|-- home.html\n|-- scan.js\n| a | b\n|\n' + '>'.repeat(30) + ' deep quote\n\n| Screen | State |\n|---|---|\n| Home | done |', T('09-21', 8, 5), { turnChanges: { edited: ['home.html'] } }),
    ] },
  } },
  'p-poster-0003': { name: 'Running club poster', updatedAt: T('08-30', 7), chats: {
    a: { title: 'Poster', created: T('08-30', 6), messages: [
      M('user', 'A4 poster for a Sunday 6am running club at Cubbon Park. Bold, sunrise colours.', T('08-30', 6)),
      M('assistant', 'Poster ready.', T('08-30', 6, 3), { turnChanges: { created: ['poster.html'] } }),
    ] },
  } },
};
const ORG = { 'p-team-0004': { name: 'Team offsite deck', owner: 'Priya', callerCanSeeChats: false, chats: { a: { title: 'Secret', created: T('09-01', 9), messages: [M('user', 'CONFIDENTIAL', T('09-01', 9))] } } } };

const PAGE = (title) => `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;background:#1c1b19;color:#f0efec;font:14px system-ui;height:100vh;display:flex;flex-direction:column}
.bar{display:flex;justify-content:space-between;align-items:center;height:52px;padding:0 14px;border-bottom:1px solid #2c2b28;flex:none}
.main{flex:1;display:flex;min-height:0}.chat{width:300px;border-right:1px solid #2c2b28;padding:16px;display:flex;flex-direction:column;gap:12px;font-size:12.5px;line-height:1.45}
.you{align-self:flex-end;background:#34322e;border-radius:10px;padding:8px 11px;max-width:88%}.cl{color:rgba(250,249,245,.56)}
.reply{margin-top:auto;border:1px solid #3a3833;border-radius:12px;padding:10px 12px;color:rgba(250,249,245,.56)}
.canvas{flex:1;display:grid;place-items:center;background:#2a2926}.art{width:78%;height:80%;background:#f2e8da;border-radius:6px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.4)}
.nav{display:flex;justify-content:space-between;padding:14px 20px;color:#4a2e22;font:700 16px Georgia,serif}.nav span{font:500 11px system-ui}
.hero{flex:1;margin:0 20px;border-radius:4px;background:linear-gradient(160deg,#b8693f,#8c4529);position:relative}.hero b{position:absolute;left:22px;bottom:20px;color:#fbf1e4;font:700 30px/1.05 Georgia,serif}
.cta{display:flex;gap:10px;padding:14px 20px;font-size:11px;color:#4a2e22}.cta i{font-style:normal;background:#4a2e22;color:#f2e8da;padding:7px 12px;border-radius:99px;font-weight:600}</style></head>
<body>
<header class="bar">
  <div style="font-weight:600">${title}</div>
  <div style="display:flex;align-items:center;gap:8px"><span style="display:contents">
    <div><button aria-label="Comment" style="height:22px;background:transparent;border:0;color:rgba(250,249,245,.64);font:500 12px system-ui">Comment</button></div>
    <div><button aria-label="Present" style="height:26px;padding:0 12px;border-radius:8px;background:transparent;border:1px solid transparent;color:rgba(250,249,245,.64);font:500 12px/16px system-ui">Present</button></div>
    <span style="display:flex;align-items:center;gap:6px"><div><div style="display:inline-flex"><button aria-label="Share" style="height:26px;padding:0 12px;border-radius:8px;background:#f0eee6;color:#1c1b19;border:1px solid transparent;font:500 12px system-ui">Share</button></div></div><div><button aria-label="Account menu" style="width:20px;height:20px;border-radius:50%;border:1px solid #444;background:none;color:#f0efec;font-size:11px">J</button></div></span>
  </span></div>
</header>
<div class="main"><div class="chat"><div class="you">Too busy. Strip it back: one photo of hands on clay and a single “Book a class” button.</div><div class="cl">Simplified the hero and moved classes below the fold.</div><div class="you">Better. Add a booking section with three class types and prices in rupees.</div><div class="cl">Added the booking section with a weekday and weekend toggle.</div><div class="reply">Reply to Claude…</div></div>
<div class="canvas"><div class="art"><div class="nav">Kiln &amp; Co.<span>Classes&nbsp;&nbsp;Shop&nbsp;&nbsp;Visit</span></div><div class="hero"><b>Made by hand,<br>fired slowly.</b></div><div class="cta"><i>Book a class</i><span>Mugs, plates and glazes</span></div></div></div></div>
</body></html>`;

async function launch(opts = {}) {
  const errors = [];
  let slow = 0;
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dca-profile-'));
  const ctx = await chromium.launchPersistentContext(userDir, {
    headless: false, viewport: { width: 1280, height: 800 }, acceptDownloads: true,
    args: ['--headless=new', `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  await ctx.route('https://claude.ai/**', async (route) => {
    const url = route.request().url();
    const m = url.match(/OmeletteService\/(\w+)$/);
    if (!m) {
      const id = (url.match(/\/design\/p\/([\w-]+)/) || [])[1];
      return route.fulfill({ status: 200, contentType: 'text/html', body: PAGE(id && PROJECTS[id] ? PROJECTS[id].name : 'Claude Design') });
    }
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (m[1] === 'ListProjects') return json({ items: Object.entries(PROJECTS).map(([projectId, p]) => ({ projectId, name: p.name, updatedAt: p.updatedAt, type: 'PROJECT_TYPE_PROJECT', isOwned: true, ownerUuid: 'me-0001', ownerDisplayName: 'Jesh' })) });
    if (m[1] === 'ListOrgProjects') return json({ items: Object.entries(ORG).map(([projectId, p]) => ({ projectId, name: p.name, ownerDisplayName: p.owner, updatedAt: T('09-01', 9) })) });
    const { projectId } = JSON.parse(route.request().postData());
    const p = PROJECTS[projectId] || ORG[projectId];
    if (!p) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"not found"}' });
    await new Promise((r) => setTimeout(r, slow));
    return json({ name: p.name, callerCanSeeChats: PROJECTS[projectId] ? true : p.callerCanSeeChats, ownerUuid: PROJECTS[projectId] ? 'me-0001' : 'them-0002', data: b64({ chats: p.chats, assets: p.assets || {} }) });
  });

  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  return { ctx, sw, extId, errors, setSlow: (ms) => { slow = ms; } };
}

module.exports = { launch, PROJECTS, ORG, PAGE, T };

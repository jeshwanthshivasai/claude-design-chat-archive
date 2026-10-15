// Store screenshots (1280x800) from the real extension on the fake site in test/fake-site.js.
// Run: node store/shots.js   (writes store/screenshot-*.png and docs/*.png)
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { launch } = require('../test/fake-site');
const OUT = path.join(__dirname);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dca-shots-'));

(async () => {
  const { ctx, sw, extId, setSlow } = await launch();
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('https://claude.ai/design/p/p-ceramics-0001');
  await page.waitForTimeout(1200);
  const tabs = await sw.evaluate(() => chrome.tabs.query({}));
  const tabId = tabs.find((t) => t.index === tabs.length - 1).id;
  const panel = await ctx.newPage();
  await panel.setViewportSize({ width: 380, height: 800 });
  await panel.goto(`chrome-extension://${extId}/sidepanel/index.html?tab=${tabId}`);
  await panel.waitForSelector('#go');
  const shot = async (p, name, opts = {}) => { const f = path.join(TMP, name + '.png'); await p.screenshot({ path: f, ...opts }); return f; };
  const pageA = await shot(page, 'page');
  const panelA = await shot(panel, 'panel-ready');
  setSlow(500);
  const dl = page.waitForEvent('download');
  await panel.click('#go');
  await panel.waitForSelector('.run'); await panel.waitForTimeout(900);
  const panelRun = await shot(panel, 'panel-running');
  const d = await dl; const zip = path.join(TMP, d.suggestedFilename()); await d.saveAs(zip);
  await panel.waitForSelector('.done'); await panel.waitForTimeout(700);
  await panel.evaluate(() => { const s = document.querySelector('.scroll'); s.scrollTop = 200; });
  await panel.waitForTimeout(200);
  const panelDone = await shot(panel, 'panel-done');
  // Reader and case study from the downloaded ZIP.
  const unz = path.join(TMP, 'unz'); fs.mkdirSync(unz); execFileSync('unzip', ['-q', zip, '-d', unz]);
  const root = path.join(unz, fs.readdirSync(unz)[0]);
  const reader = await ctx.newPage(); await reader.setViewportSize({ width: 1280, height: 800 });
  await reader.goto('file://' + path.join(root, 'index.html'));
  await reader.fill('#q', 'price tags'); await reader.waitForTimeout(400); await reader.click('.res'); await reader.waitForTimeout(300);
  await reader.evaluate(() => { document.getElementById('main').scrollTop = 0; });
  const readerF = await shot(reader, 'reader');
  const cs = await ctx.newPage(); await cs.setViewportSize({ width: 1280, height: 800 });
  await cs.goto('file://' + path.join(root, 'Ceramics studio site', 'case-study.html'));
  await cs.evaluate(() => window.scrollTo(0, 560)); await cs.waitForTimeout(200);
  const csF = await shot(cs, 'case-study');
  // The in-page button and its toast, at 2x.
  await panel.close();
  const p2 = await ctx.newPage({ deviceScaleFactor: 2 });
  await p2.setViewportSize({ width: 640, height: 400 });
  await p2.goto('https://claude.ai/design/p/p-ceramics-0001'); await p2.waitForTimeout(1200);
  const box = await p2.evaluate(() => { const row = document.querySelector('[aria-label="Share"]').closest('span'); const h = [...row.children].find((c) => c.tagName === 'SPAN' && !c.textContent); const r = h.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const dl2 = p2.waitForEvent('download');
  await p2.mouse.move(box.x, box.y); await p2.mouse.down(); await p2.mouse.up();
  await dl2; await p2.waitForTimeout(600);
  const toastF = await shot(p2, 'toast');
  await ctx.close();
  fs.writeFileSync(path.join(TMP, 'list.json'), JSON.stringify({ pageA, panelA, panelRun, panelDone, readerF, csF, toastF }));
  execFileSync('python3', [path.join(__dirname, 'compose.py'), path.join(TMP, 'list.json'), OUT], { stdio: 'inherit' });
})().catch((e) => { console.error(e); process.exit(1); });

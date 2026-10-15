// End-to-end check of the packaged extension in Chromium against a fake Claude Design (no real account).
// Run: node test/e2e.js [outDir]   (needs Playwright; screenshots and the downloaded ZIP go to outDir)
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { launch } = require('./fake-site');

const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'dca-e2e'));
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { ctx, sw, extId, errors, setSlow } = await launch();
  // 1. The in-page button.
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('page: ' + e.message));
  await page.goto('https://claude.ai/design/p/p-ceramics-0001');
  // The button lives in a closed shadow root: from the page it is a span with no text of its own, just before Share.
  const findSave = () => { const row = document.querySelector('[aria-label="Share"]').closest('span'); return [...row.children].find((c) => c.tagName === 'SPAN' && !c.textContent) || null; };
  await page.waitForFunction(findSave, null, { timeout: 8000 });
  const order = await page.evaluate(() => { const row = document.querySelector('[aria-label="Share"]').closest('span'); return [...row.children].map((c) => (c.tagName === 'SPAN' && !c.textContent ? 'SAVE' : (c.textContent || '').trim())); });
  console.log('toolbar order:', order.join(' | '));
  await page.screenshot({ path: path.join(OUT, '1-toolbar.png'), clip: { x: 900, y: 0, width: 380, height: 62 } });

  // 2. Side panel, opened as a tab aimed at the Claude Design tab.
  const tabs = await sw.evaluate(() => chrome.tabs.query({}));
  const tabId = tabs.find((t) => t.index === tabs.length - 1).id;
  const panel = await ctx.newPage();
  panel.on('pageerror', (e) => errors.push('panel: ' + e.message));
  panel.on('console', (m) => { if (m.type() === 'error') errors.push('panel console: ' + m.text()); });
  await panel.setViewportSize({ width: 380, height: 900 });
  await panel.goto(`chrome-extension://${extId}/sidepanel/index.html?tab=${tabId}`);
  await panel.waitForSelector('#go', { timeout: 8000 });
  await panel.screenshot({ path: path.join(OUT, '2-ready.png'), fullPage: true });
  await panel.emulateMedia({ colorScheme: 'dark' });
  await panel.screenshot({ path: path.join(OUT, '2-ready-dark.png'), fullPage: true });
  await panel.emulateMedia({ colorScheme: 'light' });
  console.log('button:', await panel.textContent('#go'));

  // 3. Archive everything, including the unshared org project.
  await panel.check('input[data-id="p-team-0004"]');
  setSlow(700);
  const dl = page.waitForEvent('download', { timeout: 20000 });
  await panel.click('#go');
  await panel.waitForSelector('.run', { timeout: 5000 });
  await panel.waitForTimeout(1100);
  await panel.screenshot({ path: path.join(OUT, '3-running.png'), fullPage: true });
  const download = await dl;
  const zipPath = path.join(OUT, download.suggestedFilename());
  await download.saveAs(zipPath);
  await panel.waitForSelector('.done', { timeout: 10000 });
  await panel.waitForTimeout(600);
  await panel.screenshot({ path: path.join(OUT, '4-done.png'), fullPage: true });
  await panel.check('#words');
  await panel.emulateMedia({ colorScheme: 'dark' });
  await panel.screenshot({ path: path.join(OUT, '4-done-dark-words.png'), fullPage: true });
  setSlow(0);

  const unz = path.join(OUT, 'unzipped'); fs.rmSync(unz, { recursive: true, force: true }); fs.mkdirSync(unz);
  execFileSync('unzip', ['-q', zipPath, '-d', unz]);
  const root = path.join(unz, fs.readdirSync(unz)[0]);
  const listing = execFileSync('find', ['.', '-type', 'f'], { cwd: root }).toString().trim().split('\n').sort();
  console.log('zip:', download.suggestedFilename(), '\n ' + listing.join('\n '));
  const all = listing.map((f) => fs.readFileSync(path.join(root, f)).toString('latin1')).join('\n');
  if (all.includes('CONFIDENTIAL')) errors.push('unshared org chat leaked into the ZIP');

  // 4. The offline reader and a case study, opened from disk.
  const reader = await ctx.newPage();
  reader.on('pageerror', (e) => errors.push('reader: ' + e.message));
  await reader.setViewportSize({ width: 1280, height: 860 });
  await reader.goto('file://' + path.join(root, 'index.html'));
  await reader.screenshot({ path: path.join(OUT, '5-reader-home.png') });
  await reader.fill('#q', 'price tags');
  await reader.waitForTimeout(400);
  const hits = await reader.$$eval('.res', (r) => r.length);
  console.log('reader search hits for "price tags":', hits);
  if (!hits) errors.push('reader search found nothing');
  await reader.click('.res');
  await reader.waitForTimeout(300);
  await reader.screenshot({ path: path.join(OUT, '6-reader-chat.png') });
  // A reply with a file tree, a pipe on its own and a deep quote must render, not freeze the page.
  const t0 = Date.now();
  await reader.click('[data-go="home"]');
  await reader.click('.card:nth-child(2)');
  const treeOk = await reader.evaluate(() => document.body.innerText.includes('|-- scan.js') && !!document.querySelector('.thread table'));
  console.log('reader renders file tree and table:', treeOk, `${Date.now() - t0} ms`);
  if (!treeOk) errors.push('reader did not render the file-tree reply');
  await reader.click('[data-go="prompts"]');
  await reader.screenshot({ path: path.join(OUT, '7-reader-prompts.png') });
  const cs = await ctx.newPage();
  await cs.setViewportSize({ width: 1000, height: 1400 });
  await cs.goto('file://' + path.join(root, 'Ceramics studio site', 'case-study.html'));
  await cs.screenshot({ path: path.join(OUT, '8-case-study.png'), fullPage: true });

  // 5. The in-page button saves one project.
  await panel.close();
  const dl2 = page.waitForEvent('download', { timeout: 15000 });
  await page.bringToFront();
  await page.evaluate(() => 0);
  const box = await page.evaluate(() => { const row = document.querySelector('[aria-label="Share"]').closest('span'); const h = [...row.children].find((c) => c.tagName === 'SPAN' && !c.textContent); const r = h.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.click(box.x, box.y);
  const d2 = await dl2;
  console.log('save button download:', d2.suggestedFilename());
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '9-toast.png') });

  await ctx.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
  process.exitCode = errors.length ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });

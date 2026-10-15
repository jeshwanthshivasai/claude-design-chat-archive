// Builds every Web Store image from the real extension running on the fake site (test/fake-site.js):
//   icons/icon{16,32,48,128}.png, store/store-icon-128x128.png, store/promo-tile-440x280.png,
//   store/marquee-1400x560.png, store/screenshot-{1..5}.png, docs/*.png
// Run: node store/make-assets.js
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { launch } = require('../test/fake-site');
const { iconSvg } = require('./assets/icon');
const { promoTile, marquee } = require('./assets/promo');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dca-assets-'));
const FONTS = path.join(ROOT, 'video', 'explainer', 'public', 'fonts');
const url = (f) => 'file://' + f;

async function renderHtml(browser, html, w, h, out, transparent = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const f = path.join(TMP, path.basename(out) + '.html'); fs.writeFileSync(f, html);
  await page.goto(url(f)); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
  await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
}

const FONT_CSS = `
@font-face{font-family:Charis;src:url(${url(path.join(FONTS, 'charis-700.woff2'))});font-weight:700}
@font-face{font-family:Isans;src:url(${url(path.join(FONTS, 'isans-500.woff2'))});font-weight:500}
@font-face{font-family:Isans;src:url(${url(path.join(FONTS, 'isans-600.woff2'))});font-weight:600}`;

// One template for all five screenshots, so they read as a set in the carousel.
function shot({ title, sub, layout, art }) {
  const top = layout === 'top';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_CSS}
  *{box-sizing:border-box}html,body{margin:0;width:1280px;height:800px;overflow:hidden}
  body{background:linear-gradient(135deg,#22305E 0%,#161E38 55%,#10162B 100%);position:relative;font-family:Isans,system-ui,sans-serif}
  .rule{position:absolute;inset:0;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 39px,rgba(42,54,100,.55) 39px,rgba(42,54,100,.55) 40px)}
  .margin{position:absolute;top:0;bottom:0;left:40px;width:2px;background:#4A2F3F}
  .brand{position:absolute;right:56px;top:40px;display:flex;align-items:center;gap:10px;color:#AEB5CC;font-weight:600;font-size:18px}
  .head{position:absolute;left:84px;${top ? 'top:58px;right:84px' : 'top:0;bottom:0;width:430px;display:flex;flex-direction:column;justify-content:center'}}
  h1{margin:0;font-family:Charis,Georgia,serif;font-weight:700;color:#FBF6E9;font-size:${top ? 52 : 58}px;line-height:1.05;letter-spacing:-.01em;text-wrap:balance;${top ? 'max-width:860px' : ''}}
  p{margin:16px 0 0;color:#C3C8DA;font-size:23px;line-height:1.4;font-weight:500;max-width:${top ? 900 : 400}px}
  .art{position:absolute}
  .frame{border-radius:14px;overflow:hidden;box-shadow:0 40px 80px rgba(3,6,18,.55),0 0 0 1px rgba(255,255,255,.07)}
  .frame img{display:block;width:100%}
  </style></head><body><div class="rule"></div><div class="margin"></div>
  <div class="brand">${iconSvg(30, 0)}Design Chat Archive</div>
  <div class="head"><h1>${title}</h1><p>${sub}</p></div>
  ${art}</body></html>`;
}

// A plain browser window around a captured page, with the side panel docked on the right.
function browserFrame(pageImg, panelImg, w, scale) {
  return `<div class="frame" style="width:${w}px;background:#202124">
    <div style="height:40px;display:flex;align-items:center;gap:9px;padding:0 14px;background:#2B2C30">
      <i style="width:11px;height:11px;border-radius:50%;background:#FF5F57"></i><i style="width:11px;height:11px;border-radius:50%;background:#FEBC2E"></i><i style="width:11px;height:11px;border-radius:50%;background:#28C840"></i>
      <span style="margin-left:12px;flex:1;height:26px;border-radius:13px;background:#1D1E21;color:#C8CBD2;font-size:13px;display:flex;align-items:center;padding:0 12px">claude.ai/design/p/ceramics-studio</span>
      <span style="width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:rgba(234,217,174,.16);box-shadow:0 0 0 2px rgba(234,217,174,.45)">${iconSvg(20, 0)}</span>
    </div>
    <div style="display:flex"><img src="${url(pageImg)}" style="width:${1000 * scale}px;display:block"><div style="width:1px;background:#3C3C3C"></div><img src="${url(panelImg)}" style="width:${380 * scale}px;display:block"></div>
  </div>`;
}

(async () => {
  const browser = await chromium.launch();

  // ---- icons
  for (const [size, pad, out] of [[16, 0, 'icons/icon16.png'], [32, 1, 'icons/icon32.png'], [48, 2, 'icons/icon48.png'], [128, 16, 'icons/icon128.png']]) {
    await renderHtml(browser, `<html><body style="margin:0;background:transparent">${iconSvg(size, pad)}</body></html>`, size, size, path.join(ROOT, out), true);
  }
  fs.copyFileSync(path.join(ROOT, 'icons/icon128.png'), path.join(__dirname, 'store-icon-128x128.png'));

  // ---- promo art (no text)
  await renderHtml(browser, `<html><body style="margin:0">${promoTile()}</body></html>`, 440, 280, path.join(__dirname, 'promo-tile-440x280.png'));
  await renderHtml(browser, `<html><body style="margin:0">${marquee()}</body></html>`, 1400, 560, path.join(__dirname, 'marquee-1400x560.png'));

  // ---- captures from the real extension, at 2x so they stay sharp when placed
  const { ctx, sw, extId, setSlow } = await launch({ scale: 2 });
  const cap = (n) => path.join(TMP, n + '.png');
  const page = await ctx.newPage(); await page.setViewportSize({ width: 1000, height: 640 });
  await page.goto('https://claude.ai/design/p/p-ceramics-0001'); await page.waitForTimeout(1200);
  await page.screenshot({ path: cap('page') });
  const tabs = await sw.evaluate(() => chrome.tabs.query({}));
  const tabId = tabs.find((t) => t.index === tabs.length - 1).id;
  const panel = await ctx.newPage(); await panel.setViewportSize({ width: 380, height: 640 });
  await panel.goto(`chrome-extension://${extId}/sidepanel/index.html?tab=${tabId}`); await panel.waitForSelector('#go');
  await panel.screenshot({ path: cap('panel-ready') });
  setSlow(400);
  const dl = page.waitForEvent('download');
  await panel.click('#go'); await panel.waitForSelector('.run'); await panel.waitForTimeout(1300);
  await panel.screenshot({ path: cap('panel-running') });
  const d = await dl; const zip = path.join(TMP, 'archive.zip'); await d.saveAs(zip);
  await panel.waitForSelector('.done'); await panel.waitForTimeout(800);
  await panel.screenshot({ path: cap('panel-done') });
  const unz = path.join(TMP, 'unz'); fs.mkdirSync(unz); execFileSync('unzip', ['-q', zip, '-d', unz]);
  const root = path.join(unz, fs.readdirSync(unz)[0]);
  fs.copyFileSync(path.join(root, 'wrapped.png'), cap('wrapped'));

  const reader = await ctx.newPage(); await reader.setViewportSize({ width: 1060, height: 640 });
  await reader.goto(url(path.join(root, 'index.html')));
  await reader.fill('#q', 'price tags'); await reader.waitForTimeout(400);
  await reader.screenshot({ path: cap('reader-search') });
  await reader.click('.res'); await reader.waitForTimeout(400); // the hit is scrolled into view and outlined
  await reader.screenshot({ path: cap('reader-chat') });

  const cs = await ctx.newPage(); await cs.setViewportSize({ width: 820, height: 1240 });
  await cs.goto(url(path.join(root, 'Ceramics studio site', 'case-study.html')));
  await cs.evaluate(() => window.scrollTo(0, 0)); await cs.waitForTimeout(200);
  await cs.screenshot({ path: cap('case-study') });

  await panel.close();
  const tb = await ctx.newPage(); await tb.setViewportSize({ width: 720, height: 420 });
  await tb.goto('https://claude.ai/design/p/p-ceramics-0001'); await tb.waitForTimeout(1200);
  const btn = await tb.evaluate(() => { const row = document.querySelector('[aria-label="Share"]').closest('span'); const h = [...row.children].find((c) => c.tagName === 'SPAN' && !c.textContent); const r = h.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const dl2 = tb.waitForEvent('download');
  await tb.mouse.click(btn.x + btn.w / 2, btn.y + btn.h / 2); await dl2; await tb.mouse.move(btn.x + btn.w / 2 + 3, btn.y + btn.h + 40); await tb.waitForTimeout(700);
  await tb.screenshot({ path: cap('toast') });
  await ctx.close();

  // ---- the five screenshots
  const S = (n) => path.join(__dirname, `screenshot-${n}.png`);
  await renderHtml(browser, shot({ layout: 'top', title: 'Save every Claude Design chat before 14&nbsp;Dec',
    sub: 'Open the side panel, pick your projects, get one ZIP. Nothing leaves your browser.',
    art: `<div class="art" style="left:84px;top:236px">${browserFrame(cap('page'), cap('panel-ready'), 1112, 0.8)}</div>` }), 1280, 800, S(1));
  await renderHtml(browser, shot({ layout: 'left', title: 'Every project, drafted as a case study',
    sub: 'The brief, Claude’s questions and your answers, each change of direction, and what shipped.',
    art: `<div class="art frame" style="left:560px;top:86px;width:640px;transform:rotate(-1.6deg)"><img src="${url(cap('case-study'))}"></div>` }), 1280, 800, S(2));
  await renderHtml(browser, shot({ layout: 'top', title: 'Search every chat, even offline',
    sub: 'One page holds every project and every message. No internet needed.',
    art: `<div class="art frame" style="left:84px;top:236px;width:1112px"><img src="${url(cap('reader-chat'))}"></div>` }), 1280, 800, S(3));
  const tbScale = 760 / 720;
  await renderHtml(browser, shot({ layout: 'left', title: 'Or save one project from its toolbar',
    sub: 'Save chats sits right next to Share. One click: the chats, a case study and a reader.',
    art: `<div class="art frame" style="left:486px;top:176px;width:760px;position:absolute"><img src="${url(cap('toast'))}">
      <div style="position:absolute;left:${(btn.x - 6) * tbScale}px;top:${(btn.y - 6) * tbScale}px;width:${(btn.w + 12) * tbScale}px;height:${(btn.h + 12) * tbScale}px;border:3px solid #EAD9AE;border-radius:12px;box-shadow:0 0 0 6px rgba(234,217,174,.25)"></div></div>` }), 1280, 800, S(4));
  const sample = { projects: 9, chats: 31, messages: 2860, yours: 1214, answered: 186, turns: 47, files: 312, longestChat: 388,
    first: Date.UTC(2026, 4, 2), last: Date.UTC(2026, 9, 12), busiestDay: '2026-09-02', busiestCount: 64, peakHour: 23, topWords: ['spacing', 'warmer', 'hero', 'grid', 'serif'] };
  const cardPage = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:Charter;src:url(${url(path.join(FONTS, 'charis-700.woff2'))});font-weight:700}
    @font-face{font-family:Charter;src:url(${url(path.join(FONTS, 'charis-400i.woff2'))});font-weight:400;font-style:italic}
    body{margin:0}</style></head><body><canvas id="c"></canvas>
    <script charset="utf-8" src="${url(path.join(ROOT, 'src', 'wrapped.js'))}"></script></body></html>`;
  const cp = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  fs.writeFileSync(path.join(TMP, 'card.html'), cardPage);
  await cp.goto(url(path.join(TMP, 'card.html'))); await cp.evaluate(() => document.fonts.load('700 40px Charter'));
  await cp.evaluate((st) => DCE.drawWrapped(document.getElementById('c'), st, { words: true }), sample);
  await cp.waitForTimeout(100); await cp.locator('#c').screenshot({ path: cap('card-sample') }); await cp.close();
  await renderHtml(browser, shot({ layout: 'left', title: 'Your Claude Design, in numbers',
    sub: 'A card to share when the site closes. It never shows a project name, and your words stay off unless you turn them on.',
    art: `<div class="art" style="left:640px;top:70px;width:500px;transform:rotate(2.5deg);border-radius:22px;overflow:hidden;box-shadow:0 50px 90px rgba(3,6,18,.6),0 0 0 1px rgba(255,255,255,.06)"><img src="${url(cap('card-sample'))}" style="width:100%;display:block"></div>` }), 1280, 800, S(5));

  // ---- README images
  const docs = path.join(ROOT, 'docs');
  for (const [src, dst] of [['panel-ready', 'panel.png'], ['panel-running', 'exporting.png'], ['panel-done', 'done.png'], ['reader-chat', 'reader.png'], ['case-study', 'case-study.png']]) fs.copyFileSync(cap(src), path.join(docs, dst));
  await browser.close();
  console.log('assets written; captures in', TMP);
})().catch((e) => { console.error(e); process.exit(1); });

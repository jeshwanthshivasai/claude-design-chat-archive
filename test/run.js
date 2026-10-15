// Regression tests. Run with: node test/run.js
// Loads the extension's scripts in a sandbox with a fake fetch; no network, no browser.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const delays = [];
const ctx = {
  TextEncoder, TextDecoder, atob, btoa, console, Intl, Date, JSON, Math, DOMException, AbortController,
  setTimeout: (fn, ms) => { delays.push(ms); return setTimeout(fn, Math.min(ms, 5)); },
  clearTimeout,
};
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['zip', 'render', 'exporter', 'insights', 'casestudy', 'viewer', 'pipeline']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', `${f}.js`), 'utf8'), ctx, { filename: `${f}.js` });
}
const D = ctx.DCE;

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
const ok = (json, headers = {}) => ({
  ok: true, status: 200, redirected: false,
  headers: { get: (k) => ({ 'content-type': 'application/json', ...headers })[k.toLowerCase()] ?? null },
  json: async () => json,
});
const fail = (status, message, headers = {}) => ({
  ok: false, status, statusText: `HTTP ${status}`, redirected: false,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => ({ message }),
});

// A fake server: projects keyed by id.
function server(projects, opts = {}) {
  const calls = [];
  return {
    calls,
    fetch: async (url, init) => {
      const method = url.split('/').pop();
      calls.push(method);
      if (opts.hook) { const r = opts.hook(method, init); if (r) return r; }
      if (method === 'ListProjects') return ok({ items: Object.values(projects).map((p) => ({ isOwned: true, ...p.meta })) });
      if (method === 'ListOrgProjects') return fail(400, 'validation error');
      const { projectId } = JSON.parse(init.body);
      const p = projects[projectId];
      if (!p) return fail(404, 'not found');
      return ok(p.get);
    },
  };
}

const chat = (title, msgs, extra = {}) => ({ id: title, title, created: '2026-05-04T13:05:15Z', messages: msgs, ...extra });
const msg = (role, content, extra = {}) => ({ role, content, timestamp: '2026-05-04T13:05:15Z', ...extra });

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.log(`FAIL ${name}\n     ${e.stack.split('\n').slice(0, 3).join('\n     ')}`); process.exitCode = 1; }
}

(async () => {
  await test('untitled project (no name field) exports instead of crashing the whole run', async () => {
    const s = server({
      a: { meta: { projectId: 'a', type: 'PROJECT_TYPE_PROJECT' }, get: { data: b64({ chats: { c: chat('Hi', [msg('user', 'hello')]) } }) } },
      b: { meta: { projectId: 'b' }, get: null }, // 404 path with no name either
    });
    const ps = await D.listProjects({ fetchImpl: s.fetch });
    assert.strictEqual(ps[0].name, 'Untitled');
    const r = await D.exportProjects(ps, { fetchImpl: s.fetch, delayMs: 0 });
    const paths = r.files.map((f) => f.path);
    assert(paths.some((p) => p.endsWith('/README.md')), 'archive README written');
    assert(paths.some((p) => /\/Untitled\/01 Hi \(2026-05-04\)\.md$/.test(p)), paths.join('\n'));
    assert(paths.some((p) => /\/Untitled \(2\)\/_error\.txt$/.test(p)), 'second untitled project gets its own folder');
  });

  await test('a message shape the renderer cannot handle fails only that project and keeps its raw data', async () => {
    const s = server({
      bad: { meta: { projectId: 'bad', name: 'Odd' }, get: { data: b64({ chats: { c: { title: 'x', messages: 5 } } }) } },
      good: { meta: { projectId: 'good', name: 'Fine' }, get: { data: b64({ chats: { c: chat('Hi', [msg('user', 'hello')]) } }) } },
    });
    const ps = await D.listProjects({ fetchImpl: s.fetch });
    const r = await D.exportProjects(ps, { fetchImpl: s.fetch, delayMs: 0, includeRaw: false });
    assert.strictEqual(r.summary.failed, 1);
    const paths = r.files.map((f) => f.path);
    assert(paths.some((p) => p.endsWith('/Odd/_raw/project-data.json')), 'raw data kept for the failed project');
    assert(paths.some((p) => p.endsWith('/Odd/_error.txt')));
    assert(paths.some((p) => /\/Fine\/01 Hi/.test(p)), 'the other project still exported');
  });

  await test('array message content and numeric titles render instead of throwing', async () => {
    const md = D.renderChat({ name: 'P' }, chat(42, [msg('user', [{ type: 'text', text: 'first' }, { type: 'text', text: 'second' }]), msg('assistant', { text: 'reply' })]), 1, { includeSteps: true, chatCount: 1 });
    assert(md.startsWith('# 42\n'));
    assert(md.includes('first\nsecond'));
    assert(md.includes('reply'));
  });

  await test('Retry-After is capped at 30 s', async () => {
    delays.length = 0;
    let n = 0;
    const f = async () => (n++ === 0 ? fail(429, 'slow down', { 'retry-after': '86400' }) : ok({ items: [] }));
    await D.rpc('ListProjects', {}, { fetchImpl: f });
    assert.deepStrictEqual(delays.filter((d) => d > 5), [30000]);
  });

  await test('Stop interrupts a retry wait immediately and never marks the project failed', async () => {
    const controller = new AbortController();
    const f = async () => fail(503, 'down', { 'retry-after': '3600' });
    const started = Date.now();
    const p = D.rpc('GetProject', { projectId: 'x' }, { fetchImpl: f, signal: controller.signal, retries: 4 });
    setTimeout(() => controller.abort(), 20);
    await assert.rejects(p, (e) => e.name === 'AbortError');
    assert(Date.now() - started < 1000, 'did not wait for the retry delay');

    const s = server({ a: { meta: { projectId: 'a', name: 'A' }, get: { data: b64({ chats: {} }) } } }, {
      hook: (m) => (m === 'GetProject' ? fail(503, 'down', { 'retry-after': '3600' }) : null),
    });
    const c2 = new AbortController();
    const run = D.exportProjects(await D.listProjects({ fetchImpl: s.fetch }), { fetchImpl: s.fetch, signal: c2.signal, delayMs: 0 });
    setTimeout(() => c2.abort(), 20);
    const r = await run;
    assert.strictEqual(r.summary.stopped, true);
    assert.strictEqual(r.summary.failed, 0, 'an aborted project is not reported as failed');
  });

  await test('chats are never exported from a project whose owner has not shared them', async () => {
    const s = server({
      org: { meta: { projectId: 'org', name: 'Theirs' }, get: { callerCanSeeChats: false, data: b64({ chats: { c: chat('Secret', [msg('user', 'confidential')]) } }) } },
    });
    const r = await D.exportProjects(await D.listProjects({ fetchImpl: s.fetch }), { fetchImpl: s.fetch, delayMs: 0, includeRaw: true });
    const text = r.files.map((f) => f.path + '\n' + f.data).join('\n');
    assert(!text.includes('confidential'), 'chat text leaked');
    assert(!r.files.some((f) => f.path.includes('_raw/')), 'raw data leaked');
    assert.strictEqual(r.summary.projects[0].note, 'Owner has not shared chats with you');
  });

  await test('a shared project whose sharing flag is simply missing exports nothing either (fail closed)', async () => {
    // Protobuf-style JSON leaves out false booleans, so "not shared" usually arrives as no field at all.
    const s = server({
      org: { meta: { projectId: 'org', name: 'Theirs' }, get: { data: b64({ chats: { c: chat('Secret', [msg('user', 'confidential')]) } }) } },
      mine: { meta: { projectId: 'mine', name: 'Mine' }, get: { data: b64({ chats: { c: chat('Open', [msg('user', 'my own words')]) } }) } },
    });
    const ps = await D.listProjects({ fetchImpl: s.fetch });
    ps.find((p) => p.projectId === 'org').source = 'org'; // as ListOrgProjects would have marked it
    const r = await D.exportProjects(ps, { fetchImpl: s.fetch, delayMs: 0, includeRaw: true });
    const text = r.files.map((f) => f.path + '\n' + f.data).join('\n');
    assert(!text.includes('confidential'), 'shared chat text leaked');
    assert(!r.files.some((f) => f.path.includes('/Theirs/_raw/')), 'shared raw data leaked');
    assert.strictEqual(r.summary.projects.find((p) => p.name === 'Theirs').note, 'Sharing status not reported; chats not exported');
    assert(text.includes('my own words'), 'own project with no flag still exports');
    assert(r.files.some((f) => f.path.includes('/Mine/_raw/')), 'own raw data still written');
  });

  await test('the render-failure fallback never writes raw data for an unshared project', async () => {
    const s = server({
      org: { meta: { projectId: 'org', name: 'Theirs' }, get: { callerCanSeeChats: false, data: b64({ chats: { c: { title: 'x', messages: 5 } } }) } },
    });
    const ps = await D.listProjects({ fetchImpl: s.fetch });
    ps[0].source = 'org';
    // Force a render failure after the gate: break the index renderer for this call only.
    const orig = D.renderProjectIndex;
    D.renderProjectIndex = () => { throw new Error('boom'); };
    try {
      const r = await D.exportProjects(ps, { fetchImpl: s.fetch, delayMs: 0, includeRaw: true });
      assert.strictEqual(r.summary.failed, 1);
      assert(!r.files.some((f) => f.path.includes('_raw/')), 'raw data written despite no sharing');
      assert(!r.files.map((f) => f.data).join('').includes('saved in _raw'), 'error text must not promise raw data that was withheld');
    } finally { D.renderProjectIndex = orig; }
  });

  await test('a bad date can no longer put ../ into a file name', async () => {
    const s = server({ a: { meta: { projectId: 'a', name: 'T' }, get: { data: b64({ chats: { c: chat('T', [msg('user', 'x', { timestamp: '../../../tmp/pwned' })], { created: '../../../../tmp/pwned' }) } }) } } });
    const r = await D.exportProjects(await D.listProjects({ fetchImpl: s.fetch }), { fetchImpl: s.fetch, delayMs: 0 });
    for (const f of r.files) {
      assert(!f.path.includes('..'), f.path);
      assert(!f.path.startsWith('/'), f.path);
    }
    assert(r.files.some((f) => f.path.endsWith('/01 T (undated).md')));
  });

  await test('file names are safe on Windows and macOS', () => {
    assert.strictEqual(D.sanitizeName('CON'), '_CON');
    assert.strictEqual(D.sanitizeName('COM\u00b9'), '_COM\u00b9', 'superscript digits are reserved too');
    assert.strictEqual(D.sanitizeName('aux.design'), '_aux.design');
    assert.strictEqual(D.sanitizeName('a/b\\c:d*e?f"g<h>i|j'), 'a-b-cdefghij');
    assert.strictEqual(D.sanitizeName('..'), 'Untitled');
    assert.strictEqual(D.sanitizeName(' .hidden. '), 'hidden');
    assert.strictEqual(D.sanitizeName('evil\u202etxt.exe'), 'evil txt.exe', 'bidi override removed');
    assert.strictEqual(D.sanitizeName('\u200bzero width'), 'zero width');
    const emoji = D.sanitizeName('😀'.repeat(10), 5);
    assert.strictEqual(Array.from(emoji).length, 5);
    assert(!emoji.includes('\ufffd'), 'no half emoji');
    const used = new Set();
    assert.strictEqual(D.uniqueName('café', used), 'café');
    assert.strictEqual(D.uniqueName('cafe\u0301', used), 'cafe\u0301 (2)', 'NFC and NFD collide');
    assert.strictEqual(D.uniqueName('CAFÉ', used), 'CAFÉ (3)');
    const files = new Set();
    assert.strictEqual(D.uniqueName('01 A', files, '.md'), '01 A.md');
    assert.strictEqual(D.uniqueName('01 A', files, '.md'), '01 A (2).md', 'suffix goes before the extension');
  });

  await test('a project called README.md does not collide with the archive README', async () => {
    const s = server({ a: { meta: { projectId: 'a', name: 'README.md' }, get: { data: b64({ chats: {} }) } } });
    const r = await D.exportProjects(await D.listProjects({ fetchImpl: s.fetch }), { fetchImpl: s.fetch, delayMs: 0 });
    assert(r.files.some((f) => f.path.endsWith('/README.md (2)/_index.md')), r.files.map((f) => f.path).join('\n'));
  });

  await test('the ZIP writer refuses silently-wrapping sizes', () => {
    const many = Array.from({ length: 65536 }, (_, i) => ({ path: `f${i}`, data: '' }));
    assert.throws(() => D.makeZip(many), /Too many files/);
    const few = [{ path: 'a.txt', data: 'hello' }, { path: 'dir/b.txt', data: new Uint8Array([1, 2, 3]) }];
    const chunks = D.makeZip(few);
    assert.strictEqual(few[0].data, null, 'source strings are released after encoding');
    const total = chunks.reduce((s, c) => s + c.length, 0);
    // 2 local headers (30) + 2 central headers (46) + EOCD (22) + names twice (5 + 9) * 2 + data (5 + 3)
    assert.strictEqual(total, 60 + 92 + 22 + 28 + 8);
  });

  await test('an expired session (HTML with status 200) gives a sign-in hint, not a JSON parse error', async () => {
    const f = async () => ({ ok: true, status: 200, redirected: true, headers: { get: (k) => (k === 'content-type' ? 'text/html' : null) }, json: async () => { throw new SyntaxError('Unexpected token <'); } });
    await assert.rejects(D.rpc('ListProjects', {}, { fetchImpl: f }), /session may have expired/);
  });

  await test('Markdown tables and links survive | and ] in names', () => {
    const idx = D.renderProjectIndex({ name: 'A | B' }, [{ idx: 1, title: 'Bad ] | title', file: '01 x.md', stats: { total: 1, first: null, last: null } }]);
    assert(idx.includes('[Bad \\] \\| title](<01 x.md>)'), idx);
    const readme = D.renderReadme({ exportedAt: '2026-10-13T00:00:00Z', includeRaw: false, projects: [{ name: 'A | B', folder: 'A B', chats: 0, messages: 0, note: 'x | y' }], totalChats: 0, totalMessages: 0 });
    assert(readme.includes('[A \\| B](<A B/_index.md>) | 0 | 0 | x \\| y |'), readme);
    const md = D.renderChat({ name: 'P | Q' }, chat('Multi\nline # title', [msg('user', 'x')]), 1, { includeSteps: true, chatCount: 1 });
    assert(md.startsWith('# Multi line # title\n'));
    assert(md.includes('| Project | P \\| Q |'));
  });

  await test('shared chats name each author; solo chats say You', () => {
    const solo = D.renderChat({ name: 'P' }, chat('S', [msg('user', 'a', { authorName: 'Me' }), msg('user', 'b', { authorName: 'Me' })]), 1, { includeSteps: true, chatCount: 1 });
    assert(solo.includes('### You ·') && !solo.includes('### Me ·'));
    const shared = D.renderChat({ name: 'P' }, chat('S', [msg('user', 'a', { authorName: 'Me' }), msg('user', 'b', { authorName: 'Priya' }), msg('user', 'c')]), 1, { includeSteps: true, chatCount: 1 });
    assert(shared.includes('### Me ·') && shared.includes('### Priya ·') && shared.includes('### Someone ·'));
    const odd = D.renderChat({ name: 'P' }, chat('S', [msg('user', 'a', { authorName: {} }), msg('user', 'b', { authorName: 'Me' })]), 1, { includeSteps: true, chatCount: 1 });
    assert(!odd.includes('### Someone ·') && odd.includes('### You ·'), 'a non-string author name does not flip the chat into multi-author mode');
    const untitled = D.renderChat({ name: 'P' }, chat('Untitled', [msg('user', 'a')]), 3, { includeSteps: true, chatCount: 3 });
    assert(untitled.startsWith('# Untitled\n'), 'a chat really called Untitled keeps its name');
  });

  await test('transcripts state a UTC offset, not a time zone name', () => {
    const md = D.renderChat({ name: 'P' }, chat('S', [msg('user', 'a')]), 1, { includeSteps: true, chatCount: 1 });
    assert(/\| Times shown in \| local time \(UTC[+-]\d\d:\d\d\) \|/.test(md), md.split('\n')[9]);
    assert(!/Asia|Europe|America|Africa|Australia/.test(md));
  });

  await test('thinking blocks stay out of the Markdown', () => {
    const md = D.renderChat({ name: 'P' }, chat('S', [msg('assistant', 'done', { contentBlocks: [{ type: 'thinking', text: 'SECRET' }, { type: 'text', text: 'done' }] })]), 1, { includeSteps: true, chatCount: 1 });
    assert(!md.includes('SECRET'));
  });

  await test('project data arriving as plain JSON (not base64) still decodes', () => {
    assert.deepStrictEqual(D.decodeData(JSON.stringify({ a: 1 })), { a: 1 });
    assert.deepStrictEqual(D.decodeData(b64({ a: 2 })), { a: 2 });
    assert.strictEqual(Object.keys(D.decodeData('')).length, 0);
  });


  // ---------------------------------------------------------------- 2.0: insights, case study, reader, pipeline
  const T = (h, m = 0) => `2026-05-04T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;
  const steeredChat = () => chat('Landing page', [
    msg('user', 'Design a landing page for a ceramics studio. Warm, tactile, no stock photos.', { timestamp: T(9) }),
    msg('assistant', 'A few questions first.', { timestamp: T(9, 1), questionRecord: { event: 'asked', questionId: 'q1', spec: { title: 'Direction', questions: [{ id: 'tone', title: 'Tone' }, { id: 'pages', title: 'Pages' }] } } }),
    msg('user', '', { timestamp: T(9, 2), questionReceipt: { questionId: 'q1', payload: { tone: { choice: 'Earthy' }, pages: { text: 'Home and shop' } } } }),
    msg('assistant', 'Here is a first pass.', { timestamp: T(9, 5), turnChanges: { created: ['index.html', 'styles.css'] } }),
    msg('user', 'Too busy. Strip it back and make the hero one big photo of hands on clay.', { timestamp: T(10) }),
    msg('assistant', 'Simplified.', { timestamp: T(10, 4), turnChanges: { edited: ['index.html'] } }),
    msg('user', 'Lovely. Now add a booking section with three class types and prices.', { timestamp: T(11) }),
    msg('assistant', 'Added.', { timestamp: T(11, 3), turnChanges: { created: ['booking.html'] } }),
  ]);

  await test('insights find the brief, the answered questions, the change of direction and the prompts that worked', () => {
    const a = D.analyzeProject({ name: 'Clay' }, [steeredChat()], { assets: { 'index.html': { versions: [{ createdAt: T(9, 5), subtitle: 'v1' }, { createdAt: T(10, 4), subtitle: 'Simpler hero' }] } } }, { owned: true });
    assert(a.brief.startsWith('Design a landing page'));
    assert.strictEqual(a.stats.answered, 2);
    assert.strictEqual(a.stats.turns, 1);
    const q = a.events.find((e) => e.kind === 'question');
    assert.strictEqual(q.answers.map((x) => x.q + '=' + x.a).join('|'), 'Tone=Earthy|Pages=Home and shop');
    assert(a.events.some((e) => e.kind === 'turn' && /Too busy/.test(e.text)));
    const booking = a.prompts.find((p) => /booking/.test(p.text));
    assert(booking && booking.kept, 'a prompt followed by new files and no change of direction is kept');
    const busy = a.prompts.find((p) => /Too busy/.test(p.text));
    assert(busy && busy.kept, 'the redirect itself led to edits that stuck');
    assert.strictEqual(a.stats.filesCreated, 3);
    assert.strictEqual(a.assets[0].versions, 2);
    const w = D.wrappedStats([a]);
    assert.strictEqual(w.yours, 3); assert.strictEqual(w.turns, 1); assert.strictEqual(w.projects, 1);
  });

  const hostile = '</script><script>alert(1)</script><img src=x onerror=alert(2)>';
  await test('the case study escapes everything that came from a chat', () => {
    const c = chat(hostile, [msg('user', `Brief ${hostile}`, { timestamp: T(9) }), msg('assistant', 'ok', { timestamp: T(9, 1), turnChanges: { created: [hostile] } }),
      msg('user', `Instead try ${hostile} with more contrast please`, { timestamp: T(10) })]);
    const html = D.caseStudyHtml(D.analyzeProject({ name: hostile }, [c], { assets: { [hostile]: { versions: [{ subtitle: hostile }] } } }));
    assert(!/<script>|<img |onerror=alert\(2\)>/i.test(html.replace(/<style>[\s\S]*?<\/style>/, '')), 'raw markup leaked into the case study');
    assert(html.includes('&lt;/script&gt;'));
    assert(!/<script/i.test(html), 'the case study runs no script');
  });

  await test('the offline reader keeps chat text inert inside its data block and round-trips it exactly', () => {
    const data = { exportedAt: T(12), projects: [{ n: hostile, f: 'x', cs: true, st: { chats: 1, messages: 1, yours: 1, answered: 0, turns: 0 }, chats: [{ ti: hostile, fi: 'a.md', m: [{ k: 'you', w: 'You', t: T(9), b: `${hostile} line\u2028sep\u2029end <!-- c -->` }] }] }], prompts: [], hasWrappedPng: false };
    const html = D.viewerHtml(data);
    const block = html.match(/<script type="application\/json" id="archive-data">([\s\S]*?)<\/script>/);
    assert(block, 'data block found and ends at its own closing tag');
    assert(!/<\/script|<!--|<script/i.test(block[1]), 'nothing in the data can close or open a tag');
    assert(!/[\u2028\u2029]/.test(block[1]));
    assert.strictEqual(JSON.stringify(JSON.parse(block[1])), JSON.stringify(data));
    assert.strictEqual((html.match(/<script/g) || []).length, 2, 'only the data block and the reader script');
  });

  await test('prompts.md cannot be broken out of its code fences', () => {
    const a = D.analyzeProject({ name: 'P' }, [chat('C', [msg('user', 'first message is the brief, long enough', { timestamp: T(9) }), msg('user', 'Use ```html fences``` and then # a heading in the prompt text', { timestamp: T(10) })])], {}, { owned: true });
    const md = D.promptsMarkdown([a]);
    const fences = md.match(/^```/gm) || [];
    assert.strictEqual(fences.length % 2, 0);
    assert(!/```html fences```/.test(md));
  });

  await test('a full run adds the reader, case studies and prompt library, and the README lists only what is there', async () => {
    const s = server({
      p1: { meta: { projectId: 'p1', name: 'Clay' }, get: { data: b64({ chats: { c: steeredChat() }, assets: {} }) } },
      p2: { meta: { projectId: 'p2', name: 'index.html' }, get: { data: b64({ chats: { c: chat('Hi', [msg('user', 'hello there, a small brief')]) } }) } },
    });
    const ps = await D.listProjects({ fetchImpl: s.fetch });
    const r = await D.runExport(ps, { fetchImpl: s.fetch, delayMs: 0, download: false, makePng: false });
    const names = [];
    // makeZip nulls the data it packs; read the paths back from the archive's central directory.
    const buf = Buffer.concat(r.chunks.map((c) => Buffer.from(c)));
    for (let i = 0; i < buf.length - 4; i++) if (buf.readUInt32LE(i) === 0x02014b50) { const n = buf.readUInt16LE(i + 28); names.push(buf.slice(i + 46, i + 46 + n).toString('utf8')); }
    const root = r.rootDir;
    for (const f of ['README.md', 'index.html', 'prompts.md', 'Clay/case-study.html']) assert(names.includes(`${root}/${f}`), `${f} missing:\n${names.join('\n')}`);
    assert(!names.includes(`${root}/wrapped.png`), 'no card when it was not drawn');
    assert(names.some((n) => n.startsWith(`${root}/index.html (2)/`)), 'a project called index.html gets its own folder name');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(r.extras)), { viewer: true, caseStudy: true, prompts: true, wrapped: false });
    const readme = D.renderReadme(r.summary);
    assert(readme.includes('index.html') && readme.includes('prompts.md') && readme.includes('case-study.html'));
    assert(!readme.includes('wrapped.png'), 'README does not promise a card that is not there');
    assert(r.stats && r.stats.projects === 2);
  });

  await test('extras can be switched off, and a one-project save with no readable chats downloads nothing', async () => {
    const s = server({ p1: { meta: { projectId: 'p1', name: 'Clay' }, get: { data: b64({ chats: { c: steeredChat() } }) } } });
    const r = await D.runExport(await D.listProjects({ fetchImpl: s.fetch }), { fetchImpl: s.fetch, delayMs: 0, download: false, makePng: false, extras: { viewer: false, caseStudy: false, prompts: false, wrapped: false } });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(r.extras)), { viewer: false, caseStudy: false, prompts: false, wrapped: false });
    const s2 = server({ org: { meta: { projectId: 'org', name: 'Theirs' }, get: { callerCanSeeChats: false, data: b64({ chats: { c: chat('Secret', [msg('user', 'confidential')]) } }) } } });
    const r2 = await D.runExport(await D.listProjects({ fetchImpl: s2.fetch }), { fetchImpl: s2.fetch, delayMs: 0, download: false, makePng: false, requireChats: true });
    assert.strictEqual(r2.empty, true);
    assert(!r2.chunks, 'nothing was packed');
  });

  await test('only one export runs at a time', async () => {
    const s = server({ p1: { meta: { projectId: 'p1', name: 'A' }, get: { data: b64({ chats: {} }) } } }, { hook: (m) => (m === 'GetProject' ? new Promise((res) => setTimeout(() => res(ok({ data: b64({ chats: {} }) })), 30)) : null) });
    const ps = await D.listProjects({ fetchImpl: s.fetch });
    const first = D.runExport(ps, { fetchImpl: s.fetch, delayMs: 0, download: false, makePng: false });
    await assert.rejects(D.runExport(ps, { fetchImpl: s.fetch, delayMs: 0, download: false, makePng: false }), /already running/);
    await first;
    assert.strictEqual(D.isBusy(), false);
  });


  await test('in a shared chat only your own messages count as yours, and a teammate brief is credited to them', () => {
    const me = 'uuid-me', them = 'uuid-them';
    const c = chat('Team', [
      msg('user', 'Teammate writes the brief: a dashboard for the clinic, calm colours.', { timestamp: T(9), authorAccountUuid: them, authorName: 'Priya' }),
      msg('user', 'Instead of tabs, use a single scrolling page with anchors please.', { timestamp: T(10), authorAccountUuid: me, authorName: 'Jesh' }),
      msg('assistant', 'Done.', { timestamp: T(10, 2), turnChanges: { edited: ['a.html'] } }),
      msg('user', 'Rather than blue, try green for the header and buttons everywhere.', { timestamp: T(11), authorAccountUuid: them, authorName: 'Priya' }),
    ]);
    const a = D.analyzeProject({ name: 'Clinic' }, [c], {}, { owned: false, myUuid: me });
    assert.strictEqual(a.stats.yours, 1);
    assert.strictEqual(a.briefBy, 'Priya');
    assert.strictEqual(a.prompts.length, 1);
    assert(/single scrolling page/.test(a.prompts[0].text));
    assert.strictEqual(a.stats.turns, 1, 'only my change of direction is counted');
    const unknown = D.analyzeProject({ name: 'Clinic' }, [c], {}, { owned: true });
    assert.strictEqual(unknown.stats.yours, 0, 'with several writers and no id for me, nobody is assumed to be me');
  });

  await test('hidden characters are removed from prompts and the brief', () => {
    const tag = String.fromCodePoint(0xE0041, 0xE0042), zw = '\u200B', bidi = '\u202E';
    const a = D.analyzeProject({ name: 'P' }, [chat('C', [msg('user', `Brief${tag} text${zw} here, long enough to count`, { timestamp: T(9) }), msg('user', `Make it${bidi} warmer${tag} and quieter overall please, thanks`, { timestamp: T(10) })])], {}, { owned: true });
    const all = a.brief + a.prompts.map((p) => p.text).join('');
    assert(!/[\u200B-\u200F\u202A-\u202E]/.test(all) && ![...all].some((ch) => ch.codePointAt(0) >= 0xE0000 && ch.codePointAt(0) <= 0xE007F), JSON.stringify(all));
  });

  await test('word counts are not confused by names like "constructor"', () => {
    const a = D.analyzeProject({ name: 'P' }, [chat('C', [msg('user', 'brief first, ignored for words? no, counted', { timestamp: T(9) }), msg('user', 'constructor palette palette palette', { timestamp: T(10) })])], {}, { owned: true });
    const w = D.wrappedStats([a]);
    assert.strictEqual(w.topWords[0], 'palette');
  });

  await test('a failing extra is reported in _extras-error.txt and never costs the archive', async () => {
    const s = server({ p1: { meta: { projectId: 'p1', name: 'Clay' }, get: { data: b64({ chats: { c: steeredChat() } }) } } });
    const orig = D.promptsMarkdown;
    D.promptsMarkdown = () => { throw new Error('boom'); };
    try {
      const r = await D.runExport(await D.listProjects({ fetchImpl: s.fetch }), { fetchImpl: s.fetch, delayMs: 0, download: false, makePng: false });
      assert.strictEqual(r.extras.prompts, false);
      assert.strictEqual(r.extras.viewer, true, 'the reader is still made');
      assert.strictEqual(r.problems, 1);
      const buf = Buffer.concat(r.chunks.map((c) => Buffer.from(c))).toString('latin1');
      assert(buf.includes('_extras-error.txt') && buf.includes('Prompt library: boom'));
    } finally { D.promptsMarkdown = orig; }
  });

  await test('a project the server says is not yours is held to the sharing rule even if it is in your own list', async () => {
    const s = server({ t: { meta: { projectId: 't', name: 'Theirs', isOwned: false }, get: { data: b64({ chats: { c: chat('Secret', [msg('user', 'confidential')]) } }) } } });
    const ps = await D.listProjects({ fetchImpl: s.fetch });
    assert.strictEqual(ps[0].source, 'org');
    const r = await D.exportProjects(ps, { fetchImpl: s.fetch, delayMs: 0 });
    assert(!r.files.some((f) => String(f.data).includes('confidential')));
  });

  console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
})();

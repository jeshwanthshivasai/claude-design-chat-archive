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
for (const f of ['zip', 'render', 'exporter']) {
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
      if (method === 'ListProjects') return ok({ items: Object.values(projects).map((p) => p.meta) });
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

  console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
})();

// Turns Claude Design project data into readable Markdown.
(function (root) {
  const NS = (root.DCE = root.DCE || {});

  const pad = (n) => String(n).padStart(2, '0');

  function fmtDate(iso, withTime = true) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return 'unknown date';
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return withTime ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
  }

  // Date for use inside a file name: always YYYY-MM-DD or "undated", never raw input.
  function fileDate(iso) {
    const d = new Date(iso || NaN);
    return isNaN(d) ? 'undated' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Local time is shown throughout; say the offset, not the zone name, which would reveal more than needed.
  function timeZone() {
    const off = -new Date().getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const abs = Math.abs(off);
    return `local time (UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)})`;
  }

  // Message content is usually a string; tolerate arrays of blocks or objects from API changes.
  function asText(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(asText).filter(Boolean).join('\n');
    if (typeof v === 'object') return asText(v.text != null ? v.text : v.content);
    return String(v);
  }
  const oneLine = (v) => asText(v).replace(/\s+/g, ' ').trim();
  const cell = (v) => oneLine(v).replace(/\|/g, '\\|');            // safe inside a Markdown table
  const linkText = (v) => cell(v).replace(/[\[\]]/g, '\\$&');        // safe inside [ ... ]
  const heading = (v) => oneLine(v).replace(/^#+\s*/, '');

  const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3])(\..*)?$/i;

  // Control, zero-width, bidi-override and BOM characters: invisible, and able to disguise a name.
  const INVISIBLE = new RegExp('[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069\\ufeff]', 'g');

  function sanitizeName(s, max = 80) {
    let out = String(s || '')
      .replace(INVISIBLE, ' ')
      .replace(/[\\/]/g, '-')
      .replace(/[:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[.\s]+|[.\s]+$/g, '');
    const chars = Array.from(out); // don't cut an emoji in half
    if (chars.length > max) out = chars.slice(0, max).join('').trim().replace(/[.\s]+$/g, '');
    if (WINDOWS_RESERVED.test(out)) out = '_' + out;
    return out || 'Untitled';
  }

  // Keys are normalised so "café" and "café" (decomposed) or "Hero" and "hero" cannot collide on
  // case-insensitive or normalising file systems (macOS, Windows).
  const nameKey = (n) => n.normalize('NFKC').toLowerCase();

  function uniqueName(name, used, ext = '') {
    let n = name, i = 2;
    while (used.has(nameKey(n + ext))) n = `${name} (${i++})`;
    used.add(nameKey(n + ext));
    return n + ext;
  }

  const HINT_KEYS = ['path', 'file_path', 'filePath', 'filename', 'name', 'title', 'query', 'url', 'pattern', 'description', 'text'];

  function toolHint(input) {
    if (!input || typeof input !== 'object') return '';
    for (const k of HINT_KEYS) {
      const v = input[k];
      if (typeof v === 'string' && v.trim()) {
        const one = v.replace(/\s+/g, ' ').trim();
        return one.length > 70 ? one.slice(0, 67) + '…' : one;
      }
    }
    if (Array.isArray(input.operations)) {
      const paths = [...new Set(input.operations.map((o) => o && (o.path || o.file_path)).filter(Boolean))];
      return paths.length ? paths.slice(0, 3).join(', ') + (paths.length > 3 ? '…' : '') : `${input.operations.length} operations`;
    }
    if (Array.isArray(input.todos)) return `${input.todos.length} items`;
    return '';
  }

  function renderSteps(calls) {
    // Collapse runs of the same tool on the same target: "str_replace_edit index.html ×3"
    const rows = [];
    for (const c of calls) {
      const name = (c && c.name) || 'tool';
      const hint = toolHint(c && c.input);
      const last = rows[rows.length - 1];
      if (last && last.name === name && last.hint === hint) last.count++;
      else rows.push({ name, hint, count: 1 });
    }
    return rows
      .map((r) => `> - \`${r.name}\`${r.hint ? ` ${r.hint.replace(/`/g, "'")}` : ''}${r.count > 1 ? ` ×${r.count}` : ''}`)
      .join('\n');
  }

  const clip = (v, n = 200) => {
    const one = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return one.length > n ? one.slice(0, n - 1) + '…' : one;
  };

  function assistantBody(m, includeSteps) {
    const blocks = Array.isArray(m.contentBlocks) ? m.contentBlocks : null;
    if (!blocks || !blocks.length) return asText(m.content).trim();
    const parts = [];
    let pending = [];
    const flush = () => {
      if (pending.length && includeSteps) parts.push(`> **Steps**\n${renderSteps(pending)}`);
      pending = [];
    };
    for (const b of blocks) {
      if (!b) continue;
      switch (b.type) {
        case 'tool_call':
          pending.push(b.toolCall || b);
          break;
        case 'thinking':
          break; // internal reasoning, not part of the reply
        case 'error':
          flush();
          parts.push(`> **Error:** ${clip(b.message || 'Something went wrong in this turn.', 300)}`);
          break;
        case 'user_interjection': {
          flush();
          const msg = asText(b.message && b.message.content);
          if (msg.trim()) parts.push(`> **You, mid-turn:** ${msg.trim().replace(/\n/g, '\n> ')}`);
          break;
        }
        default: {
          const text = typeof b.text === 'string' ? b.text : '';
          if (text.trim()) { flush(); parts.push(text.trim()); }
        }
      }
    }
    flush();
    const body = parts.join('\n\n').trim();
    return body || asText(m.content).trim();
  }

  function attachmentLines(atts) {
    if (!Array.isArray(atts) || !atts.length) return [];
    const lines = [];
    for (const a of atts) {
      if (!a) continue;
      const type = a.type || 'file';
      const content = typeof a.content === 'string' ? a.content : '';
      const label = oneLine(a.name || a.path || content.split('\n')[0]).slice(0, 80) || 'untitled';
      if (type === 'text' && /^<async_tool_result/.test(content)) {
        const tool = (content.match(/tool="([^"]+)"/) || [])[1] || 'background task';
        lines.push(`> *Background result from \`${tool}\`* (full text in the raw JSON)`);
      } else if (type === 'skill') {
        lines.push(`> *Skill:* ${label}`);
      } else {
        lines.push(`> *Attached ${type}:* ${label}`);
      }
    }
    return lines;
  }

  function optionLabel(o) {
    if (o == null) return '';
    if (typeof o === 'string') return /^\s*<svg/i.test(o) ? '[drawn option]' : clip(o, 70);
    if (typeof o !== 'object') return clip(o, 70);
    if (o.svg || (typeof o.value === 'string' && /^\s*<svg/i.test(o.value))) return clip(o.label || o.title || '[drawn option]', 70);
    return clip(o.label || o.title || o.name || o.value || o.text || JSON.stringify(o), 70);
  }

  function renderQuestionRecord(rec) {
    if (!rec) return '';
    if (rec.event === 'closed') return '<sub>— Questions closed —</sub>';
    const spec = rec.spec || {};
    const lines = [`**Claude asked: ${oneLine(spec.title) || 'a few questions'}**`];
    if (spec.prompt) lines.push('', clip(spec.prompt, 400));
    const qs = Array.isArray(spec.questions) ? spec.questions : [];
    if (qs.length) lines.push('');
    for (const q of qs) {
      let line = `- ${oneLine(q.title) || q.id}`;
      if (q.subtitle) line += ` (${clip(q.subtitle, 120)})`;
      const opts = Array.isArray(q.options) ? q.options.map(optionLabel).filter(Boolean) : [];
      if (opts.length) line += `\n  Options: ${opts.slice(0, 8).join(' / ')}${opts.length > 8 ? ' / …' : ''}`;
      lines.push(line);
    }
    return lines.join('\n');
  }

  function answerText(v) {
    if (v == null) return '';
    if (typeof v !== 'object') return clip(v, 400);
    const pick = (x) => (Array.isArray(x) ? x.map(optionLabel).join(', ') : optionLabel(x));
    if ('choice' in v) return typeof v.choice === 'string' ? clip(v.choice, 400) : pick(v.choice);
    if ('choices' in v) return pick(v.choices);
    if ('selected' in v) return pick(v.selected);
    if ('text' in v) return clip(v.text, 600);
    if ('open_questions' in v) return pick(v.open_questions);
    if ('accent' in v) return clip(v.accent, 60);
    if ('file' in v) return pick(v.file);
    if ('localFolders' in v) return pick(v.localFolders);
    return clip(JSON.stringify(v), 200);
  }

  function renderQuestionReceipt(m, questionTitles) {
    const r = m.questionReceipt || {};
    const titles = questionTitles.get(r.questionId) || questionTitles.get('*') || {};
    const payload = r.payload && typeof r.payload === 'object' ? r.payload : null;
    if (!payload) return asText(m.content).trim();
    const lines = ['**Your answers**', ''];
    for (const [qid, v] of Object.entries(payload)) {
      if (qid === 'followUps') { if (v) lines.push('- Asked for follow-up questions'); continue; }
      const a = answerText(v);
      if (a) lines.push(`- ${titles[qid] || qid}: ${a}`);
    }
    return lines.length > 2 ? lines.join('\n') : asText(m.content).trim();
  }

  function turnChangesLine(tc) {
    if (!tc || typeof tc !== 'object') return '';
    const bits = [];
    for (const k of ['created', 'edited', 'moved', 'deleted']) {
      const list = Array.isArray(tc[k]) ? tc[k].map((x) => (typeof x === 'string' ? x : x && (x.path || x.to || x.name))).filter(Boolean) : [];
      if (list.length) bits.push(`${k} ${list.slice(0, 6).map((f) => '`' + f + '`').join(', ')}${list.length > 6 ? ` and ${list.length - 6} more` : ''}`);
    }
    return bits.length ? `> *Files:* ${bits.join('; ')}` : '';
  }

  // One structured view of a message, shared by the Markdown, the offline viewer and the case study.
  function messageView(m, opts, ctx) {
    const when = fmtDate(m.timestamp);
    if (m.pill) return { kind: 'event', when, ts: m.timestamp, body: oneLine(m.content) || 'event' };
    if (m.questionRecord && m.questionRecord.event === 'closed') return { kind: 'event', when, ts: m.timestamp, body: 'Questions closed' };
    const isUser = m.role === 'user';
    // In a shared project several people can write; name them when there is more than one.
    const author = typeof m.authorName === 'string' ? oneLine(m.authorName) : '';
    const who = isUser ? (ctx.multiAuthor ? (author || 'Someone') : 'You')
      : m.role === 'assistant' ? 'Claude' : (oneLine(m.role) || 'Message');
    let body, kind = isUser ? 'you' : 'claude';
    if (m.questionRecord) { body = renderQuestionRecord(m.questionRecord); kind = 'question'; }
    else if (m.questionReceipt) { body = renderQuestionReceipt(m, ctx.questionTitles); kind = 'answer'; }
    else body = isUser ? asText(m.content).trim() : assistantBody(m, opts.includeSteps);
    const extra = [...attachmentLines(m.attachments)];
    if (!isUser && opts.includeSteps) { const tc = turnChangesLine(m.turnChanges); if (tc) extra.push(tc); }
    return { kind, who, when, ts: m.timestamp, body: body || '*(no text)*', extra };
  }

  function renderMessage(m, opts, ctx) {
    const v = messageView(m, opts, ctx);
    if (v.kind === 'event') return v.body === 'Questions closed' ? '<sub>— Questions closed —</sub>' : `<sub>— ${v.body} · ${v.when} —</sub>`;
    return [`### ${v.who} · ${v.when}`, '', v.body, v.extra.length ? '\n' + v.extra.join('\n') : ''].join('\n').trimEnd();
  }

  function chatContext(chat) {
    const authors = new Set((chat.messages || [])
      .filter((m) => m && m.role === 'user' && !m.pill && typeof m.authorName === 'string' && m.authorName.trim())
      .map((m) => oneLine(m.authorName)));
    return { questionTitles: questionTitleMap(chat), multiAuthor: authors.size > 1 };
  }

  function questionTitleMap(chat) {
    const map = new Map();
    for (const m of chat.messages || []) {
      const r = m.questionRecord;
      if (!r || !r.questionId || !r.spec || !Array.isArray(r.spec.questions)) continue;
      const t = map.get(r.questionId) || {};
      for (const q of r.spec.questions) if (q && q.id) t[q.id] = q.title || q.id;
      map.set(r.questionId, t);
      map.set('*', Object.assign(map.get('*') || {}, t));
    }
    return map;
  }

  function sortedChats(data) {
    const chats = Object.values((data && data.chats) || {});
    return chats.sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')));
  }

  function chatStats(chat) {
    const msgs = Array.isArray(chat.messages) ? chat.messages : [];
    const real = msgs.filter((m) => !m.pill);
    const first = msgs[0] && msgs[0].timestamp;
    const last = msgs.length ? msgs[msgs.length - 1].timestamp : null;
    return { total: real.length, yours: real.filter((m) => m.role === 'user').length, first, last };
  }

  function renderChat(project, chat, idx, opts) {
    const s = chatStats(chat);
    const title = heading(chat.title) || `Chat ${idx}`;
    const head = [
      `# ${title}`,
      '',
      `| | |`,
      `|---|---|`,
      `| Project | ${cell(project.name)} |`,
      `| Chat | ${idx} of ${opts.chatCount} |`,
      `| Started | ${fmtDate(chat.created || s.first)} |`,
      `| Last message | ${fmtDate(s.last)} |`,
      `| Messages | ${s.total} (${s.yours} from you) |`,
      `| Times shown in | ${timeZone()} |`,
      '',
    ].join('\n') + '\n---\n\n';
    const ctx = chatContext(chat);
    const body = (chat.messages || []).map((m) => renderMessage(m, opts, ctx)).join('\n\n---\n\n');
    let tail = '';
    if (Array.isArray(chat.todos) && chat.todos.length) {
      tail = '\n\n---\n\n## Todo list at export time\n\n' +
        chat.todos.map((t) => `- [${t && t.completed ? 'x' : ' '}] ${oneLine(t && t.text)}`).join('\n');
    }
    return head + body + tail + '\n';
  }

  function renderProjectIndex(project, entries) {
    const rows = entries.map((e) =>
      `| ${e.idx} | [${linkText(e.title)}](<${e.file}>) | ${fmtDate(e.stats.first, false)} | ${fmtDate(e.stats.last, false)} | ${e.stats.total} |`);
    return [
      `# ${heading(project.name) || 'Untitled'}`,
      '',
      `Created ${fmtDate(project.createdAt || project.created, false)} · last updated ${fmtDate(project.updatedAt, false)} · ${entries.length} chat${entries.length === 1 ? '' : 's'}`,
      '',
      entries.length ? '| # | Chat | Started | Last message | Messages |\n|---|---|---|---|---|\n' + rows.join('\n') : '*No chats in this project.*',
      '',
      'Chats are numbered in the order they were started. To continue this project in Claude, see `_resume-in-claude.md`.',
      '',
    ].join('\n');
  }

  function renderResume(project, entries) {
    const files = entries.map((e) => `- ${e.file}`).join('\n') || '- (no chats)';
    return [
      `# Continue "${oneLine(project.name)}" in Claude`,
      '',
      '1. Start a new chat in Claude.',
      '2. Attach the project files ZIP you downloaded from Claude Design.',
      '3. Attach the chat transcripts from this folder:',
      '',
      files,
      '',
      '4. Paste the prompt below and send it.',
      '',
      '---',
      '',
      '```text',
      `I'm moving a design project called "${oneLine(project.name)}" from the standalone Claude Design site into this chat.`,
      'Attached are the project files (ZIP) and the full chat transcripts, numbered in the order they happened.',
      '',
      'Before changing anything:',
      '1. Read the transcripts in order.',
      '2. Write me a handoff brief with: the original brief, the design direction we settled on (type, colour, layout, motion),',
      '   decisions I made and why, directions I rejected, the current state of the files, and open todos.',
      '3. Ask me anything that is unclear.',
      '',
      'Then wait for my go-ahead before continuing the design.',
      '```',
      '',
    ].join('\n');
  }

  function renderReadme(summary) {
    const rows = summary.projects.map((p) =>
      `| [${linkText(p.name)}](<${p.folder}/${p.failed ? '_error.txt' : '_index.md'}>) | ${p.chats} | ${p.messages} | ${cell(p.note)} |`);
    const x = summary.extras || {};
    const lines = [
      '# Claude Design chat archive',
      '',
      `Exported ${fmtDate(summary.exportedAt)} (${timeZone()}) · ${summary.projects.length} projects · ${summary.totalChats} chats · ${summary.totalMessages} messages`,
      '',
    ];
    if (x.viewer) lines.push('**Start here:** open `index.html` in your browser. It shows every chat, searchable, and works offline.', '');
    const top = [];
    if (x.prompts) top.push('- `prompts.md`: every prompt you wrote, grouped by project, with the ones that led to work you kept marked **Kept**.');
    if (x.wrapped) top.push('- `wrapped.png`: your Claude Design in numbers, as an image to share. It never shows project names.');
    if (summary.extrasProblems) top.push('- `_extras-error.txt`: some extras could not be made, and why. The transcripts are complete.');
    if (top.length) lines.push('## Also in this folder', '', ...top, '');
    lines.push(
      '| Project | Chats | Messages | Notes |',
      '|---|---|---|---|',
      ...rows,
      '',
      '## What is in each project folder',
      '',
      '- `_index.md`: the chats in order, with dates.',
      '- `01 ….md`, `02 ….md`: one readable transcript per chat. Tool steps Claude took are shown as compact lists.',
      '- `_resume-in-claude.md`: how to pick the project up again in Claude, with a ready prompt.',
    );
    if (x.caseStudy) lines.push('- `case-study.html`: a first draft of the project\'s story (the brief, the decisions, the changes of direction and what came out of it) to edit into a portfolio piece.');
    if (summary.includeRaw) {
      lines.push('- `_raw/project-data.json`: the complete original data as Claude Design stores it: every message, tool call and file edit (including file contents), Claude\'s thinking where present, unsent drafts, and internal IDs. Treat it as private.');
    }
    lines.push(
      '',
      'Your design files are not in this archive. Download those per project from Claude Design (Share → Project HTML → Project archive).',
      '',
      'Transcripts contain whatever was said in the chats, including any HTML. Open them in a text or Markdown editor rather than a browser.',
      '',
      'Made with Design Chat Archive, an unofficial tool not affiliated with Anthropic.',
      '',
    );
    return lines.join('\n');
  }

  Object.assign(NS, {
    fmtDate, fileDate, sanitizeName, uniqueName, sortedChats, chatStats, asText, oneLine, clip,
    messageView, chatContext, questionTitleMap, answerText, turnChangesLine, timeZone,
    renderChat, renderProjectIndex, renderResume, renderReadme, toolHint,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

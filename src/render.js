// Turns Claude Design project data into readable Markdown.
(function (root) {
  const NS = (root.DCE = root.DCE || {});

  const pad = (n) => String(n).padStart(2, '0');

  function fmtDate(iso, withTime = true) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return withTime ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
  }

  function timeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'; }
    catch (e) { return 'local time'; }
  }

  function sanitizeName(s, max = 80) {
    let out = String(s || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/[\\/]/g, '-')
      .replace(/[:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[.\s]+|[.\s]+$/g, '');
    if (out.length > max) out = out.slice(0, max).trim();
    return out || 'Untitled';
  }

  function uniqueName(name, used) {
    let n = name, i = 2;
    while (used.has(n.toLowerCase())) n = `${name} (${i++})`;
    used.add(n.toLowerCase());
    return n;
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
    if (!blocks || !blocks.length) return (m.content || '').trim();
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
          const msg = (b.message && b.message.content) || '';
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
    return body || (m.content || '').trim();
  }

  function attachmentLines(atts) {
    if (!Array.isArray(atts) || !atts.length) return [];
    const lines = [];
    for (const a of atts) {
      if (!a) continue;
      const type = a.type || 'file';
      const content = typeof a.content === 'string' ? a.content : '';
      const label = a.name || a.path || clip(content.split('\n')[0], 80) || 'untitled';
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
    return clip(o.label || o.title || o.name || o.value || o.text || JSON.stringify(o), 70);
  }

  function renderQuestionRecord(rec) {
    if (!rec) return '';
    if (rec.event === 'closed') return '<sub>— Questions closed —</sub>';
    const spec = rec.spec || {};
    const lines = [`**Claude asked: ${spec.title || 'a few questions'}**`];
    if (spec.prompt) lines.push('', clip(spec.prompt, 400));
    const qs = Array.isArray(spec.questions) ? spec.questions : [];
    if (qs.length) lines.push('');
    for (const q of qs) {
      let line = `- ${q.title || q.id}`;
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
    if (!payload) return (m.content || '').trim();
    const lines = ['**Your answers**', ''];
    for (const [qid, v] of Object.entries(payload)) {
      if (qid === 'followUps') { if (v) lines.push('- Asked for follow-up questions'); continue; }
      const a = answerText(v);
      if (a) lines.push(`- ${titles[qid] || qid}: ${a}`);
    }
    return lines.length > 2 ? lines.join('\n') : (m.content || '').trim();
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

  function renderMessage(m, opts, ctx) {
    const when = fmtDate(m.timestamp);
    if (m.pill) {
      const t = (m.content || '').replace(/\s+/g, ' ').trim();
      return `<sub>— ${t || 'event'} · ${when} —</sub>`;
    }
    if (m.questionRecord && m.questionRecord.event === 'closed') return renderQuestionRecord(m.questionRecord);
    const isUser = m.role === 'user';
    const who = isUser ? 'You' : m.role === 'assistant' ? 'Claude' : (m.role || 'Message');
    let body;
    if (m.questionRecord) body = renderQuestionRecord(m.questionRecord);
    else if (m.questionReceipt) body = renderQuestionReceipt(m, ctx.questionTitles);
    else body = isUser ? (m.content || '').trim() : assistantBody(m, opts.includeSteps);
    const extra = [...attachmentLines(m.attachments)];
    if (!isUser && opts.includeSteps) { const tc = turnChangesLine(m.turnChanges); if (tc) extra.push(tc); }
    return [
      `### ${who} · ${when}`,
      '',
      body || '*(no text)*',
      extra.length ? '\n' + extra.join('\n') : '',
    ].join('\n').trimEnd();
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
    const title = chat.title || `Chat ${idx}`;
    const head = [
      `# ${title}`,
      '',
      `| | |`,
      `|---|---|`,
      `| Project | ${project.name} |`,
      `| Chat | ${idx} of ${opts.chatCount} |`,
      `| Started | ${fmtDate(chat.created || s.first)} |`,
      `| Last message | ${fmtDate(s.last)} |`,
      `| Messages | ${s.total} (${s.yours} from you) |`,
      `| Times shown in | ${timeZone()} |`,
      '',
    ].join('\n') + '\n---\n\n';
    const ctx = { questionTitles: questionTitleMap(chat) };
    const body = (chat.messages || []).map((m) => renderMessage(m, opts, ctx)).join('\n\n---\n\n');
    let tail = '';
    if (Array.isArray(chat.todos) && chat.todos.length) {
      tail = '\n\n---\n\n## Todo list at export time\n\n' +
        chat.todos.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.text || ''}`).join('\n');
    }
    return head + body + tail + '\n';
  }

  function renderProjectIndex(project, entries) {
    const rows = entries.map((e) =>
      `| ${e.idx} | [${e.title.replace(/\|/g, '/')}](<${e.file}>) | ${fmtDate(e.stats.first, false)} | ${fmtDate(e.stats.last, false)} | ${e.stats.total} |`);
    return [
      `# ${project.name}`,
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
      `# Continue "${project.name}" in Claude`,
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
      `I'm moving a design project called "${project.name}" from the standalone Claude Design site into this chat.`,
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
      `| [${p.name.replace(/\|/g, '/')}](<${p.folder}/${p.failed ? '_error.txt' : '_index.md'}>) | ${p.chats} | ${p.messages} | ${p.note || ''} |`);
    const lines = [
      '# Claude Design chat archive',
      '',
      `Exported ${fmtDate(summary.exportedAt)} (${timeZone()}) · ${summary.projects.length} projects · ${summary.totalChats} chats · ${summary.totalMessages} messages`,
      '',
      '| Project | Chats | Messages | Notes |',
      '|---|---|---|---|',
      ...rows,
      '',
      '## What is in each project folder',
      '',
      '- `_index.md`: the chats in order, with dates.',
      '- `01 ….md`, `02 ….md`: one readable transcript per chat. Tool steps Claude took are shown as compact lists.',
      '- `_resume-in-claude.md`: how to pick the project up again in Claude, with a ready prompt.',
    ];
    if (summary.includeRaw) {
      lines.push('- `_raw/project-data.json`: the complete original data, including every tool call and file edit, for re-processing.');
    }
    lines.push(
      '',
      'Your design files are not in this archive. Download those per project from Claude Design (Share → Project HTML → Project archive).',
      '',
      'Made with Chat Archive for Claude Design, an unofficial tool not affiliated with Anthropic.',
      '',
    );
    return lines.join('\n');
  }

  Object.assign(NS, {
    fmtDate, sanitizeName, uniqueName, sortedChats, chatStats,
    renderChat, renderProjectIndex, renderResume, renderReadme, toolHint,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

// Reads a project's chats and pulls out how the design was steered: the brief, the questions Claude
// asked and your answers, the moments you changed direction, the files that came out of it, and the
// prompts that led to work you kept. Everything here runs on data already in memory; nothing is sent anywhere.
(function (root) {
  const NS = (root.DCE = root.DCE || {});

  // Phrases that usually mean "not that, something else". Plain edits ("remove the…", "change the…") are left
  // out on purpose: they refine a direction rather than change it. A heuristic, labelled as such in the output.
  const TURN = /\b(nope|not quite|not what i|not right|i (?:do ?n['o]?t|dont) (?:like|love|want)|instead|rather than|revert|undo|go back|start over|scrap (?:it|this|that)|try (?:again|something else)|too (?:much|busy|big|small|dark|light|plain|generic|bold|heavy|loud|cluttered|boring)|more like|less (?:like|of|busy|generic)|does ?n['o]?t (?:work|look|feel|match)|looks? (?:off|wrong|generic|cheap|dated))\b/i;
  const STOP = new Set(('the a an and or but if then than so to of in on at by for with from as is are was were be been being it its this that these those ' +
    'i me my we our you your he she they them their his her not no yes do does did done can could should would will just also very more most less ' +
    'make made like want need please lets let use using add added into about over under there here what when where which who how why all any some each ' +
    'one two get got have has had same other such only own too out up down off again once now new still well even way much many really maybe ' +
    'design claude page section thing things something im ive dont doesnt isnt cant thats its youre ill well okay ok sure hi hey thanks thank').split(/\s+/));

  // Invisible characters (zero-width, bidi controls, Unicode tags) could hide instructions in a prompt someone
  // later copies into Claude, so they are removed from anything this file quotes.
  const HIDDEN = new RegExp('[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF\\u{E0000}-\\u{E007F}]', 'gu');
  const visible = (t) => String(t || '').replace(HIDDEN, '');
  const tsNum = (t) => { const d = new Date(t || NaN); return isNaN(d) ? null : d.getTime(); };
  const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const isChatText = (m) => m && m.role === 'user' && !m.pill && !m.questionReceipt && !m.questionRecord;
  const fileList = (tc, key) => (tc && Array.isArray(tc[key]) ? tc[key].map((x) => (typeof x === 'string' ? x : x && (x.path || x.to || x.name))).filter(Boolean) : []);

  // opts.owned: the project is yours. opts.myUuid: your account id, when known.
  function analyzeProject(proj, chats, data, opts = {}) {
    const R = NS;
    const out = {
      name: R.oneLine(proj.name) || 'Untitled', created: proj.createdAt || proj.created || null, updated: proj.updatedAt || null,
      brief: '', briefWhen: null, events: [], prompts: [], assets: [],
      stats: { chats: chats.length, messages: 0, yours: 0, words: 0, questions: 0, answered: 0, turns: 0, filesCreated: 0, days: 0, first: null, last: null, longestChat: 0 },
      wordFreq: Object.create(null), hours: new Array(24).fill(0), dayCounts: Object.create(null),
    };
    const created = new Set(); const days = new Set();
    let firstUserSeen = false;

    for (const chat of chats) {
      const msgs = Array.isArray(chat.messages) ? chat.messages : [];
      const ctx = R.chatContext(chat);
      // In a chat with several writers, only your own messages count as yours.
      const writers = new Set(msgs.filter((m) => m && m.role === 'user' && !m.pill).map((m) => m.authorAccountUuid || (typeof m.authorName === 'string' && m.authorName.trim()) || '').filter(Boolean));
      const multi = writers.size > 1;
      const mine = (m) => (m.authorAccountUuid && opts.myUuid ? m.authorAccountUuid === opts.myUuid : !!opts.owned && !multi);
      const chatTitle = R.oneLine(chat.title) || 'Chat';
      out.stats.longestChat = Math.max(out.stats.longestChat, msgs.filter((m) => m && !m.pill).length);

      for (let i = 0; i < msgs.length; i++) {
        const m = msgs[i]; if (!m) continue;
        const t = tsNum(m.timestamp);
        if (t != null) {
          days.add(dayKey(t));
          if (out.stats.first == null || t < out.stats.first) out.stats.first = t;
          if (out.stats.last == null || t > out.stats.last) out.stats.last = t;
        }
        if (m.pill) continue;
        out.stats.messages++;

        if (m.questionRecord && m.questionRecord.event !== 'closed') {
          const spec = m.questionRecord.spec || {};
          const qs = Array.isArray(spec.questions) ? spec.questions : [];
          out.stats.questions += qs.length;
          out.events.push({ kind: 'question', t, chat: chatTitle, title: R.oneLine(spec.title) || 'A few questions', items: qs.slice(0, 14).map((q) => R.oneLine(q && (q.title || q.id))) });
          continue;
        }
        if (m.questionReceipt) {
          const r = m.questionReceipt; const titles = ctx.questionTitles.get(r.questionId) || ctx.questionTitles.get('*') || {};
          const items = [];
          for (const [qid, v] of Object.entries((r.payload && typeof r.payload === 'object') ? r.payload : {})) {
            if (qid === 'followUps') continue;
            const a = R.answerText(v); if (a) items.push({ q: titles[qid] || qid, a });
          }
          out.stats.answered += items.length;
          // Attach answers to the question card they belong to, so the timeline reads as one decision.
          const lastQ = [...out.events].reverse().find((e) => e.kind === 'question' && !e.answers);
          if (lastQ) lastQ.answers = items; else out.events.push({ kind: 'answer', t, chat: chatTitle, items });
          continue;
        }
        if (m.role === 'assistant') {
          const made = fileList(m.turnChanges, 'created');
          made.forEach((f) => created.add(f));
          if (made.length) out.events.push({ kind: 'files', t, chat: chatTitle, files: made });
          continue;
        }
        if (isChatText(m)) {
          const text = visible(R.asText(m.content)).trim();
          const isBrief = !firstUserSeen && !!text;
          if (isBrief) { // the project's first message is its brief, whoever wrote it
            firstUserSeen = true; out.brief = text.length > 1600 ? text.slice(0, 1599) + '…' : text; out.briefWhen = t;
            if (!mine(m)) out.briefBy = R.oneLine(m.authorName) || 'a teammate';
            out.events.push({ kind: 'brief', t, chat: chatTitle, text: R.clip(text, 260), by: out.briefBy });
          }
          if (!mine(m)) continue;
          out.stats.yours++;
          if (t != null) { const d = new Date(t); out.hours[d.getHours()]++; const k = dayKey(t); out.dayCounts[k] = (out.dayCounts[k] || 0) + 1; }
          const words = text.toLowerCase().replace(/https?:\/\/\S+/g, ' ').match(/[a-z][a-z'-]{2,}/g) || [];
          out.stats.words += words.length;
          for (const w of words) { const k = w.replace(/'s$/, '').replace(/'/g, ''); if (k.length > 3 && !STOP.has(k)) out.wordFreq[k] = (out.wordFreq[k] || 0) + 1; }
          if (isBrief) continue; // shown as the brief, not as a turn or a prompt

          const isTurn = text.length < 700 && TURN.test(text);
          if (isTurn) { out.stats.turns++; out.events.push({ kind: 'turn', t, chat: chatTitle, text: R.clip(text, 320) }); }

          // A prompt "worked" when Claude's next turn made or changed files and your next message wasn't a change of direction.
          if (text.length >= 30) {
            let changed = false, next = null;
            for (let j = i + 1; j < msgs.length; j++) {
              const n = msgs[j]; if (!n || n.pill) continue;
              if (n.role === 'assistant' && (fileList(n.turnChanges, 'created').length || fileList(n.turnChanges, 'edited').length)) changed = true;
              if (isChatText(n)) { next = R.asText(n.content); break; }
            }
            const kept = changed && !(next && next.length < 700 && TURN.test(next));
            out.prompts.push({ text: text.length > 1200 ? text.slice(0, 1199) + '…' : text, t, chat: chatTitle, kept });
          }
        }
      }
    }

    // What shipped: the project's files and how many versions each went through.
    const assets = (data && data.assets && typeof data.assets === 'object') ? data.assets : {};
    for (const [name, a] of Object.entries(assets)) {
      const versions = Array.isArray(a && a.versions) ? a.versions : [];
      const lastV = versions[versions.length - 1] || {};
      out.assets.push({ name: R.oneLine(name), versions: versions.length, path: R.oneLine(lastV.path), note: R.clip(lastV.subtitle || '', 160), t: tsNum(lastV.createdAt) });
    }

    out.events.sort((a, b) => (a.t || 0) - (b.t || 0));
    out.stats.filesCreated = created.size;
    out.stats.days = days.size;
    return out;
  }

  // ---------------------------------------------------------------- Wrapped
  function wrappedStats(analyses) {
    const s = { projects: analyses.length, chats: 0, messages: 0, yours: 0, words: 0, answered: 0, turns: 0, files: 0, longestChat: 0, first: null, last: null, busiestDay: null, busiestCount: 0, peakHour: null, topWords: [], daysActive: 0 };
    const words = Object.create(null), hours = new Array(24).fill(0), days = Object.create(null);
    for (const a of analyses) {
      const st = a.stats;
      s.chats += st.chats; s.messages += st.messages; s.yours += st.yours; s.words += st.words; s.answered += st.answered; s.turns += st.turns; s.files += st.filesCreated;
      s.longestChat = Math.max(s.longestChat, st.longestChat);
      if (st.first != null && (s.first == null || st.first < s.first)) s.first = st.first;
      if (st.last != null && (s.last == null || st.last > s.last)) s.last = st.last;
      for (const [w, c] of Object.entries(a.wordFreq)) words[w] = (words[w] || 0) + c;
      a.hours.forEach((c, h) => (hours[h] += c));
      for (const [d, c] of Object.entries(a.dayCounts)) days[d] = (days[d] || 0) + c;
    }
    for (const [d, c] of Object.entries(days)) if (c > s.busiestCount) { s.busiestCount = c; s.busiestDay = d; }
    s.daysActive = Object.keys(days).length;
    // Only name a favourite hour when one clearly stands out.
    const ranked = [...hours].sort((a, b) => b - a);
    s.peakHour = ranked[0] >= 3 && ranked[0] > ranked[1] ? hours.indexOf(ranked[0]) : null;
    s.topWords = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
    return s;
  }

  // ---------------------------------------------------------------- Prompt library
  function promptsMarkdown(analyses) {
    const R = NS;
    const lines = ['# Prompt library', '', 'Your prompts from Claude Design, grouped by project. **Kept** marks prompts after which Claude made or changed files and you carried on in the same direction, a good sign the prompt worked. That label is worked out automatically, so treat it as a hint.', ''];
    let any = false;
    for (const a of analyses) {
      if (!a.prompts.length) continue; any = true;
      const sorted = [...a.prompts].sort((x, y) => (y.kept - x.kept) || ((x.t || 0) - (y.t || 0)));
      lines.push(`## ${a.name}`, '');
      for (const p of sorted) {
        lines.push(`**${p.kept ? 'Kept' : 'Tried'}** · ${R.fmtDate(p.t)} · ${p.chat}`, '', '```text', p.text.replace(/```/g, "'''"), '```', '');
      }
    }
    if (!any) lines.push('*No prompts long enough to keep were found.*', '');
    return lines.join('\n');
  }

  Object.assign(NS, { analyzeProject, wrappedStats, promptsMarkdown });
})(typeof globalThis !== 'undefined' ? globalThis : this);

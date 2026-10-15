// Draws the shareable "Claude Design, archived" card (1080x1350, a 4:5 post) from wrappedStats().
// Used by the page (to put wrapped.png in the ZIP) and by the side panel (preview and download).
// Project names never appear on the card; the most-used words appear only when asked for.
(function (root) {
  const NS = (root.DCE = root.DCE || {});
  const INK = '#161E38', INK2 = '#222D52', PAPER = '#FBF6E9', MANILA = '#EAD9AE', MANILA_D = '#CDB884', RUST = '#C45634', SOFT = '#AEB5CC';
  const SERIF = 'Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif';
  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function hourLabel(h) { if (h == null) return null; if (h === 0) return 'midnight'; if (h === 12) return 'noon'; return `${h % 12} ${h < 12 ? 'am' : 'pm'}`; }
  function dayLabel(k) { if (!k) return null; const [y, m, d] = k.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; }

  function mark(c, x, y, s) { // folder with a chat bubble rising out of it, as in the icon
    c.save(); c.translate(x, y); c.scale(s / 512, s / 512);
    c.fillStyle = MANILA_D; rr(c, 82, 206, 348, 226, 34); c.fill(); rr(c, 82, 178, 140, 52, 26); c.fill();
    c.save(); c.translate(260, 150); c.rotate(-7 * Math.PI / 180); c.translate(-260, -150);
    c.fillStyle = PAPER; rr(c, 128, 58, 264, 156, 46); c.fill();
    c.beginPath(); c.moveTo(170, 206); c.lineTo(142, 262); c.lineTo(236, 208); c.closePath(); c.fill();
    c.fillStyle = INK; rr(c, 172, 100, 180, 26, 13); c.fill(); rr(c, 172, 152, 124, 26, 13); c.fill();
    c.restore();
    c.fillStyle = MANILA; rr(c, 82, 268, 348, 164, 34); c.fill();
    c.restore();
  }

  function stamp(c, text, cx, cy, size, rot) {
    c.save(); c.translate(cx, cy); c.rotate(rot * Math.PI / 180);
    c.font = `700 ${size}px ${SANS}`; const w = c.measureText(text).width + size * 1.6, h = size * 1.9;
    c.strokeStyle = RUST; c.lineWidth = size * .14; rr(c, -w / 2, -h / 2, w, h, size * .28); c.stroke();
    c.fillStyle = RUST; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, size * .05);
    c.restore();
  }

  function drawWrapped(canvas, s, opts = {}) {
    const W = 1080, H = 1350; canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    c.fillStyle = INK; c.fillRect(0, 0, W, H);
    c.strokeStyle = INK2; c.lineWidth = 2; for (let y = 54; y < H; y += 54) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = '#4A2F3F'; c.beginPath(); c.moveTo(96, 0); c.lineTo(96, H); c.stroke();

    mark(c, 128, 96, 120);
    stamp(c, 'ARCHIVED', 850, 168, 44, -8);

    c.fillStyle = PAPER; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `700 84px ${SERIF}`; c.fillText('My Claude Design,', 128, 338); c.fillStyle = MANILA; c.fillText('archived.', 128, 432);

    // Hero number
    c.fillStyle = PAPER; c.font = `700 210px ${SERIF}`; const hero = (s.yours || 0).toLocaleString('en');
    c.fillText(hero, 120, 660);
    c.fillStyle = SOFT; c.font = `500 34px ${SANS}`; c.fillText('messages I sent while designing', 132, 716);

    // Ledger of six figures
    const span = s.first && s.last ? Math.max(1, Math.round((s.last - s.first) / 86400000) + 1) : null;
    const cells = [
      [s.projects, s.projects === 1 ? 'project' : 'projects'], [s.chats, s.chats === 1 ? 'conversation' : 'conversations'],
      [s.answered, 'decisions answered'], [s.turns, 'changes of direction'],
      [s.files, 'files made'], [s.longestChat, 'messages in my longest chat'],
    ];
    const gx = 128, gy = 790, cw = 280, ch = 128;
    c.strokeStyle = MANILA_D; c.lineWidth = 2; c.beginPath(); c.moveTo(gx, gy - 8); c.lineTo(gx + cw * 3 - 28, gy - 8); c.stroke();
    cells.forEach(([n, label], i) => {
      const x = gx + (i % 3) * cw, y = gy + Math.floor(i / 3) * ch;
      c.fillStyle = PAPER; c.font = `700 58px ${SERIF}`; c.fillText((n || 0).toLocaleString('en'), x, y + 62);
      c.fillStyle = SOFT; c.font = `500 24px ${SANS}`; c.fillText(label, x, y + 98);
    });

    // One line of character
    const bits = [];
    if (s.busiestDay && s.busiestCount > 1) bits.push(`Busiest day: ${dayLabel(s.busiestDay)}`);
    if (s.peakHour != null) bits.push(`most often around ${hourLabel(s.peakHour)}`);
    if (span) bits.push(`${span} ${span === 1 ? 'day' : 'days'} from first chat to last`);
    c.fillStyle = PAPER; c.font = `italic 400 32px ${SERIF}`;
    if (bits.length) {
      bits[0] = bits[0][0].toUpperCase() + bits[0].slice(1);
      // One line if it fits, otherwise break after a comma.
      const lines = [''];
      bits.forEach((b, i) => {
        const piece = (i ? ', ' : '') + b + (i === bits.length - 1 ? '.' : '');
        const cur = lines[lines.length - 1];
        if (cur && c.measureText(cur + piece).width > W - 128 - 72) lines.push(piece.replace(/^, /, ''));
        else lines[lines.length - 1] = cur + piece;
      });
      if (lines.length > 1) lines[0] += ',';
      lines.slice(0, 2).forEach((l, i) => c.fillText(l, 128, (lines.length > 1 ? 1066 : 1086) + i * 42));
    }

    if (opts.words && s.topWords && s.topWords.length) {
      let x = 128; const y = 1126; c.font = `600 28px ${SANS}`;
      for (const w of s.topWords.slice(0, 5)) {
        const tw = c.measureText(w).width + 40; if (x + tw > W - 80) break;
        c.fillStyle = MANILA; rr(c, x, y, tw, 52, 26); c.fill(); c.fillStyle = INK; c.fillText(w, x + 20, y + 36); x += tw + 14;
      }
    }

    c.fillStyle = SOFT; c.font = `500 24px ${SANS}`;
    c.fillText('Saved with Design Chat Archive, free on the Chrome Web Store.', 128, 1262);
    c.fillText('Claude Design’s standalone site closes on 14 Dec 2026.', 128, 1298);
    return canvas;
  }

  async function wrappedPng(s, opts = {}) {
    const canvas = drawWrapped(document.createElement('canvas'), s, opts);
    const dataUrl = canvas.toDataURL('image/png');
    const bin = atob(dataUrl.split(',')[1]); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, dataUrl };
  }

  Object.assign(NS, { drawWrapped, wrappedPng });
})(typeof globalThis !== 'undefined' ? globalThis : this);

// Promo art without text, as the Web Store asks: chat bubbles being filed into a manila folder,
// a rust seal for "saved", and (on the wide marquee) the day ruler running out to 14 Dec.
const NAVY = '#161E38', PAPER = '#FBF6E9', MANILA = '#EAD9AE', MANILA_D = '#C9B27A', RUST = '#C45634', NAVY3 = '#2E3A66', SOFT = '#AEB5CC';

function bubble(x, y, w, rot, fill, line, id) {
  const h = w * 0.62, r = h * 0.3;
  return `<g transform="translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})">
    <rect width="${w}" height="${h}" rx="${r}" fill="${fill}"/>
    <path d="M${w * 0.16} ${h - 2} L${w * 0.09} ${h + h * 0.34} L${w * 0.42} ${h - 2} Z" fill="${fill}"/>
    <rect x="${w * 0.17}" y="${h * 0.27}" width="${w * 0.62}" height="${h * 0.15}" rx="${h * 0.075}" fill="${line}"/>
    <rect x="${w * 0.17}" y="${h * 0.56}" width="${w * 0.38}" height="${h * 0.15}" rx="${h * 0.075}" fill="${line}"/>
  </g>`;
}

function folder(x, y, w, drop) { // drop: the bubble that is going in, drawn between back and front
  const h = w * 0.68;
  return `<rect x="${x}" y="${y + h * 0.12}" width="${w}" height="${h * 0.88}" rx="${w * 0.1}" fill="${MANILA_D}"/>
    <rect x="${x}" y="${y}" width="${w * 0.42}" height="${h * 0.25}" rx="${w * 0.08}" fill="${MANILA_D}"/>
    ${drop}
    <rect x="${x}" y="${y + h * 0.38}" width="${w}" height="${h * 0.62}" rx="${w * 0.1}" fill="url(#front)"/>`;
}

function seal(cx, cy, r) {
  return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${RUST}"/><circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="#F3C3AE" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="3 3"/>
    <path d="M${cx - r * 0.38} ${cy + r * 0.02} L${cx - r * 0.08} ${cy + r * 0.32} L${cx + r * 0.42} ${cy - r * 0.3}" fill="none" stroke="${PAPER}" stroke-width="${r * 0.2}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function defs(w, h) {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22305E"/><stop offset=".55" stop-color="${NAVY}"/><stop offset="1" stop-color="#10162B"/></linearGradient>
    <linearGradient id="front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3E6C3"/><stop offset="1" stop-color="#E0CB97"/></linearGradient>
    <radialGradient id="glow" cx=".68" cy=".55" r=".55"><stop offset="0" stop-color="#3A4A86" stop-opacity=".55"/><stop offset="1" stop-color="#3A4A86" stop-opacity="0"/></radialGradient>
    <pattern id="ruled" width="${w}" height="22" patternUnits="userSpaceOnUse"><rect y="21" width="${w}" height="1" fill="#2A3664" opacity=".55"/></pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#ruled)"/><rect width="${w}" height="${h}" fill="url(#glow)"/>`;
}

function promoTile() { // 440x280
  const W = 440, H = 280;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(W, H)}
    <path d="M30 196 C 90 120, 170 70, 262 96" fill="none" stroke="${SOFT}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>
    ${bubble(30, 168, 46, -16, NAVY3, PAPER)}
    ${bubble(104, 98, 70, -12, MANILA, NAVY)}
    ${folder(214, 112, 178, bubble(240, 66, 128, -7, PAPER, NAVY))}
    ${seal(366, 222, 23)}
  </svg>`;
}

function marquee() { // 1400x560
  const W = 1400, H = 560;
  const ticks = []; const x0 = 90, x1 = 1300, n = 60, step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const big = i % 7 === 0; ticks.push(`<rect x="${x0 + i * step}" y="${500 - (i === 0 ? 34 : big ? 22 : 12)}" width="${i === 0 ? 5 : 3}" height="${i === 0 ? 34 : big ? 22 : 12}" fill="${i === 0 ? MANILA : SOFT}" opacity="${i === 0 ? 1 : big ? .75 : .4}"/>`); }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(W, H)}
    ${ticks.join('')}<circle cx="${x1 + 8}" cy="482" r="13" fill="${RUST}"/>
    <path d="M150 360 C 330 170, 560 120, 790 190" fill="none" stroke="${SOFT}" stroke-opacity=".35" stroke-width="4" stroke-dasharray="3 14" stroke-linecap="round"/>
    ${bubble(120, 300, 92, -18, NAVY3, PAPER)}
    ${bubble(300, 190, 136, -13, MANILA, NAVY)}
    ${bubble(500, 120, 112, -9, '#DCE2F2', NAVY)}
    ${folder(760, 150, 380, bubble(810, 66, 270, -7, PAPER, NAVY))}
    ${seal(1118, 392, 44)}
  </svg>`;
}
module.exports = { promoTile, marquee };

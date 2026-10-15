// The extension icon as SVG: a navy tile with a chat bubble being filed into a manila folder.
// pad: transparent margin around the 96-unit art (16 for the 128px store icon, less for toolbar sizes).
function iconSvg(size, pad) {
  const s = (size - 2 * pad) / 96; // art drawn on a 96 grid
  const r = (size - 2 * pad) * 0.23; // same corner shape at every size
  const detail = size >= 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26325C"/><stop offset="1" stop-color="#141B34"/></linearGradient>
    <linearGradient id="front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1E3BD"/><stop offset="1" stop-color="#E2CE9C"/></linearGradient>
  </defs>
  <g transform="translate(${pad} ${pad}) scale(${s})">
    <rect x="0" y="0" width="96" height="96" rx="${r / s}" fill="url(#tile)"/>
    ${detail ? '<rect x="0.75" y="0.75" width="94.5" height="94.5" rx="' + (r / s - 0.75) + '" fill="none" stroke="#FFFFFF" stroke-opacity=".10" stroke-width="1.5"/>' : ''}
    <rect x="15" y="41" width="66" height="41" rx="8" fill="#C9B27A"/>
    <rect x="15" y="35" width="27" height="13" rx="6" fill="#C9B27A"/>
    <g transform="rotate(-8 48 30)">
      <rect x="23" y="11" width="52" height="33" rx="11" fill="#FBF6E9"/>
      <path d="M31 42 L27 54 L45 43 Z" fill="#FBF6E9"/>
      ${size >= 16 ? `<rect x="32" y="20" width="33" height="${detail ? 5.5 : 7}" rx="${detail ? 2.75 : 3.5}" fill="#161E38"/>` : ''}
      ${detail ? '<rect x="32" y="30" width="21" height="5.5" rx="2.75" fill="#161E38"/>' : ''}
    </g>
    <rect x="15" y="52" width="66" height="30" rx="8" fill="url(#front)"/>
    ${detail ? '<circle cx="70" cy="70" r="5" fill="#C45634"/>' : ''}
  </g>
</svg>`;
}
module.exports = { iconSvg };

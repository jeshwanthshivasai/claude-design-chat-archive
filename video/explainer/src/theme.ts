import { continueRender, delayRender, staticFile } from 'remotion';
import T from './timeline.json';

export const timeline = T;
export const C = {
  navy: '#161E38', navy2: '#222D52', navy3: '#2E3A66', navyDeep: '#0F1530', ink: '#1B2340',
  paper: '#FBF6E9', card: '#FFFCF3', manila: '#EAD9AE', manila2: '#E1CD99', manilaD: '#CDB884',
  rust: '#C45634', rustL: '#F0A285', soft: '#AEB5CC', soft2: '#5D6278', green: '#3E7B57', plum: '#4A2F3F',
  ui: '#1C1B19', ui2: '#262522', ui3: '#34322E', uiText: 'rgba(250,249,245,.92)', uiSoft: 'rgba(250,249,245,.56)', uiBtn: '#F0EEE6',
};
export const SERIF = '"Charis SIL", Charter, Georgia, serif';
export const SANS = '"Instrument Sans", system-ui, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, monospace';

const FACES: [string, string, string, string][] = [
  ['Charis SIL', 'fonts/charis-700.woff2', '700', 'normal'],
  ['Charis SIL', 'fonts/charis-400.woff2', '400', 'normal'],
  ['Charis SIL', 'fonts/charis-400i.woff2', '400', 'italic'],
  ['Instrument Sans', 'fonts/isans-400.woff2', '400', 'normal'],
  ['Instrument Sans', 'fonts/isans-500.woff2', '500', 'normal'],
  ['Instrument Sans', 'fonts/isans-600.woff2', '600', 'normal'],
  ['Instrument Sans', 'fonts/isans-700.woff2', '700', 'normal'],
  ['IBM Plex Mono', 'fonts/plex-500.woff2', '500', 'normal'],
];
let loading = false;
export function ensureFonts() {
  if (loading || typeof document === 'undefined') return;
  loading = true;
  const handle = delayRender('Loading fonts');
  Promise.all(FACES.map(([family, file, weight, style]) =>
    new FontFace(family, `url(${staticFile(file)}) format("woff2")`, { weight, style }).load().then((f) => (document.fonts as any).add(f))))
    .then(() => continueRender(handle))
    .catch((e) => { console.error(e); continueRender(handle); });
}

export const sceneOf = (id: string) => {
  const s = T.scenes.find((x) => x.id === id)!;
  return { from: s.from, dur: Math.round(s.bars * T.framesPerBar) };
};

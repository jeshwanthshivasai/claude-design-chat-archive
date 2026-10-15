// Renders review stills: node stills.mjs <Landscape|Portrait> <outDir> <frame> [frame...]
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'path';
const [comp, outDir, ...frames] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, inputProps: { mute: true } });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: path.join(outDir, `${comp}-${String(f).padStart(4, '0')}.png`), browserExecutable, inputProps: { mute: true }, scale: comp === 'Portrait' ? 0.5 : 0.5 });
  process.stdout.write(f + ' ');
}
console.log('done');

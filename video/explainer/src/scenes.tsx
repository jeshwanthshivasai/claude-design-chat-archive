import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, SANS, SERIF } from './theme';
import { Bubble, Chip, clamp, Cursor, ease, easeIn, FolderMark, Ruler, Scene, Shatter, Stamp, Typewriter, useLayout, useRamp, Words } from './primitives';
import { Browser, CaseStudy, ChatColumn, DesignCanvas, DesignToolbar, PromptCards, Reader, SaveButton, SidePanel, Toast, WrappedCard } from './ui';

const Para: React.FC<{ from: number; size: number; children: React.ReactNode; maxWidth?: number; align?: 'left' | 'center'; color?: string }> = ({ from, size, children, maxWidth, align = 'left', color = C.soft }) => {
  const p = useRamp(from, 18);
  return <div style={{ fontFamily: SANS, fontSize: size, lineHeight: 1.42, color, maxWidth, textAlign: align, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>{children}</div>;
};

// ============================================================ 1. the deadline
export const Deadline: React.FC<{ dur: number }> = ({ dur }) => {
  const { W, pad, portrait } = useLayout();
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ padding: `0 ${pad}px`, justifyContent: 'center', gap: portrait ? 56 : 44 }}>
        <Typewriter text="14 Dec 2026" from={10} size={portrait ? 150 : 170} />
        <Ruler width={W - pad * 2} from={44} len={52} height={portrait ? 130 : 120} labelSize={portrait ? 30 : 26} endLabel="Deleted" />
        <Words text="Claude Design’s own site closes." from={66} size={portrait ? 96 : 92} maxWidth={portrait ? 900 : undefined} />
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 2. what you lose
const LOSS: [('you' | 'claude'), string][] = [['you', 'Warm and tactile, no stock photos.'], ['claude', 'Here’s a first pass with a full-bleed hero.'], ['you', 'Too busy. Strip it back.'], ['claude', 'Simplified. One photo, one button.']];
export const Loss: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const { portrait, pad } = useLayout();
  const breakAt = 78;
  const bw = portrait ? 760 : 620, bs = portrait ? 34 : 30;
  const stack = (
    <div style={{ position: 'relative', width: bw, height: portrait ? 640 : 560 }}>
      {LOSS.map(([who, t], i) => {
        const p = spring({ frame: f - 8 - i * 6, fps, config: { damping: 15, stiffness: 120 } });
        const top = i * (portrait ? 150 : 132), left = who === 'you' ? bw * 0.18 : 0, w = bw * 0.82, h = portrait ? 126 : 112;
        const broken = f >= breakAt + i * 3;
        return (
          <div key={i} style={{ position: 'absolute', top, left, width: w, height: h, transform: `translateY(${(1 - p) * 40}px)`, opacity: p }}>
            {!broken ? <Bubble who={who} text={t} size={bs} width={w} style={{ height: h, boxSizing: 'border-box' }} />
              : <Shatter from={breakAt + i * 3} width={w} height={h} color={who === 'you' ? C.manila : C.navy3} seed={'b' + i} />}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '40%', textAlign: 'center', opacity: useRamp(breakAt + 30, 16) }}>
        <Chip bg="transparent" color={C.rustL} size={portrait ? 34 : 30} style={{ border: `3px solid ${C.rust}`, padding: '10px 22px', borderRadius: 12 }}>Deleted after 14 Dec</Chip>
      </div>
    </div>
  );
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ padding: `${portrait ? 230 : 0}px ${pad}px`, flexDirection: portrait ? 'column' : 'row', alignItems: portrait ? 'flex-start' : 'center', justifyContent: portrait ? 'flex-start' : 'space-between', gap: portrait ? 90 : 60 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: portrait ? 900 : 860 }}>
          <Words text="Your project files can be downloaded." from={6} size={portrait ? 64 : 64} color={C.soft} weight={400} />
          <Words text="Your chats can’t." from={30} size={portrait ? 132 : 128} />
        </div>
        {stack}
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 3. where the steering happened
export const Steering: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const { portrait, pad, W, H } = useLayout();
  const suck = interpolate(f, [104, 144], [0, 1], { ...clamp, easing: easeIn });
  const s = portrait ? 34 : 30;
  const spots = portrait
    ? [[pad, 640, -1.5], [pad + 120, 860, 1.2], [pad + 40, 1190, -1], [pad + 200, 1390, 1.5]]
    : [[820, 300, -1.5], [1170, 460, 1.4], [800, 690, -1], [1230, 830, 1.6]];
  const items = [
    <Bubble who="you" text="Warm and tactile. No stock photos." size={s} width={portrait ? 700 : 560} />,
    <Bubble who="claude" text="Tone?" size={s} width={portrait ? 720 : 560} label="Claude asked">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        <Chip size={s * 0.72} bg={C.manila}>✓ Earthy and calm</Chip><Chip size={s * 0.72} bg="rgba(255,255,255,.12)" color={C.paper}>Bright and playful</Chip><Chip size={s * 0.72} bg="rgba(255,255,255,.12)" color={C.paper}>Minimal</Chip>
      </div>
    </Bubble>,
    <Bubble who="you" text="Too busy. Strip it back." size={s} width={portrait ? 560 : 470} />,
    <Bubble who="you" text="More like handwritten price tags." size={s} width={portrait ? 680 : 560} />,
  ];
  return (
    <Scene dur={dur} exit="none">
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: pad, top: portrait ? 220 : 150, maxWidth: portrait ? 900 : 640, opacity: 1 - suck }}>
          <Words text="That’s where you steered every design." from={2} size={portrait ? 96 : 92} />
        </div>
        {items.map((el, i) => {
          const p = spring({ frame: f - 12 - i * 18, fps, config: { damping: 11, stiffness: 170, mass: 0.7 } });
          const [x, y, r] = spots[i];
          const cx = W / 2, cy = H * 0.62;
          const tx = (cx - x - 250) * suck, ty = (cy - y) * suck;
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: y, transform: `translate(${tx}px, ${ty}px) rotate(${r * (1 - suck)}deg) scale(${p * (1 - suck * 0.85)})`, opacity: p * (1 - suck * 0.9), transformOrigin: 'center' }}>{el}</div>
          );
        })}
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 4. the reveal
export const Lockup: React.FC<{ from: number; sub?: string; stampAt?: number; pill?: boolean; size?: number }> = ({ from, sub, stampAt, pill, size }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const { portrait } = useLayout();
  const drop = spring({ frame: f - from - 6, fps, config: { damping: 12, stiffness: 110, mass: 0.9 } });
  const pop = spring({ frame: f - from, fps, config: { damping: 14, stiffness: 160 } });
  const ts = size || (portrait ? 118 : 132);
  const pp = spring({ frame: f - from - 34, fps, config: { damping: 15, stiffness: 140 } });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: portrait ? 34 : 26 }}>
      <div style={{ transform: `scale(${pop})` }}><FolderMark size={portrait ? 250 : 220} drop={drop} /></div>
      <div style={{ position: 'relative' }}>
        <Words text="Design Chat Archive" from={from + 18} size={ts} align="center" maxWidth={portrait ? 880 : undefined} />
        {stampAt != null && <div style={{ position: 'absolute', right: portrait ? 10 : -70, top: portrait ? -86 : -70 }}><Stamp from={stampAt} size={portrait ? 40 : 38} /></div>}
      </div>
      {sub && <div style={{ marginTop: 4 }}><Words text={sub} from={from + 38} size={portrait ? 42 : 40} font={SANS} weight={500} color={C.soft} align="center" maxWidth={portrait ? 860 : 1300} stagger={1.5} /></div>}
      {pill && <div style={{ marginTop: 18, transform: `scale(${pp})`, opacity: pp }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: C.manila, color: C.navy, fontFamily: SANS, fontWeight: 700, fontSize: portrait ? 40 : 38, padding: '20px 36px', borderRadius: 999, boxShadow: '0 4px 0 #B9A472' }}>Free on the Chrome Web Store</span></div>}
    </div>
  );
};
export const Reveal: React.FC<{ dur: number }> = ({ dur }) => (
  <Scene dur={dur}>
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Lockup from={4} stampAt={54} sub="Saves your Claude Design chats before they’re deleted." />
    </AbsoluteFill>
  </Scene>
);

// ============================================================ 5. the side panel
const Caption: React.FC<{ lines: [number, number, string][]; size: number }> = ({ lines, size }) => {
  const f = useCurrentFrame();
  return <div style={{ position: 'relative', height: size * 2.4 }}>{lines.map(([a, b, t]) => (f >= a - 2 && f < b + 14) && <div key={t} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><Words text={t} from={a} out={b} size={size} /></div>)}</div>;
};
export const Panel: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { portrait, pad, W, H } = useLayout();
  const bw = portrait ? W - 2 * 50 : 1600, bh = portrait ? 1340 : 830;
  const bx = (W - bw) / 2, by = portrait ? 470 : 205;
  const contentH = bh - 44; const ps = contentH / 880; const pw = 430 * ps;
  const slide = interpolate(f, [40, 58], [pw + 20, 0], { ...clamp, easing: ease });
  const zoom = interpolate(f, [100, 126], [1, portrait ? 1.18 : 1.42], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const panelCx = bx + bw - pw / 2, panelCy = by + 44 + contentH / 2;
  const icon: [number, number] = [bx + bw - 62, by + 22];
  const btn: [number, number] = [bx + bw - pw + 215 * ps, by + 44 + 818 * ps];
  const runAt = 104;
  return (
    <Scene dur={dur}>
      <AbsoluteFill>
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${panelCx}px ${panelCy}px` }}>
          <div style={{ position: 'absolute', left: bx, top: by }}>
            <Browser w={bw} h={bh} iconGlow={interpolate(f, [30, 36, 50], [0, 1, 0], clamp)}>
              {!portrait && <ChatColumn w={330} />}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <DesignToolbar save={<SaveButton />} />
                <DesignCanvas w={portrait ? bw : bw - 330} h={contentH - 52} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: pw, height: contentH, transform: `translateX(${slide}px)`, boxShadow: '-20px 0 50px rgba(0,0,0,.4)' }}>
                  <div style={{ transform: `scale(${ps})`, transformOrigin: '0 0' }}><SidePanel runAt={runAt} doneAt={runAt + 72} stampAt={runAt + 72} press={100} /></div>
                </div>
              </div>
            </Browser>
          </div>
          <Cursor path={[[0, W * 0.6, H * 0.75], [34, icon[0], icon[1]], [62, icon[0] - 40, icon[1] + 140], [96, btn[0], btn[1]], [140, btn[0] + 30, btn[1] + 60]]} clicks={[36, 100]} scale={portrait ? 1.6 : 1.3} />
        </AbsoluteFill>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: portrait ? 470 : 200, background: `linear-gradient(${C.navy} 72%, rgba(22,30,56,0))`, opacity: interpolate(f, [100, 118], [0, 1], clamp) }} />
        <div style={{ position: 'absolute', left: pad, right: pad, top: portrait ? 190 : 56 }}>
          <Caption size={portrait ? 74 : 62} lines={[[4, 58, 'Click the icon. The side panel opens.'], [62, 98, 'Pick projects. Pick extras.'], [102, 230, 'Archive. One ZIP, every chat.']]} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 6. the in-page button
export const SaveBtn: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const { portrait, pad, W, H } = useLayout();
  const tw = portrait ? 520 : 900; const sc = portrait ? 1.86 : 1.9;
  const tx = (W - tw * sc) / 2, ty = portrait ? 620 : 330;
  const glow = interpolate(f, [10, 22, 40], [0, 1, 0.2], clamp);
  const state = f >= 60 && f < 80 ? 'busy' : f >= 44 && f < 60 ? 'hover' : 'idle';
  // Save chats sits just left of Share: Share (≈58) + gap + account (≈26) + padding from the right edge.
  const btnX = tx + (tw - 14 - 20 - 6 - 58 - 6 - 46) * sc, btnY = ty + 26 * sc;
  const toastP = spring({ frame: f - 78, fps, config: { damping: 15, stiffness: 130 } });
  return (
    <Scene dur={dur}>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: pad, right: pad, top: portrait ? 200 : 96 }}>
          <Words text="Or save one project from its own toolbar." from={4} size={portrait ? 84 : 76} maxWidth={portrait ? 900 : 1400} />
        </div>
        <div style={{ position: 'absolute', left: tx, top: ty, width: tw, transform: `scale(${sc})`, transformOrigin: '0 0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 30px 80px rgba(3,6,18,.55)' }}>
          <DesignToolbar save={<div style={{ transform: `scale(${spring({ frame: f - 8, fps, config: { damping: 10, stiffness: 180 } })})` }}><SaveButton state={state as any} glow={glow} /></div>} />
          <div style={{ height: portrait ? 300 : 170, overflow: 'hidden', opacity: 0.85 }}><DesignCanvas w={tw} h={portrait ? 300 : 260} /></div>
        </div>
        <Cursor path={[[0, W * 0.7, H * 0.9], [40, btnX + 10, btnY + 4], [70, btnX + 14, btnY + 8], [140, btnX - 60, btnY + 160]]} clicks={[60]} scale={portrait ? 1.6 : 1.4} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: portrait ? 260 : 80, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - toastP) * 120}px)`, opacity: toastP }}>
          <Toast scale={portrait ? 1.9 : 1.7} title="Saved 18 chats from Ceramics studio site" text="Unzip it and open index.html to read and search them. The case study is in the project folder." />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 7. case study (the signature feature)
export const CaseStudyScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { portrait, pad } = useLayout();
  const scroll = interpolate(f, [70, 144], [0, portrait ? 260 : 330], { ...clamp, easing: Easing.bezier(0.45, 0, 0.55, 1) });
  const enter = useRamp(4, 24);
  return (
    <Scene dur={dur}>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: pad, top: portrait ? 190 : 250, width: portrait ? 900 : 700, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Words text="Your process, written up as a case study." from={4} size={portrait ? 88 : 80} />
          <Para from={34} size={portrait ? 34 : 30} maxWidth={portrait ? 880 : 640}>The brief, every question Claude asked and what you answered, each change of direction, and what came out of it. A first draft for your portfolio, for every project.</Para>
        </div>
        <div style={{ position: 'absolute', left: portrait ? (1080 - 700 * 1.3) / 2 : 1000, top: portrait ? 800 : 90, transform: `translateY(${(1 - enter) * 300 - scroll}px) rotate(${portrait ? 0 : -1.2}deg) scale(${portrait ? 1.3 : 1})`, transformOrigin: '0 0', opacity: enter }}>
          <CaseStudy from={14} w={portrait ? 700 : 820} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 8. offline reader
export const ReaderScene: React.FC<{ dur: number }> = ({ dur }) => {
  const { portrait, pad, W } = useLayout(); const enter = useRamp(2, 22);
  const sc = portrait ? 1.42 : 1.33; const rw = portrait ? 648 : 1170, rh = portrait ? 900 : 594;
  return (
    <Scene dur={dur}>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: pad, right: pad, top: portrait ? 200 : 60 }}>
          <Words text="Read and search every chat. Offline." from={2} size={portrait ? 88 : 72} />
        </div>
        <div style={{ position: 'absolute', left: (W - rw * sc) / 2, top: portrait ? 500 : 215, transform: `translateY(${(1 - enter) * 160}px) scale(${sc})`, transformOrigin: '0 0', opacity: enter }}>
          <Reader w={rw} h={rh} typeAt={30} compact={portrait} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 9. prompt library
export const PromptsScene: React.FC<{ dur: number }> = ({ dur }) => {
  const { portrait, pad } = useLayout();
  const sc = portrait ? 1.42 : 1.3, cw = portrait ? 642 : 600;
  const cardX = portrait ? (1080 - cw * sc) / 2 : 1010, cardY = portrait ? 720 : 170;
  return (
    <Scene dur={dur}>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: pad, top: portrait ? 190 : 300, width: portrait ? 900 : 760, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Words text="Keep the prompts that worked." from={4} size={portrait ? 92 : 86} />
          <Para from={30} size={portrait ? 34 : 30} maxWidth={660}>Every prompt you wrote, with the ones that led to work you kept marked. Copy any of them straight back into Claude.</Para>
        </div>
        <div style={{ position: 'absolute', left: cardX, top: cardY, transform: `scale(${sc})`, transformOrigin: '0 0' }}><PromptCards from={14} copyAt={76} w={cw} /></div>
        <Cursor path={[[40, cardX + (cw + 60) * sc, cardY + 260 * sc], [70, cardX + (cw - 52) * sc, cardY + 30 * sc], [140, cardX + (cw - 120) * sc, cardY + 170 * sc]]} clicks={[76]} scale={portrait ? 1.6 : 1.3} />
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 10. Wrapped
export const WrappedScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const { portrait, pad } = useLayout();
  const p = spring({ frame: f - 8, fps, config: { damping: 14, stiffness: 90 } });
  const sc = portrait ? 0.74 : 0.61;
  return (
    <Scene dur={dur}>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: pad, top: portrait ? 190 : 330, width: portrait ? 900 : 760, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Words text="Your Claude Design, in numbers." from={4} size={portrait ? 92 : 86} />
          <Para from={30} size={portrait ? 34 : 30} maxWidth={640}>A card to share when the site closes. It never shows a project name.</Para>
        </div>
        <div style={{ position: 'absolute', left: portrait ? (1080 - 1080 * sc) / 2 : 1090, top: portrait ? 700 : 128, transform: `translateY(${(1 - p) * 500}px) rotate(${(1 - p) * 10 + (portrait ? 0 : 2.2)}deg)`, transformOrigin: 'center' }}>
          <div style={{ transform: `scale(${sc})`, transformOrigin: '0 0', width: 1080 * sc, height: 1350 * sc, boxShadow: '0 50px 100px rgba(3,6,18,.6)', borderRadius: 28 * sc }}><WrappedCard countFrom={16} /></div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 11. privacy
const Icon: React.FC<{ kind: 'server' | 'chart' | 'cloud'; size: number; color: string }> = ({ kind, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'server' && <><rect x="8" y="8" width="32" height="12" rx="3" /><rect x="8" y="28" width="32" height="12" rx="3" /><path d="M14 14h.01M14 34h.01" /></>}
    {kind === 'chart' && <><path d="M8 40h32" /><rect x="11" y="24" width="6" height="12" /><rect x="21" y="14" width="6" height="22" /><rect x="31" y="20" width="6" height="16" /></>}
    {kind === 'cloud' && <path d="M14 36h20a8 8 0 0 0 1-15.9A11 11 0 0 0 14 18a9 9 0 0 0 0 18z" />}
  </svg>
);
export const Privacy: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { portrait, W, H } = useLayout();
  const bw = portrait ? 760 : 700, bh = portrait ? 520 : 400;
  const cx = W / 2, cy = portrait ? H * 0.5 : H * 0.56;
  const targets: [number, number, 'server' | 'chart' | 'cloud'][] = portrait
    ? [[cx - 300, cy - 400, 'cloud'], [cx + 300, cy - 400, 'server'], [cx, cy + 430, 'chart']]
    : [[cx - 640, cy - 120, 'server'], [cx + 640, cy - 120, 'cloud'], [cx + 600, cy + 230, 'chart']];
  const draw = interpolate(f, [26, 56], [0, 1], { ...clamp, easing: ease });
  const cut = interpolate(f, [64, 80], [0, 1], { ...clamp, easing: ease });
  const enter = useRamp(0, 20);
  return (
    <Scene dur={dur}>
      <AbsoluteFill>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {targets.map(([tx, ty], i) => {
            const sx = cx + Math.sign(tx - cx) * (Math.abs(tx - cx) > 10 ? bw / 2 : 0), sy = Math.abs(tx - cx) > 10 ? cy : cy + Math.sign(ty - cy) * bh / 2;
            const ex = sx + (tx - sx) * draw * (1 - cut * 0.55), ey = sy + (ty - sy) * draw * (1 - cut * 0.55);
            const mx = sx + (tx - sx) * 0.5, my = sy + (ty - sy) * 0.5;
            return (
              <g key={i}>
                <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={C.soft} strokeWidth={4} strokeDasharray="10 12" opacity={0.7 * (1 - cut * 0.6)} />
                {cut > 0 && <g transform={`translate(${mx} ${my}) scale(${cut}) rotate(${cut * 90})`}><path d="M-22 -22 22 22M22 -22 -22 22" stroke={C.rust} strokeWidth={9} strokeLinecap="round" /></g>}
              </g>
            );
          })}
        </svg>
        {targets.map(([tx, ty, k], i) => (
          <div key={i} style={{ position: 'absolute', left: tx - 56, top: ty - 56, width: 112, height: 112, borderRadius: 28, border: `3px solid ${C.navy3}`, display: 'grid', placeItems: 'center', opacity: interpolate(f, [10 + i * 4, 24 + i * 4], [0, 1], clamp) * (1 - cut * 0.6), background: C.navy }}>
            <Icon kind={k} size={60} color={C.soft} />
          </div>
        ))}
        <div style={{ position: 'absolute', left: cx - bw / 2, top: cy - bh / 2, width: bw, height: bh, borderRadius: 26, border: `4px solid ${C.manila}`, background: C.navy, transform: `scale(${0.9 + 0.1 * enter})`, opacity: enter, overflow: 'hidden', boxShadow: `0 0 0 ${cut * 14}px rgba(234,217,174,.08)` }}>
          <div style={{ height: 46, borderBottom: `3px solid ${C.navy3}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px' }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: C.navy3 }} />)}<span style={{ marginLeft: 14, fontFamily: SANS, fontSize: 20, color: C.soft }}>Your browser</span></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34, height: bh - 50 }}>
            <FolderMark size={portrait ? 170 : 140} />
            <Chip size={portrait ? 30 : 26} mono bg={C.manila}>claude-design-chats.zip</Chip>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: portrait ? 220 : 86, display: 'flex', justifyContent: 'center' }}>
          <Words text="Nothing leaves your browser." from={4} size={portrait ? 96 : 96} align="center" maxWidth={portrait ? 900 : 1600} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: portrait ? 210 : 70, display: 'flex', justifyContent: 'center' }}>
          <Words text="No servers. No tracking. No account. Open source." from={84} size={portrait ? 40 : 40} font={SANS} weight={500} color={C.soft} align="center" maxWidth={portrait ? 860 : 1600} stagger={2} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ============================================================ 12. call to action
export const Cta: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { portrait, pad, W } = useLayout();
  const outA = interpolate(f, [92, 104], [0, 1], { ...clamp, easing: easeIn });
  return (
    <Scene dur={dur} exit="none">
      <AbsoluteFill>
        {f < 106 && (
          <AbsoluteFill style={{ padding: `0 ${pad}px`, justifyContent: 'center', gap: 50, opacity: 1 - outA, transform: `translateY(${-outA * 50}px)` }}>
            <Words text="Save your chats before 14 Dec." from={8} size={portrait ? 112 : 116} maxWidth={portrait ? 900 : 1700} />
            <Ruler width={W - pad * 2} from={20} len={50} height={portrait ? 130 : 120} labelSize={portrait ? 30 : 26} endLabel="Deleted" />
          </AbsoluteFill>
        )}
        {f >= 100 && (
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Lockup from={104} stampAt={114} pill />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </Scene>
  );
};

export const End: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame(); const { portrait } = useLayout();
  const fade = interpolate(f, [dur - 30, dur - 4], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Lockup from={-400} stampAt={-400} pill />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: portrait ? 150 : 64, textAlign: 'center', fontFamily: SANS, fontSize: portrait ? 28 : 24, color: C.soft, opacity: useRamp(8, 20) }}>Unofficial. Not made by or affiliated with Anthropic.</div>
      <AbsoluteFill style={{ background: C.navy, opacity: fade }} />
    </AbsoluteFill>
  );
};

import React from 'react';
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, MONO, SANS, SERIF } from './theme';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeIn = Easing.bezier(0.55, 0, 0.75, 0.2);

export function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return { W: width, H: height, portrait, pad: portrait ? 84 : 132 };
}

// A 0..1 ramp between two frames with the house easing.
export function useRamp(from: number, len: number, easing = ease) {
  const f = useCurrentFrame();
  return interpolate(f, [from, from + len], [0, 1], { ...clamp, easing });
}
export function useSpring(from: number, damping = 14, stiffness = 140, mass = 0.9) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - from, fps, config: { damping, stiffness, mass } });
}

// ------------------------------------------------------------ the ruled ledger paper behind everything
export const Ruled: React.FC<{ tone?: 'navy' | 'paper' }> = ({ tone = 'navy' }) => {
  const f = useCurrentFrame(); const { portrait } = useLayout();
  const gap = 54; const off = (f * 0.35) % gap;
  const line = tone === 'navy' ? C.navy2 : '#E7DCBF';
  return (
    <AbsoluteFill style={{ background: tone === 'navy' ? C.navy : C.paper }}>
      <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${gap - 2}px, ${line} ${gap - 2}px, ${line} ${gap}px)`, backgroundPosition: `0 ${-off}px` }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: portrait ? 52 : 92, width: 2, background: tone === 'navy' ? C.plum : '#E4B9A8' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(5,8,20,.45) 100%)' }} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ kinetic type: words rise out of a mask
export const Words: React.FC<{
  text: string; from: number; size: number; color?: string; font?: string; weight?: number; stagger?: number;
  out?: number; lh?: number; align?: 'left' | 'center'; italic?: boolean; style?: React.CSSProperties; maxWidth?: number; tracking?: number;
}> = ({ text, from, size, color = C.paper, font = SERIF, weight = 700, stagger = 3, out, lh = 1.08, align = 'left', italic, style, maxWidth, tracking = -0.01 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{ fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight: lh, display: 'flex', flexWrap: 'wrap', columnGap: size * 0.24, justifyContent: align === 'center' ? 'center' : 'flex-start', fontStyle: italic ? 'italic' : 'normal', letterSpacing: `${tracking}em`, maxWidth, ...style }}>
      {words.map((w, i) => {
        const p = spring({ frame: f - from - i * stagger, fps, config: { damping: 16, stiffness: 120, mass: 0.8 } });
        const o = out != null ? interpolate(f, [out + i * 1.5, out + 10 + i * 1.5], [0, 1], { ...clamp, easing: easeIn }) : 0;
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', padding: `0 0.04em ${size * 0.16}px`, margin: `0 -0.04em -${size * 0.16}px` }}>
            <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 105 - o * 110}%) rotate(${(1 - p) * 4}deg)`, transformOrigin: 'left bottom' }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------ typewriter with a block caret
export const Typewriter: React.FC<{ text: string; from: number; every?: number; size: number; color?: string; font?: string; weight?: number; caret?: boolean; style?: React.CSSProperties }> = ({ text, from, every = 3, size, color = C.manila, font = SERIF, weight = 700, caret = true, style }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((f - from) / every) + 1));
  const typing = f >= from && n < text.length;
  const blink = typing || Math.floor(f / 15) % 2 === 0;
  return (
    <div style={{ fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight: 1, whiteSpace: 'pre', ...style }}>
      {f < from ? '' : text.slice(0, n)}
      {caret && <span style={{ display: 'inline-block', width: size * 0.08, height: size * 0.82, marginLeft: size * 0.06, background: color, opacity: blink ? 1 : 0, verticalAlign: '-0.06em' }} />}
    </div>
  );
};

// ------------------------------------------------------------ the folder-and-bubble mark from the extension icon
export const FolderMark: React.FC<{ size: number; drop?: number; tilt?: number; style?: React.CSSProperties }> = ({ size, drop = 1, tilt = 0, style }) => {
  // drop: 0 = bubble hovering high above, 1 = filed in the folder
  const dy = (1 - drop) * -260; const rot = -7 + (1 - drop) * -18 + tilt;
  return (
    <svg viewBox="0 -300 512 812" width={size} height={size * 812 / 512} style={{ overflow: 'visible', ...style }}>
      <rect x="82" y="206" width="348" height="226" rx="34" fill={C.manilaD} />
      <rect x="82" y="178" width="140" height="52" rx="26" fill={C.manilaD} />
      <g transform={`translate(0 ${dy}) rotate(${rot} 260 150)`}>
        <rect x="128" y="58" width="264" height="156" rx="46" fill={C.paper} />
        <path d="M170 206 142 262 236 208z" fill={C.paper} />
        <rect x="172" y="100" width="180" height="26" rx="13" fill={C.navy} />
        <rect x="172" y="152" width="124" height="26" rx="13" fill={C.navy} />
      </g>
      <rect x="82" y="268" width="348" height="164" rx="34" fill={C.manila} />
    </svg>
  );
};

// ------------------------------------------------------------ rubber stamp that thunks down
export const Stamp: React.FC<{ text?: string; from: number; size: number; rot?: number; color?: string; style?: React.CSSProperties }> = ({ text = 'ARCHIVED', from, size, rot = -8, color = C.rust, style }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: f - from, fps, config: { damping: 9, stiffness: 260, mass: 0.7 } });
  const vis = f >= from;
  const scale = interpolate(p, [0, 1], [2.3, 1]);
  const shake = f >= from && f < from + 8 ? Math.sin((f - from) * 2.4) * (8 - (f - from)) * 0.6 : 0;
  return (
    <div style={{ display: 'inline-block', opacity: vis ? interpolate(p, [0, 0.25], [0, 1], clamp) : 0, transform: `translate(${shake}px, ${shake * 0.5}px) rotate(${rot + (1 - p) * -10}deg) scale(${scale})`, ...style }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: size, letterSpacing: '0.08em', color, border: `${Math.max(3, size * 0.11)}px solid ${color}`, borderRadius: size * 0.22, padding: `${size * 0.32}px ${size * 0.5}px ${size * 0.26}px`, lineHeight: 1, maskImage: 'radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,.82) 100%)' }}>{text}</div>
    </div>
  );
};

// ------------------------------------------------------------ mouse pointer with a click ripple
export const Cursor: React.FC<{ path: [number, number, number][]; clicks?: number[]; scale?: number }> = ({ path, clicks = [], scale = 1 }) => {
  const f = useCurrentFrame();
  const frames = path.map((p) => p[0]);
  const x = interpolate(f, frames, path.map((p) => p[1]), { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const y = interpolate(f, frames, path.map((p) => p[2]), { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const active = clicks.find((c) => f >= c && f < c + 16);
  const press = clicks.some((c) => f >= c && f < c + 5);
  const vis = interpolate(f, [frames[0], frames[0] + 6], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: vis, transform: `scale(${scale * (press ? 0.86 : 1)})`, transformOrigin: '0 0', zIndex: 50 }}>
      {active != null && (
        <div style={{ position: 'absolute', left: -28, top: -28, width: 56, height: 56, borderRadius: '50%', border: `3px solid ${C.manila}`, opacity: 1 - (f - active) / 16, transform: `scale(${0.3 + (f - active) / 10})` }} />
      )}
      <svg width="34" height="40" viewBox="0 0 34 40" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.45))' }}>
        <path d="M3 2 L3 32 L11 25 L16.5 37 L22 34.5 L16.6 23 L28 23 Z" fill="#FFFFFF" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// ------------------------------------------------------------ chat bubble
export const Bubble: React.FC<{ who: 'you' | 'claude'; text: string; size?: number; width?: number; children?: React.ReactNode; label?: string; style?: React.CSSProperties }> = ({ who, text, size = 30, width, children, label, style }) => {
  const you = who === 'you';
  return (
    <div style={{ width, background: you ? C.manila : C.navy3, color: you ? C.ink : C.paper, borderRadius: size * 0.9, borderBottomRightRadius: you ? size * 0.18 : size * 0.9, borderBottomLeftRadius: you ? size * 0.9 : size * 0.18, padding: `${size * 0.6}px ${size * 0.8}px`, fontFamily: SANS, fontSize: size, lineHeight: 1.3, fontWeight: 500, boxShadow: '0 18px 40px rgba(5,8,20,.35)', ...style }}>
      <div style={{ fontSize: size * 0.56, fontWeight: 700, opacity: 0.65, marginBottom: size * 0.2 }}>{label || (you ? 'You' : 'Claude')}</div>
      {text}
      {children}
    </div>
  );
};

// ------------------------------------------------------------ the day ruler: one tick per day left
export const Ruler: React.FC<{ width: number; days?: number; from: number; len?: number; height?: number; labelSize?: number; endLabel?: string; color?: string }> = ({ width, days = 60, from, len = 50, height = 120, labelSize = 26, endLabel = '14 Dec', color = C.soft }) => {
  const f = useCurrentFrame();
  const shown = interpolate(f, [from, from + len], [0, days], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const step = (width - 20) / days; const base = height - labelSize * 1.6;
  const start = new Date(2026, 9, 15);
  const ticks = [];
  for (let i = 0; i < days; i++) {
    if (i > shown) break;
    const d = new Date(start); d.setDate(start.getDate() + i);
    const month = d.getDate() === 1, week = d.getDay() === 1;
    const h = i === 0 ? base * 0.8 : month ? base * 0.72 : week ? base * 0.42 : base * 0.22;
    const a = Math.min(1, shown - i);
    ticks.push(<rect key={i} x={4 + i * step} y={base - h * a} width={i === 0 ? 4 : 2.5} height={h * a} fill={i === 0 ? C.manila : color} opacity={i === 0 ? 1 : week || month ? 0.85 : 0.45} />);
    if (month && i > 4) ticks.push(<text key={'m' + i} x={4 + i * step} y={labelSize} fontFamily={SANS} fontWeight={600} fontSize={labelSize} fill={color} textAnchor="middle" opacity={a}>{['Nov', 'Dec'][d.getMonth() - 10] || ''}</text>);
  }
  const endOn = shown >= days - 0.5;
  const pulse = endOn ? 1 + 0.15 * Math.sin((f - from - len) / 5) : 0;
  const xe = 4 + days * step;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {ticks}
      {endOn && <>
        <rect x={xe - 1.5} y={base - base * 0.3} width={3} height={base * 0.3} fill={C.rust} />
        <circle cx={xe} cy={base - base * 0.42} r={labelSize * 0.42 * pulse} fill={C.rust} />
        <text x={xe} y={height - 2} fontFamily={SANS} fontWeight={700} fontSize={labelSize} fill={C.rustL} textAnchor="end">{endLabel}</text>
      </>}
      <text x={0} y={height - 2} fontFamily={SANS} fontWeight={600} fontSize={labelSize} fill={color} opacity={shown > 0 ? 1 : 0}>Today</text>
    </svg>
  );
};

// ------------------------------------------------------------ counts up to a number
export const Count: React.FC<{ to: number; from: number; len?: number }> = ({ to, from, len = 30 }) => {
  const p = useRamp(from, len, Easing.bezier(0.16, 1, 0.3, 1));
  return <>{Math.round(to * p).toLocaleString('en')}</>;
};

// ------------------------------------------------------------ scene wrapper: soft exit so cuts never feel abrupt
export const Scene: React.FC<{ dur: number; children: React.ReactNode; exit?: 'up' | 'fade' | 'none' }> = ({ dur, children, exit = 'up' }) => {
  const f = useCurrentFrame();
  const o = exit === 'none' ? 0 : interpolate(f, [dur - 10, dur], [0, 1], { ...clamp, easing: easeIn });
  return <AbsoluteFill style={{ opacity: 1 - o, transform: exit === 'up' ? `translateY(${-o * 60}px)` : undefined }}>{children}</AbsoluteFill>;
};

// ------------------------------------------------------------ a manila sheet that slides across, like a file going in
export const ManilaWipe: React.FC<{ at: number; len?: number }> = ({ at, len = 18 }) => {
  const f = useCurrentFrame(); const { W, portrait } = useLayout();
  if (f < at - len || f > at + len) return null;
  const x = interpolate(f, [at - len, at + len], [W * 1.05, -W * 1.25], { ...clamp, easing: Easing.bezier(0.7, 0, 0.3, 1) });
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, zIndex: 100 }}>
      <div style={{ position: 'absolute', top: portrait ? 160 : 60, left: 0, width: portrait ? 300 : 360, height: 90, background: C.manila, borderRadius: '28px 28px 0 0' }} />
      <div style={{ position: 'absolute', top: portrait ? 240 : 140, bottom: -40, left: 0, width: W * 1.2, background: C.manila, borderRadius: '0 40px 0 0', boxShadow: '-30px 0 60px rgba(0,0,0,.35)' }} />
    </AbsoluteFill>
  );
};

// Deterministic particles for a bubble breaking up.
export const Shatter: React.FC<{ from: number; width: number; height: number; color: string; seed: string; cols?: number; rows?: number }> = ({ from, width, height, color, seed, cols = 14, rows = 5 }) => {
  const f = useCurrentFrame();
  const t = Math.max(0, f - from);
  const cw = width / cols, ch = height / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = `${seed}-${r}-${c}`;
    const delay = (c / cols) * 10 + random(k) * 6;
    const tt = Math.max(0, t - delay);
    const dx = (random(k + 'x') - 0.3) * tt * 6; const dy = tt * tt * 0.5 + random(k + 'y') * tt * 2;
    const o = interpolate(tt, [0, 22], [1, 0], clamp);
    cells.push(<div key={k} style={{ position: 'absolute', left: c * cw, top: r * ch, width: cw + 0.5, height: ch + 0.5, background: color, opacity: o, transform: `translate(${dx}px, ${dy}px) rotate(${tt * (random(k + 'r') - 0.5) * 12}deg)` }} />);
  }
  return <div style={{ position: 'absolute', inset: 0, width, height }}>{cells}</div>;
};

export const Chip: React.FC<{ children: React.ReactNode; bg?: string; color?: string; size?: number; mono?: boolean; style?: React.CSSProperties }> = ({ children, bg = C.manila, color = C.ink, size = 22, mono, style }) => (
  <span style={{ display: 'inline-block', background: bg, color, fontFamily: mono ? MONO : SANS, fontWeight: mono ? 500 : 600, fontSize: size, padding: `${size * 0.22}px ${size * 0.5}px`, borderRadius: size * 0.35, lineHeight: 1.2, ...style }}>{children}</span>
);

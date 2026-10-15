// Vector recreations of the product's screens, drawn at their real proportions. Dummy hobby projects only.
import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { C, MONO, SANS, SERIF } from './theme';
import { Chip, clamp, Count, ease, FolderMark, Stamp } from './primitives';

export const PROJECTS = [
  ['Ceramics studio site', 'Edited 12 Oct', 18],
  ['Weeknight recipe app', 'Edited 6 Oct', 23],
  ['Bookshop rebrand', 'Edited 2 Oct', 11],
  ['Trail map app', 'Edited 28 Sep', 16],
  ['Running club poster', 'Edited 30 Aug', 4],
  ['Wedding invite suite', 'Edited 21 Aug', 12],
] as const;

const Check: React.FC<{ on?: boolean; size?: number; dim?: boolean }> = ({ on = true, size = 18, dim }) => (
  <span style={{ width: size, height: size, borderRadius: 4, border: `2px solid ${C.ink}`, background: on ? C.ink : C.paper, display: 'inline-grid', placeItems: 'center', opacity: dim ? 0.5 : 1, flex: 'none' }}>
    {on && <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 12 12"><path d="M2.2 6.3 4.8 8.8 9.8 3.2" fill="none" stroke={C.paper} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
  </span>
);

const MiniRuler: React.FC<{ w: number }> = ({ w }) => {
  const n = 60, step = (w - 10) / n; const out = [];
  for (let i = 0; i < n; i++) { const h = i === 0 ? 20 : i % 7 === 4 ? 12 : i === 17 || i === 47 ? 18 : 7; out.push(<rect key={i} x={2 + i * step} y={26 - h} width={i ? 1.5 : 2.5} height={h} fill={i ? C.soft : C.manila} opacity={i ? (h > 7 ? 0.8 : 0.45) : 1} />); }
  return (<svg width={w} height={40}>{out}<circle cx={2 + n * step} cy={17} r={5} fill={C.rust} /><text x={0} y={39} fontFamily={SANS} fontSize={10.5} fontWeight={600} fill={C.soft}>Today</text><text x={w} y={39} fontFamily={SANS} fontSize={10.5} fontWeight={600} fill={C.rustL} textAnchor="end">14 Dec, deleted</text></svg>);
};

// ------------------------------------------------------------ the side panel
export const SidePanel: React.FC<{ runAt?: number; doneAt?: number; stampAt?: number; press?: number }> = ({ runAt = 1e9, doneAt = 1e9, stampAt = 1e9, press = -1 }) => {
  const f = useCurrentFrame();
  const phase = f >= doneAt ? 'done' : f >= runAt ? 'running' : 'ready';
  const pressed = press >= 0 && f >= press && f < press + 5;
  const sheet: React.CSSProperties = { background: C.manila, borderRadius: '0 12px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
  return (
    <div style={{ width: 430, height: 880, background: C.navy, color: C.ink, fontFamily: SANS, fontSize: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px', color: C.paper }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.soft, fontWeight: 600, fontSize: 13 }}><FolderMark size={20} />Design Chat Archive</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 25, lineHeight: 1.15, margin: '14px 0 6px' }}>Save your Claude Design chats before 14 Dec.</div>
        <div style={{ color: C.soft, fontSize: 13 }}>Its standalone site closes on 14 Dec 2026, and the chats there are deleted.</div>
        <div style={{ marginTop: 12 }}><MiniRuler w={394} /></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 10px 10px', minHeight: 0 }}>
        <div style={{ alignSelf: 'flex-start', background: C.manila, borderRadius: '10px 10px 0 0', padding: '9px 16px 5px', fontFamily: SERIF, fontWeight: 700, fontSize: 15 }}>{phase === 'ready' ? 'Your projects' : phase === 'running' ? 'Archiving' : 'Archived'}</div>
        <div style={sheet}>
          {phase === 'ready' && <>
            <div style={{ padding: '14px 14px 0', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Projects</span><span style={{ color: '#5C5338', fontWeight: 500, fontSize: 12.5, textDecoration: 'underline' }}>Select all&nbsp;&nbsp;Clear</span></div>
              <div style={{ marginTop: 10, background: C.paper, borderRadius: 8, boxShadow: `0 0 0 1px ${C.manilaD}, 2px 3px 0 ${C.manila2}` }}>
                {PROJECTS.map(([n, d], i) => (
                  <div key={n} style={{ display: 'flex', gap: 10, padding: '9px 12px', borderTop: i ? `1px solid #D9C590` : undefined }}>
                    <Check on /><div><div style={{ fontWeight: 600 }}>{n}</div><div style={{ fontSize: 12, color: '#5C5338' }}>{i === 0 && <span style={{ background: C.navy, color: C.manila, borderRadius: 4, padding: '0 6px', fontSize: 11, fontWeight: 700, marginRight: 6 }}>Open now</span>}{d}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ fontWeight: 600, marginTop: 18 }}>What goes in the archive</div>
              {[['Chat transcripts', 'Every message, question and answer.'], ['A case study for each project', 'Your brief, the decisions, the turns, what came out of it.'], ['Offline reader', 'Read and search every chat, no internet.'], ['Prompt library', 'With the prompts that worked marked.'], ['Wrapped card', 'Your Claude Design in numbers.']].map(([t, s], i) => (
                <div key={t} style={{ display: 'flex', gap: 10, padding: i === 1 ? '9px 10px' : '7px 4px', marginTop: 4, background: i === 1 ? C.paper : undefined, borderRadius: 8, boxShadow: i === 1 ? `0 0 0 1px ${C.manilaD}` : undefined }}>
                  <Check on dim={i === 0} /><div><div style={{ fontWeight: 600 }}>{t}</div><div style={{ fontSize: 12, color: '#5C5338' }}>{s}</div></div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #D9C590' }}>
              <div style={{ background: pressed ? C.navy3 : C.navy, color: C.paper, borderRadius: 10, padding: '12px 0', textAlign: 'center', fontWeight: 700, fontSize: 14.5, transform: pressed ? 'translateY(1px)' : undefined, boxShadow: pressed ? 'none' : '0 2px 0 #0B1022' }}>Archive all 6 projects</div>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#5C5338', marginTop: 8 }}>Downloads one ZIP. Nothing leaves this browser.</div>
            </div>
          </>}
          {phase === 'running' && (
            <div style={{ padding: '18px 16px' }}>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22 }}>Archiving 6 projects</div>
              <div style={{ color: '#5C5338', margin: '8px 0 12px', minHeight: 40 }}>Reading <b style={{ color: C.ink }}>{PROJECTS[Math.min(5, Math.max(0, Math.floor((f - runAt - 4) / 11)))][0]}</b></div>
              <div style={{ display: 'flex', gap: 3, height: 10 }}>{PROJECTS.map((_, i) => { const done = f >= runAt + 4 + (i + 1) * 11; const on = !done && f >= runAt + 4 + i * 11; return <i key={i} style={{ flex: 1, borderRadius: 2, background: done || on ? C.navy : C.manilaD, opacity: done ? 1 : on ? 0.5 : 0.55 }} />; })}</div>
              <div style={{ marginTop: 12, background: C.paper, borderRadius: 8, boxShadow: `0 0 0 1px ${C.manilaD}` }}>
                {PROJECTS.map(([n, , chats], i) => { const done = f >= runAt + 4 + (i + 1) * 11; const on = !done && f >= runAt + 4 + i * 11; return (
                  <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderTop: i ? '1px solid #D9C590' : undefined, fontSize: 13 }}><span>{n}</span><span style={{ color: done ? C.green : '#5C5338', fontWeight: done ? 600 : 400 }}>{done ? `${chats} chats` : on ? 'Reading…' : 'Waiting'}</span></div>); })}
              </div>
            </div>
          )}
          {phase === 'done' && (
            <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ alignSelf: 'flex-start', marginLeft: 4 }}><Stamp from={stampAt} size={15} rot={-6} /></div>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, lineHeight: 1.25 }}>84 chats saved from 6 projects.</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: C.paper, borderRadius: 8, padding: '10px 12px', boxShadow: `0 0 0 1px ${C.manilaD}` }}>
                <ZipGlyph size={28} /><div><div style={{ fontWeight: 600 }}>claude-design-chats-2026-10-15.zip</div><div style={{ fontSize: 12, color: '#5C5338' }}>4.2 MB, in your Downloads folder</div></div>
              </div>
              <div style={{ color: '#5C5338' }}>Unzip it and open <Chip size={12} mono bg={C.manila2}>index.html</Chip> to read and search every chat.</div>
              <div style={{ marginTop: 6, fontFamily: SERIF, fontWeight: 700, fontSize: 18 }}>Your Wrapped card</div>
              <div style={{ transform: 'scale(0.36)', transformOrigin: '0 0', height: 1350 * 0.36 }}><WrappedCard countFrom={stampAt} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ZipGlyph: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg viewBox="0 0 26 26" width={size} height={size}><rect x="3" y="7" width="20" height="16" rx="3" fill={C.manilaD} /><rect x="3" y="4.5" width="9" height="5" rx="2.2" fill={C.manilaD} /><rect x="3" y="10" width="20" height="13" rx="3" fill={C.navy} /><path d="M13 12.5v6m-2.6-2.6L13 18.5l2.6-2.6" stroke={C.manila} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// ------------------------------------------------------------ a project page in Claude Design (dark), with its toolbar
export const SaveButton: React.FC<{ state?: 'idle' | 'hover' | 'busy'; glow?: number }> = ({ state = 'idle', glow = 0 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px 0 9px', borderRadius: 8, border: `1px solid rgba(234,217,174,${state === 'hover' ? 0.6 : 0.3})`, background: state === 'hover' ? 'rgba(234,217,174,.12)' : 'transparent', color: C.uiText, fontFamily: SANS, fontWeight: 500, fontSize: 12, opacity: state === 'busy' ? 0.7 : 1, boxShadow: glow ? `0 0 0 ${glow * 6}px rgba(234,217,174,${0.25 * glow})` : undefined }}>
    <svg width="14" height="14" viewBox="0 0 16 16"><path d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h3.1l1.4 1.5H13c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25z" fill="none" stroke={C.manila} strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 6.6v4.1M6.2 9l1.8 1.8L9.8 9" fill="none" stroke={C.manila} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
    Save chats
  </div>
);

export const DesignToolbar: React.FC<{ save?: React.ReactNode; title?: string }> = ({ save, title = 'Ceramics studio site' }) => (
  <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: C.ui, borderBottom: '1px solid #2C2B28', fontFamily: SANS, color: C.uiText, fontSize: 13 }}>
    <div style={{ fontWeight: 600 }}>{title}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: C.uiSoft, fontSize: 12, fontWeight: 500, padding: '0 8px' }}>Comment</span>
      <span style={{ color: C.uiSoft, fontSize: 12, fontWeight: 500, padding: '0 10px' }}>Present</span>
      {save}
      <span style={{ height: 26, padding: '0 12px', borderRadius: 8, background: C.uiBtn, color: C.ui, fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>Share</span>
      <span style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #444', display: 'inline-grid', placeItems: 'center', fontSize: 10.5 }}>J</span>
    </div>
  </div>
);

// A small made-up design on the canvas: a ceramics studio landing page.
export const DesignCanvas: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <div style={{ width: w, height: h, background: '#2A2926', display: 'grid', placeItems: 'center' }}>
    <div style={{ width: w * 0.78, height: h * 0.82, background: '#F2E8DA', borderRadius: 6, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', fontFamily: SERIF, fontWeight: 700, color: '#4A2E22', fontSize: 16 }}>Kiln &amp; Co.<span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, letterSpacing: '.02em' }}>Classes&nbsp;&nbsp;Shop&nbsp;&nbsp;Visit</span></div>
      <div style={{ flex: 1, margin: '0 20px', borderRadius: 4, background: 'linear-gradient(160deg,#B8693F,#8C4529)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '52%', top: '24%', width: '30%', aspectRatio: '1', borderRadius: '50%', background: '#D9A27A', opacity: 0.85 }} />
        <div style={{ position: 'absolute', left: '44%', top: '48%', width: '46%', height: '26%', borderRadius: '40% 40% 12px 12px', background: '#E9C9A6', opacity: 0.9 }} />
        <div style={{ position: 'absolute', left: 22, bottom: 20, fontFamily: SERIF, fontWeight: 700, color: '#FBF1E4', fontSize: 30, lineHeight: 1.05 }}>Made by hand,<br />fired slowly.</div>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '14px 20px' }}>
        <span style={{ background: '#4A2E22', color: '#F2E8DA', fontFamily: SANS, fontSize: 11, fontWeight: 600, padding: '7px 12px', borderRadius: 999 }}>Book a class</span>
        <span style={{ fontFamily: SANS, fontSize: 11, color: '#4A2E22', padding: '7px 0' }}>Mugs, plates and glazes</span>
      </div>
    </div>
  </div>
);

export const ChatColumn: React.FC<{ w: number }> = ({ w }) => (
  <div style={{ width: w, background: C.ui, borderRight: '1px solid #2C2B28', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: SANS, fontSize: 12.5, color: C.uiText }}>
    {[['you', 'Too busy. Strip it back: one photo of hands on clay and a single “Book a class” button.'], ['claude', 'Simplified the hero and moved classes below the fold.'], ['you', 'Better. Add a booking section with three class types and prices in rupees.'], ['claude', 'Added the booking section with a weekday and weekend toggle.']].map(([who, t], i) => (
      <div key={i} style={{ alignSelf: who === 'you' ? 'flex-end' : 'flex-start', maxWidth: '88%', background: who === 'you' ? C.ui3 : 'transparent', borderRadius: 10, padding: who === 'you' ? '8px 11px' : '2px 0', lineHeight: 1.45, color: who === 'you' ? C.uiText : C.uiSoft }}>{t}</div>
    ))}
    <div style={{ marginTop: 'auto', border: '1px solid #3A3833', borderRadius: 12, padding: '10px 12px', color: C.uiSoft }}>Reply to Claude…</div>
  </div>
);

// ------------------------------------------------------------ browser chrome (generic, not any real browser's branding)
export const Browser: React.FC<{ w: number; h: number; children: React.ReactNode; iconGlow?: number; url?: string }> = ({ w, h, children, iconGlow = 0, url = 'claude.ai/design/p/ceramics-studio' }) => (
  <div style={{ width: w, height: h, borderRadius: 14, overflow: 'hidden', background: '#202124', boxShadow: '0 40px 90px rgba(3,6,18,.55), 0 0 0 1px rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: '#2B2C30' }}>
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.85 }} />)}
      <div style={{ marginLeft: 14, height: 30, flex: 1, borderRadius: 15, background: '#1D1E21', color: '#C8CBD2', fontFamily: SANS, fontSize: 13.5, display: 'flex', alignItems: 'center', padding: '0 14px' }}>{url}</div>
      <div style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: iconGlow ? `rgba(234,217,174,${0.18 * iconGlow})` : 'transparent', boxShadow: iconGlow ? `0 0 0 ${2 * iconGlow}px rgba(234,217,174,${0.5 * iconGlow})` : undefined }}><FolderMark size={20} /></div>
      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3h7z" fill="#9AA0A6" /></svg>
    </div>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>{children}</div>
  </div>
);

// ------------------------------------------------------------ in-page toast
export const Toast: React.FC<{ title: string; text: string; scale?: number }> = ({ title, text, scale = 1 }) => (
  <div style={{ width: 440 * scale, display: 'grid', gridTemplateColumns: `${28 * scale}px 1fr`, gap: 12 * scale, padding: `${14 * scale}px ${16 * scale}px`, borderRadius: 14 * scale, background: C.navy, color: C.paper, boxShadow: `0 18px 50px rgba(0,0,0,.45), 0 0 0 1px rgba(234,217,174,.2)`, fontFamily: SANS, fontSize: 13 * scale }}>
    <span style={{ width: 28 * scale, height: 28 * scale, borderRadius: 7 * scale, background: C.manila, display: 'grid', placeItems: 'center' }}><svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16"><path d="M1.75 4.25c0-.69.56-1.25 1.25-1.25h3.1l1.4 1.5H13c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25z" fill="none" stroke={C.navy} strokeWidth="1.4" /><path d="M8 6.6v4.1M6.2 9l1.8 1.8L9.8 9" fill="none" stroke={C.navy} strokeWidth="1.4" strokeLinecap="round" /></svg></span>
    <div><div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14.5 * scale, marginBottom: 2 * scale }}>{title}</div><div style={{ color: '#C9CEDF', lineHeight: 1.4 }}>{text}</div></div>
  </div>
);

// ------------------------------------------------------------ case study page
export const CaseStudy: React.FC<{ from: number; w?: number }> = ({ from, w = 820 }) => {
  const f = useCurrentFrame();
  const show = (at: number) => { const p = interpolate(f, [from + at, from + at + 14], [0, 1], { ...clamp, easing: ease }); return { opacity: p, transform: `translateY(${(1 - p) * 18}px)` }; };
  const rows: [string, string, React.ReactNode][] = [
    ['2 Sep', '09:00', <><b>The brief went in.</b> A landing page for a small ceramics studio. Warm, tactile, no stock photos.</>],
    ['', '09:01', <><b>Claude asked: Direction</b><div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2px 14px', marginTop: 4 }}><span style={{ color: C.soft2 }}>Tone</span><b>Earthy and calm</b><span style={{ color: C.soft2 }}>Typeface feel</span><b>A serif with some grit</b></div></>],
    ['', '10:00', <><b style={{ color: C.rust }}>You changed direction</b><div style={{ background: '#FFFFFF99', borderRadius: 6, padding: '6px 10px', marginTop: 4, fontFamily: SERIF }}>Too busy. Strip it back: one photo of hands on clay.</div></>],
    ['11 Sep', '02:30', <><b style={{ color: C.rust }}>You changed direction</b><div style={{ background: '#FFFFFF99', borderRadius: 6, padding: '6px 10px', marginTop: 4, fontFamily: SERIF }}>More like handwritten price tags tied with string.</div></>],
  ];
  return (
    <div style={{ width: w, background: '#F7F1E3', color: C.ink, borderRadius: 10, padding: '56px 60px 70px', fontFamily: SANS, boxShadow: '0 40px 90px rgba(3,6,18,.5)' }}>
      <div style={{ ...show(0), fontFamily: SERIF, fontWeight: 700, fontSize: 56, lineHeight: 1.02, letterSpacing: '-0.015em' }}>Ceramics studio site</div>
      <div style={{ ...show(6), color: C.soft2, fontSize: 18, margin: '14px 0 28px' }}>Designed with Claude, 2 Sep to 11 Sep 2026. 4 conversations, 7 working days.</div>
      <div style={{ ...show(12), display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: `2px solid ${C.ink}`, borderBottom: '1px solid #E0D3B4' }}>
        {[[48, 'messages from you'], [9, 'decisions answered'], [6, 'changes of direction'], [14, 'files made']].map(([n, l]) => (
          <div key={l as string} style={{ padding: '12px 0 14px' }}><div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34 }}><Count to={n as number} from={from + 14} len={34} /></div><div style={{ fontSize: 13.5, color: C.soft2 }}>{l}</div></div>
        ))}
      </div>
      <div style={{ ...show(26), fontFamily: SERIF, fontWeight: 700, fontSize: 28, margin: '40px 0 14px' }}>The brief</div>
      <div style={{ ...show(30), borderLeft: `4px solid ${C.rust}`, paddingLeft: 22, fontFamily: SERIF, fontSize: 21, lineHeight: 1.5 }}>Design a landing page for a small ceramics studio in Bangalore. Warm and tactile, no stock photos, room for class bookings.</div>
      <div style={{ ...show(44), fontFamily: SERIF, fontWeight: 700, fontSize: 28, margin: '40px 0 10px' }}>How it took shape</div>
      {rows.map(([d, t, body], i) => (
        <div key={i} style={{ ...show(50 + i * 9), display: 'grid', gridTemplateColumns: '86px 52px 1fr', gap: 10, padding: '9px 0', borderTop: d ? '1px solid #E0D3B4' : undefined, fontSize: 15.5, lineHeight: 1.5 }}>
          <span style={{ color: C.soft2, fontWeight: 600, fontSize: 14 }}>{d}</span><span style={{ fontFamily: MONO, fontSize: 12, color: C.soft2, paddingTop: 3 }}>{t}</span><div>{body}</div>
        </div>
      ))}
    </div>
  );
};

// ------------------------------------------------------------ offline reader
export const Reader: React.FC<{ w: number; h: number; typeAt: number; query?: string; compact?: boolean }> = ({ w, h, typeAt, query = 'price tags', compact }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(query.length, Math.floor((f - typeAt) / 3) + 1));
  const typed = f >= typeAt ? query.slice(0, n) : '';
  const results = f >= typeAt + query.length * 3 + 4;
  const open = f >= typeAt + query.length * 3 + 34;
  const rp = interpolate(f, [typeAt + query.length * 3 + 4, typeAt + query.length * 3 + 18], [0, 1], { ...clamp, easing: ease });
  const hl = (s: string) => { const i = s.toLowerCase().indexOf('price tags'); return i < 0 ? s : <>{s.slice(0, i)}<mark style={{ background: '#F2C14E', borderRadius: 3, padding: '0 2px' }}>{s.slice(i, i + 10)}</mark>{s.slice(i + 10)}</>; };
  const msgs: [string, string][] = [['you', 'Now a shop page for mugs and plates. Grid of products, each with glaze name and price.'], ['claude', 'Shop grid done. Twelve products, three glazes.'], ['you', 'Make the cards less generic, more like handwritten price tags tied with string.'], ['claude', 'Reworked the cards as tags, with the price in a hand-drawn ring.']];
  return (
    <div style={{ width: w, height: h, borderRadius: 14, overflow: 'hidden', background: '#F7F1E3', display: 'flex', flexDirection: 'column', fontFamily: SANS, color: C.ink, boxShadow: '0 40px 90px rgba(3,6,18,.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: C.navy, color: C.paper }}>
        {!compact && <b style={{ fontFamily: SERIF, fontSize: 19, whiteSpace: 'nowrap' }}>Design Chat Archive</b>}
        <div style={{ flex: 1, maxWidth: 560, background: C.navyDeep, border: '1px solid #39446E', borderRadius: 9, padding: '10px 14px', fontSize: 16, color: typed ? C.paper : '#8F97B3' }}>{typed || 'Search every chat'}<span style={{ display: 'inline-block', width: 2, height: 18, background: C.paper, marginLeft: 2, verticalAlign: -3, opacity: f >= typeAt && !results ? 1 : 0 }} /></div>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {!compact && (
          <div style={{ width: 250, borderRight: '1px solid #E0D3B4', padding: '16px 10px', fontSize: 15 }}>
            {['Overview', 'Prompt library'].map((t, i) => <div key={t} style={{ padding: '8px 10px', borderRadius: 8, background: i === 0 && !open ? C.manila : undefined }}>{t}</div>)}
            <div style={{ fontSize: 12, fontWeight: 600, color: C.soft2, margin: '16px 10px 6px' }}>Projects</div>
            {PROJECTS.slice(0, 5).map(([p, , c], i) => <div key={p} style={{ padding: '7px 10px', borderRadius: 8, background: open && i === 0 ? C.manila : undefined }}>{p}<div style={{ fontSize: 12, color: C.soft2 }}>{c} chats</div></div>)}
          </div>
        )}
        <div style={{ flex: 1, padding: compact ? '22px 22px' : '30px 44px', position: 'relative', overflow: 'hidden' }}>
          {!results && <>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: compact ? 34 : 40 }}>Your Claude Design archive</div>
            <div style={{ color: C.soft2, margin: '8px 0 20px' }}>6 projects, 84 chats, every message in order.</div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 12 }}>{PROJECTS.slice(0, compact ? 3 : 4).map(([p, d, c]) => <div key={p} style={{ background: C.card, border: '1px solid #E0D3B4', borderRadius: 12, padding: 16 }}><b style={{ fontFamily: SERIF, fontSize: 19 }}>{p}</b><div style={{ color: C.soft2, fontSize: 14 }}>{c} chats, {d.toLowerCase()}</div></div>)}</div>
          </>}
          {results && !open && (
            <div style={{ opacity: rp, transform: `translateY(${(1 - rp) * 16}px)` }}>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: compact ? 30 : 36, marginBottom: 14 }}>3 results for “price tags”</div>
              {[['Ceramics studio site → Shop page, You', 'Make the cards less generic, more like handwritten price tags tied with string.'], ['Ceramics studio site → Shop page, Claude', 'Reworked the cards as price tags, with the price in a hand-drawn ring.'], ['Bookshop rebrand → Shelf labels, You', 'Use the same price tags idea for the shelf labels.']].map(([a, b], i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${i === 0 ? C.ink : '#E0D3B4'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}><div style={{ fontSize: 13, color: C.soft2 }}>{a}</div><div style={{ fontSize: 16 }}>{hl(b)}</div></div>
              ))}
            </div>
          )}
          {open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: compact ? 30 : 36 }}>Ceramics studio site</div>
              {msgs.map(([who, t], i) => (
                <div key={i} style={{ alignSelf: who === 'you' ? 'flex-end' : 'stretch', marginLeft: who === 'you' ? 60 : 0, background: who === 'you' ? '#EFE3C2' : C.card, border: who === 'you' ? 'none' : '1px solid #E0D3B4', borderRadius: 14, padding: '12px 16px', outline: i === 2 ? `3px solid ${C.rust}` : undefined, outlineOffset: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{who === 'you' ? 'You' : 'Claude'} <span style={{ fontWeight: 400, color: C.soft2 }}>11 Sep 2026</span></div>
                  <div style={{ fontSize: 16 }}>{i === 2 ? hl(t) : t}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------ prompt library cards
export const PromptCards: React.FC<{ from: number; copyAt: number; w?: number }> = ({ from, copyAt, w = 760 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const items: [boolean, string, string][] = [
    [true, 'Make the cards less generic, more like handwritten price tags tied with string.', 'Ceramics studio site, 11 Sep'],
    [true, 'Swap the picker for a camera: let me scan the fridge shelf and suggest three 20-minute dinners.', 'Weeknight recipe app, 21 Sep'],
    [false, 'Try a brutalist grid with oversized numbers.', 'Running club poster, 30 Aug'],
    [true, 'Use the trail colours from the park signage, and make the elevation chart the hero.', 'Trail map app, 26 Sep'],
  ];
  return (
    <div style={{ width: w, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map(([kept, text, meta], i) => {
        const p = spring({ frame: f - from - i * 7, fps, config: { damping: 15, stiffness: 120 } });
        const copied = i === 0 && f >= copyAt;
        return (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: '16px 20px', borderLeft: `6px solid ${kept ? C.green : '#D6CBB0'}`, boxShadow: '0 20px 50px rgba(3,6,18,.35)', transform: `translateX(${(1 - p) * 80}px) rotate(${(1 - p) * 2}deg)`, opacity: p, color: C.ink, fontFamily: SANS }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <b style={{ fontSize: 15, color: kept ? C.green : C.soft2 }}>{kept ? 'Kept' : 'Tried'}</b><span style={{ flex: 1, fontSize: 13.5, color: C.soft2 }}>{meta}</span>
              <span style={{ fontSize: 13.5, border: '1px solid #E0D3B4', borderRadius: 7, padding: '3px 11px', background: copied ? C.ink : 'transparent', color: copied ? C.paper : C.ink, fontWeight: 600 }}>{copied ? 'Copied' : 'Copy'}</span>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.45, opacity: kept ? 1 : 0.6 }}>{text}</div>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------ the Wrapped card, as drawn by wrapped.js (1080x1350)
export const WrappedCard: React.FC<{ countFrom: number; words?: boolean }> = ({ countFrom, words }) => {
  const W = 1080, H = 1350;
  const cells: [number, string][] = [[6, 'projects'], [84, 'conversations'], [212, 'decisions answered'], [57, 'changes of direction'], [431, 'files made'], [388, 'messages in my longest chat']];
  return (
    <div style={{ width: W, height: H, position: 'relative', background: C.navy, overflow: 'hidden', borderRadius: 28, fontFamily: SANS }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 52px, ${C.navy2} 52px, ${C.navy2} 54px)` }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 96, width: 2, background: C.plum }} />
      <div style={{ position: 'absolute', left: 128, top: 70 }}><FolderMark size={120} /></div>
      <div style={{ position: 'absolute', right: 120, top: 126 }}><Stamp from={countFrom + 6} size={44} /></div>
      <div style={{ position: 'absolute', left: 128, top: 262, fontFamily: SERIF, fontWeight: 700, fontSize: 84, lineHeight: 1.12, color: C.paper }}>My Claude Design,<br /><span style={{ color: C.manila }}>archived.</span></div>
      <div style={{ position: 'absolute', left: 120, top: 470, fontFamily: SERIF, fontWeight: 700, fontSize: 210, lineHeight: 1, color: C.paper }}><Count to={2431} from={countFrom} len={40} /></div>
      <div style={{ position: 'absolute', left: 132, top: 688, fontSize: 34, fontWeight: 500, color: C.soft }}>messages I sent while designing</div>
      <div style={{ position: 'absolute', left: 128, top: 782, width: 812, height: 2, background: C.manilaD }} />
      {cells.map(([n, l], i) => (
        <div key={l} style={{ position: 'absolute', left: 128 + (i % 3) * 280, top: 800 + Math.floor(i / 3) * 128 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 58, color: C.paper, lineHeight: 1.1 }}><Count to={n} from={countFrom + 8 + i * 3} len={30} /></div>
          <div style={{ fontSize: 24, fontWeight: 500, color: C.soft, marginTop: 4 }}>{l}</div>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 128, top: 1056, fontFamily: SERIF, fontStyle: 'italic', fontSize: 32, color: C.paper }}>Busiest day: 2 Sep, most often around 11 pm,<br />98 days from first chat to last.</div>
      {words && <div style={{ position: 'absolute', left: 128, top: 1166, display: 'flex', gap: 14 }}>{['spacing', 'warmer', 'hero', 'grid', 'serif'].map((w) => <span key={w} style={{ background: C.manila, color: C.ink, borderRadius: 26, padding: '9px 20px', fontSize: 28, fontWeight: 600 }}>{w}</span>)}</div>}
      <div style={{ position: 'absolute', left: 128, top: 1240, fontSize: 24, fontWeight: 500, color: C.soft, lineHeight: 1.5 }}>Saved with Design Chat Archive, free on the Chrome Web Store.<br />Claude Design’s standalone site closes on 14 Dec 2026.</div>
    </div>
  );
};

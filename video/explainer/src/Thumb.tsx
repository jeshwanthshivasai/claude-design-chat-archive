import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, ensureFonts, SANS, SERIF } from './theme';
import { FolderMark, Ruled, Ruler, Stamp } from './primitives';

ensureFonts();

// YouTube thumbnail, 1280x720: the deadline and the archive in one frame.
export const Thumb: React.FC = () => (
  <AbsoluteFill>
    <Ruled />
    <div style={{ position: 'absolute', left: 92, top: 92, width: 780 }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 104, lineHeight: 0.98, color: C.paper, letterSpacing: '-0.015em' }}>Save your Claude Design chats</div>
      <div style={{ marginTop: 26, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: C.rustL }}>before they’re deleted on 14 Dec</div>
      <div style={{ marginTop: 36 }}><Ruler width={720} from={-200} len={1} height={92} labelSize={24} endLabel="Deleted" /></div>
    </div>
    <div style={{ position: 'absolute', right: 70, top: 150 }}><FolderMark size={330} drop={0.55} tilt={6} /></div>
    <div style={{ position: 'absolute', right: 70, bottom: 120 }}><Stamp from={-100} size={44} rot={-9} /></div>
  </AbsoluteFill>
);

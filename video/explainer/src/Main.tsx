import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { ensureFonts, sceneOf, timeline } from './theme';
import { ManilaWipe, Ruled } from './primitives';
import { CaseStudyScene, Cta, Deadline, End, Loss, Panel, PromptsScene, ReaderScene, Reveal, SaveBtn, Steering, WrappedScene, Privacy } from './scenes';

ensureFonts();

const SCENES: Record<string, React.FC<{ dur: number }>> = {
  deadline: Deadline, loss: Loss, steering: Steering, reveal: Reveal, panel: Panel, savebtn: SaveBtn,
  casestudy: CaseStudyScene, reader: ReaderScene, prompts: PromptsScene, wrapped: WrappedScene, privacy: Privacy, cta: Cta, end: End,
};

export const Main: React.FC<{ mute?: boolean }> = ({ mute }) => (
  <AbsoluteFill style={{ background: '#161E38' }}>
    <Ruled />
    {timeline.scenes.map((s) => {
      const { from, dur } = sceneOf(s.id);
      const Comp = SCENES[s.id];
      return <Sequence key={s.id} from={from} durationInFrames={dur} name={s.id}><Comp dur={dur} /></Sequence>;
    })}
    <ManilaWipe at={432} />
    <ManilaWipe at={1656} />
    {!mute && <Audio src={staticFile('soundtrack.wav')} />}
  </AbsoluteFill>
);

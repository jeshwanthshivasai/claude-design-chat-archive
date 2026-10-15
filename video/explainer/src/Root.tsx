import React from 'react';
import { Composition, Still } from 'remotion';
import { Thumb } from './Thumb';
import { Main } from './Main';
import { timeline } from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="Landscape" component={Main} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={1920} height={1080} defaultProps={{ mute: false }} />
    <Composition id="Portrait" component={Main} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={1080} height={1920} defaultProps={{ mute: false }} />
    <Still id="Thumbnail" component={Thumb} width={1280} height={720} />
  </>
);

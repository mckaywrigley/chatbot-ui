import React, { FC, memo } from 'react';

interface Props {
  audioURL?: string;
}

const AudioPlayer: FC<Props> = memo(({ audioURL }) => {
  return (
    <div>
      <audio controls>
        <source src={audioURL} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
});

export default AudioPlayer;

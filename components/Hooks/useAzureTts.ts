import { useMemo, useState } from 'react';

import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

let player = new sdk.SpeakerAudioDestination();

export const useAzureTts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  player.onAudioStart = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  player.onAudioEnd = () => {
    setIsPlaying(false);
  }

  const stopPlaying = () => {
    player.pause();
    setIsPlaying(false);
    player = new sdk.SpeakerAudioDestination();
  };
  
  const speak = (text: string, token: string, region: string) => {
    const audioConfig  = sdk.AudioConfig.fromSpeakerOutput(player);
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);

    speechConfig.speechSynthesisVoiceName = 'zh-TW-HsiaoChenNeural';

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    setIsLoading(true);
    synthesizer.speakTextAsync(
      text,
      () => {
        synthesizer.close();
      },
      (error) => {
        console.error(error);
        setIsLoading(false);
        synthesizer.close();
      },
    );
  };

  return { isLoading, isPlaying, speak, stopPlaying };
};

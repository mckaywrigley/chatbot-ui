import { useContext, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import HomeContext from '@/pages/api/home/home.context';

import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

var speechPlayer = new sdk.SpeakerAudioDestination();

export const useAzureTts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const token = useRef();
  const region = useRef();

  const {
    state: { speechToken, speechRegion },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  speechPlayer.onAudioStart = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  speechPlayer.onAudioEnd = () => {
    setIsPlaying(false);
    setIsLoading(false);
  };

  const fetchTokenIfNeeded = async () => {
    if (!speechToken || !speechRegion) {
      try {
        const response = await fetch('/api/getSpeechToken');
        const responseJson = await response.json();
        token.current = responseJson.token;
        region.current = responseJson.region;

        homeDispatch({
          field: 'speechToken',
          value: responseJson.token,
        });
        homeDispatch({
          field: 'speechRegion',
          value: responseJson.region,
        });
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    }
  };

  const stopPlaying = () => {
    console.log('stop playing triggered');
    
    speechPlayer.pause();
    setIsPlaying(false);
  };

  const speak = async (text: string, speechId: string) => {
    stopPlaying();
    speechPlayer.close();
    speechPlayer = new sdk.SpeakerAudioDestination();

    await fetchTokenIfNeeded();

    const toUseToken = token.current || speechToken;
    const toUseRegion = region.current || speechRegion;

    if (!toUseToken || !toUseRegion) {
      toast.error(
        'This feature is not available at the moment. Please try again later.',
      );
      return;
    }

    const audioConfig = sdk.AudioConfig.fromSpeakerOutput(speechPlayer);
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
      toUseToken,
      toUseRegion,
    );

    // Default to use Mandarin voice, since it can also handle English fairly well
    speechConfig.speechSynthesisVoiceName = 'zh-TW-HsiaoChenNeural';

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    setIsLoading(true);

    console.log('update current speech id', speechId);

    homeDispatch({
      field: 'currentSpeechId',
      value: speechId,
    });

    synthesizer.speakTextAsync(
      text,
      () => {
        setIsLoading(false);
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

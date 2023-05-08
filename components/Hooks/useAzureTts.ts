import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import {
  AudioConfig,
  SpeakerAudioDestination,
  SpeechConfig,
  SpeechSynthesizer,
} from 'microsoft-cognitiveservices-speech-sdk';

export const useAzureTts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeechId, setCurrentSpeechId] = useState<string | null>(null);
  const token = useRef();
  const region = useRef();
  const player = useRef(new SpeakerAudioDestination());

  player.current.onAudioStart = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  player.current.onAudioEnd = () => {
    setIsPlaying(false);
    setIsLoading(false);
  };

  const fetchTokenIfNeeded = async (userToken: string) => {
    if (!token.current || !region.current) {
      try {
        const response = await fetch('/api/getSpeechToken', {
          headers: {
            'user-token': userToken,
          },
        });
        const responseJson = await response.json();
        token.current = responseJson.token;
        region.current = responseJson.region;
      } catch (error) {
        setIsLoading(false);
        console.error('Error fetching token:', error);
      }
    }
  };

  const stopPlaying = () => {
    player.current.pause();
    player.current.close();
    player.current = new SpeakerAudioDestination();
    setIsPlaying(false);
  };

  const displayErrorToast = () =>
    toast.error(
      'This feature is not available at the moment. Please try again later.',
    );

  const speak = async (text: string, speechId: string, userToken: string) => {
    try {
      stopPlaying();

      setCurrentSpeechId(speechId);
      setIsLoading(true);

      await fetchTokenIfNeeded(userToken);

      const toUseToken = token.current;
      const toUseRegion = region.current;

      if (!toUseToken || !toUseRegion) {
        displayErrorToast();
        return;
      }

      const audioConfig = AudioConfig.fromSpeakerOutput(player.current);
      const speechConfig = SpeechConfig.fromAuthorizationToken(
        toUseToken,
        toUseRegion,
      );

      // Default to use Mandarin voice, since it can also handle English fairly well
      speechConfig.speechSynthesisVoiceName = 'zh-TW-HsiaoChenNeural';
      const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

      synthesizer.speakTextAsync(
        text,
        () => {
          setIsLoading(false);
          synthesizer.close();
        },
        (error) => {
          setIsLoading(false);
          console.error(error);
          synthesizer.close();
          displayErrorToast();
        },
      );
    } catch (error) {
      console.log(error);
      displayErrorToast();
    }
  };

  return { isLoading, isPlaying, currentSpeechId, speak, stopPlaying };
};

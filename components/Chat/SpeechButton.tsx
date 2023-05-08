import {
  IconLoader,
  IconPlayerStop,
  IconDeviceSpeaker
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { useAzureTts } from '@/components/Hooks/useAzureTts';

type Props = {
  inputText: string;
};

export const SpeechButton: React.FC<Props> = ({ inputText }) => {
  const [text, setText] = useState('');
  const [token, setToken] = useState('');
  const [region, setRegion] = useState('');
  const { isLoading, isPlaying, speak, stopPlaying } = useAzureTts();

  useEffect(() => {
    setText(inputText);
    async function fetchToken() {
      try {
        const response = await fetch('/api/getSpeechToken');
        const responseJson = await response.json();
        setToken(responseJson.token);
        setRegion(responseJson.region);
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    }

    fetchToken();
  }, []);

  const playStopOnClick = () => {
    if (isPlaying) {
      stopPlaying();
    } else {
      if (token && region) {
        console.log(text);
        speak(text, token, region);
      }
    }
  };

  const getPlayerIcon = () => {
    if (isLoading) {
      return <IconLoader fill="none" size={18} />;
    } else {
      if (isPlaying) {
        return (
          <IconPlayerStop onClick={playStopOnClick} fill="none" size={18} />
        );
      } else {
        return (
          <IconDeviceSpeaker onClick={playStopOnClick} fill="none" size={18} />
        );
      }
    }
  };

  return <div className="cursor-pointer text-gray-500 hover:text-gray-300 mr-2">{getPlayerIcon()}</div>;
};

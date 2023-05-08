import {
  IconDeviceSpeaker,
  IconLoader,
  IconPlayerStop,
} from '@tabler/icons-react';
import { useContext, useEffect, useState } from 'react';

import HomeContext from '@/pages/api/home/home.context';

import { useAzureTts } from '@/components/Hooks/useAzureTts';
import { useLogger } from '@/components/Hooks/useLogger';

import { v4 } from 'uuid';

type Props = {
  inputText: string;
};

export const SpeechButton: React.FC<Props> = ({ inputText }) => {
  // This id is needed to track current playing speech across the entire app
  const [componentSpeechId, setComponentSpeechId] = useState('');

  const { isLoading, isPlaying, speak, stopPlaying } = useAzureTts();
  const { logGeneralEvent } = useLogger();

  const {
    state: { currentSpeechId },
  } = useContext(HomeContext);

  useEffect(() => {
    const newId = v4();
    console.log('newId', newId);

    setComponentSpeechId(newId);
  }, []);

  useEffect(() => {
    console.log('currentSpeechId changed to ' + currentSpeechId);
    console.log('isLoading changed to ' + isLoading);
    console.log('isPlaying changed to ' + isPlaying);
  }, [
    isLoading,
    isPlaying,
    currentSpeechId,
  ])

  const playStopOnClick = async () => {
    if (isPlaying) {
      stopPlaying();
    } else {
      await speak(inputText, componentSpeechId);
      logGeneralEvent('speech');
    }
  };

  const getPlayerIcon = () => {
    if (isLoading) {
      return <IconLoader fill="none" size={18} />;
    } else {
      if (isPlaying && currentSpeechId === componentSpeechId) {
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

  return (
    <div
      className={`cursor-pointer text-gray-500 hover:text-gray-300 mr-2 ${
        currentSpeechId === componentSpeechId ? 'text-green-500' : ''
      }`}
    >
      {getPlayerIcon()}
      <div className="text-xs">{componentSpeechId}</div>
    </div>
  );
};

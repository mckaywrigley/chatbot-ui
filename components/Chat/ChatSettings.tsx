import { useContext } from 'react';

import HomeContext from '@/pages/api/home/home.context';

import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import { useTranslation } from 'react-i18next';

export const ChatSettings = () => {
  const { t } = useTranslation('chat')
  
  const {
    state: { selectedConversation, prompts },
    handleUpdateConversation,
  } = useContext(HomeContext);
  if (!selectedConversation) return null;
  return (
    <div className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
      <ModelSelect />
      <SystemPrompt
        conversation={selectedConversation}
        prompts={prompts}
        onChangePrompt={(prompt) =>
          handleUpdateConversation(selectedConversation, {
            key: 'prompt',
            value: prompt,
          })
        }
      />

      <TemperatureSlider
        label={t('Temperature')}
        onChangeTemperature={(temperature) =>
          handleUpdateConversation(selectedConversation, {
            key: 'temperature',
            value: temperature,
          })
        }
      />
    </div>
  );
};

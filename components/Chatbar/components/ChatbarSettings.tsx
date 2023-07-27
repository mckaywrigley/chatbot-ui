import { IconFileExport, IconGrain, IconSettings } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { ModelDialog } from '@/components/ApiSelect/ApiDialog';
import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';
import { PluginKeys } from './PluginKeys';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [dialogOpen, setDialogOpen] = useState<'setting' | 'model' | null>(
    null,
  );

  const {
    state: {
      apiKey,
      lightMode,
      serverSideApiKeyIsSet,
      serverSidePluginKeysSet,
      conversations,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const {
    handleClearConversations,
    handleImportConversations,
    handleExportData,
    handleApiKeyChange,
  } = useContext(ChatbarContext);

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-black/20 dark:border-white/20 pt-1 text-sm">
      <SidebarButton
        text={t('Select API')}
        icon={<IconGrain size={18} />}
        onClick={() => setDialogOpen('model')}
      />

      {conversations.length > 0 ? (
        <ClearConversations onClearConversations={handleClearConversations} />
      ) : null}

      <Import onImport={handleImportConversations} />

      <SidebarButton
        text={t('Export data')}
        icon={<IconFileExport size={18} />}
        onClick={() => handleExportData()}
      />

      <SidebarButton
        text={t('Settings')}
        icon={<IconSettings size={18} />}
        onClick={() => setDialogOpen('setting')}
      />

      {/* {!serverSideApiKeyIsSet ? (
        <Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
      ) : null} */}

      {/* {!serverSidePluginKeysSet ? <PluginKeys /> : null} */}
      <PluginKeys />

      <SettingDialog
        open={dialogOpen === 'setting'}
        onClose={() => {
          setDialogOpen(null);
        }}
      />

      <ModelDialog
        open={dialogOpen === 'model'}
        onClose={() => {
          setDialogOpen(null);
        }}
      />
    </div>
  );
};

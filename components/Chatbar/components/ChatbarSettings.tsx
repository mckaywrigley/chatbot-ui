import { IconFileExport, IconLogout, IconSettings } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { getClientSession } from '@/utils/app/auth';
import { localDeleteAPIKey } from '@/utils/app/storage/local/apiKey';
import { localDeletePluginKeys } from '@/utils/app/storage/local/pluginKeys';
import { deleteSelectedConversation } from '@/utils/app/storage/selectedConversation';
import { AUTH_ENABLED } from 'chatbot-ui-core/utils/const';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';
import { Key } from '../../Settings/Key';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';
import { PluginKeys } from './PluginKeys';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);

  const {
    state: {
      apiKey,
      database,
      serverSideApiKeyIsSet,
      serverSidePluginKeysSet,
      conversations,
      user,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleSignOut = () => {
    if (database.name !== 'local') {
      deleteSelectedConversation(user);
      localDeleteAPIKey(user);
      localDeletePluginKeys(user);
    }

    signOut();
  };

  const {
    handleClearConversations,
    handleImportConversations,
    handleExportData,
    handleApiKeyChange,
  } = useContext(ChatbarContext);

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
      {conversations.length > 0 ? (
        <ClearConversations onClearConversations={handleClearConversations} />
      ) : null}

      <Import onImport={handleImportConversations} />

      <SidebarButton
        text={t('Export data')}
        icon={<IconFileExport size={18} />}
        onClick={() => handleExportData(database)}
      />

      <SidebarButton
        text={t('Settings')}
        icon={<IconSettings size={18} />}
        onClick={() => setIsSettingDialog(true)}
      />

      {!serverSideApiKeyIsSet ? (
        <Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
      ) : null}

      {!serverSidePluginKeysSet ? <PluginKeys /> : null}

      {AUTH_ENABLED && (
        <SidebarButton
          text={t('Log Out')}
          icon={<IconLogout size={18} />}
          onClick={handleSignOut}
        />
      )}

      <SettingDialog
        open={isSettingDialogOpen}
        onClose={() => {
          setIsSettingDialog(false);
        }}
      />
    </div>
  );
};

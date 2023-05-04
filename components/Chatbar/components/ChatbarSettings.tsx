import { IconFileExport, IconLogout, IconSettings } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';
import { localDeleteConversations } from '@/utils/app/storage/documentBased/local/conversations';
import { localDeleteFolders } from '@/utils/app/storage/documentBased/local/folders';
import { localDeletePrompts } from '@/utils/app/storage/documentBased/local/prompts';
import { localDeleteSystemPrompts } from '@/utils/app/storage/documentBased/local/systemPrompts';
import { deleteSelectedConversation } from '@/utils/app/storage/selectedConversation';

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
      lightMode,
      storageType: databaseType,
      serverSideApiKeyIsSet,
      serverSidePluginKeysSet,
      conversations,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleSignOut = () => {
    localDeleteConversations();
    localDeleteFolders();
    localDeletePrompts();
    localDeleteSystemPrompts();
    deleteSelectedConversation();
    localStorage.removeItem('apiKey');
    localStorage.removeItem('pluginKeys');
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
        onClick={() => handleExportData(databaseType || 'localStorage')}
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

      {NEXT_PUBLIC_NEXTAUTH_ENABLED && (
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

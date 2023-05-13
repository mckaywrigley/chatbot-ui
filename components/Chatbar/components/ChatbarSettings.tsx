import { IconSettings } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { syncKvToLocal, syncLocalToKv } from '@/utils/data/persist';
import { IconCloudDownload, IconCloudUpload } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
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


  const uploadLsToRedis = async () => {
    // confirm cloud data overwrite
    const confirm = window.confirm(
      'This will overwrite your cloud data. Are you sure?',
    );
    if (!confirm) return;
    await syncLocalToKv();
    // toast
    toast.success('Successfully uploaded to Redis');
  };
  const downloadRedisToLs = async () => {
    // confirm, warn data loss
    const confirm = window.confirm(
      'This will overwrite your local data. Are you sure?',
    );
    if (!confirm) return;
    await syncKvToLocal();
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
      {conversations.length > 0 ? (
        <ClearConversations onClearConversations={handleClearConversations} />
      ) : null}

      {/* <Import onImport={handleImportConversations} />

      <SidebarButton
        text={t('Export data')}
        icon={<IconFileExport size={18} />}
        onClick={() => handleExportData()}
      /> */}

      <SidebarButton
        text={t('Download From Redis')}
        icon={<IconCloudDownload size={18} />}
        onClick={() => downloadRedisToLs()}
      />

      <SidebarButton
        text={t('Upload To Redis')}
        icon={<IconCloudUpload size={18} />}
        onClick={() => uploadLsToRedis()}
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

      <SettingDialog
        open={isSettingDialogOpen}
        onClose={() => {
          setIsSettingDialog(false);
        }}
      />
    </div>
  );
};

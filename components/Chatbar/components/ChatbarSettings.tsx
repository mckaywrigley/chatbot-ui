import { IconBuildingStore, IconFileExport, IconSettings } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';
import { Key } from '../../Settings/Key';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';
import { PluginKeys } from './PluginKeys';
import { useSession } from 'next-auth/react';
import { MarketplaceDialog } from '@/components/Settings/MarketplaceDialog';
import UserInfo from '@/components/User/UserInfo';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);
  const [isMarketplaceDialogOpen, setIsMarketplaceDialogOpen] = useState<boolean>(false);
  const { data: session } = useSession()
  const email = session?.user?.email as string;
  const avatar = session?.user?.image as string;

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
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
      {
        session ? <UserInfo email={email} avatar={avatar}/> : <></>
      }
      {conversations.length > 0 ? (
        <ClearConversations onClearConversations={handleClearConversations} />
      ) : null}

      <Import onImport={handleImportConversations} />

      <SidebarButton
        text={t('Export data')}
        icon={<IconFileExport size={18} />}
        onClick={() => handleExportData()}
      />
      {
        session ? 
        <SidebarButton
        text={t('Marketplace')}
        icon={<IconBuildingStore size={18} />}
        onClick={() => setIsMarketplaceDialogOpen(true)}
      /> : <></>
      }
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
      
      <MarketplaceDialog
        open={isMarketplaceDialogOpen}
        onClose={()=> {
        setIsMarketplaceDialogOpen(false);
      }} />
    </div>
  );
};

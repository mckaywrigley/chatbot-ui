import {
  IconBrandFacebook,
  IconFileExport,
  IconMoon,
  IconSun,
  IconLogin,
  IconLogout
} from '@tabler/icons-react';
import { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { Import } from '../../Settings/Import';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');

  const {
    state: {
      lightMode,
      conversations,
      user
    },
    dispatch: homeDispatch,
    handleUserLogout,
  } = useContext(HomeContext);

  const {
    handleClearConversations,
    handleImportConversations,
    handleExportData,
  } = useContext(ChatbarContext);

  const signInSignOutOnClick = () => {
    if(user){
      handleUserLogout();
    }else{
      homeDispatch({
        field: 'showLoginSignUpModel',
        value: true,
      })
    }
  }

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
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
        text={lightMode === 'light' ? t('Dark mode') : t('Light mode')}
        icon={
          lightMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />
        }
        onClick={() =>
          homeDispatch({
            field: 'lightMode',
            value: lightMode === 'light' ? 'dark' : 'light',
          })
        }
      />
      <SidebarButton
        text={user ? t('Sign out') : t('Sign in')}
        icon={
          user ? <IconLogin size={18} /> : <IconLogout size={18} />
        }
        onClick={signInSignOutOnClick}
      />
      <SidebarButton
        text={t('Follow for updates!')}
        icon={<IconBrandFacebook size={18} />}
        onClick={() => {
          window.open(
            'https://www.facebook.com/groups/621367689441014',
            '_blank',
          );
        }}
      />
    </div>
  );
};

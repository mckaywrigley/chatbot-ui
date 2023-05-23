import {
  IconArticle,
  IconBrandFacebook,
  IconCurrencyDollar,
  IconFileExport,
  IconLogin,
  IconMoon,
  IconSun,
} from '@tabler/icons-react';
import { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import CloudSyncStatusComponent from '../../Sidebar/components/CloudSyncComponent';

import { Import } from '../../Settings/Import';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');

  const {
    state: { lightMode, conversations, user },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const {
    handleClearConversations,
    handleImportConversations,
    handleExportData,
  } = useContext(ChatbarContext);

  const isPaidUser = user && user.plan === 'pro';

  const signInAccountOnClick = () => {
    if (user) {
      homeDispatch({
        field: 'showProfileModel',
        value: true,
      });
    } else {
      homeDispatch({
        field: 'showLoginSignUpModel',
        value: true,
      });
    }
  };

  const getAccountButtonSuffixBadge = () => {
    if (user) {
      if (user.plan === 'pro') {
        return (
          <span className="bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-indigo-400 border border-indigo-400">
            Pro
          </span>
        );
      } else {
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-400 border border-gray-500">
            Free
          </span>
        );
      }
    } else {
      <span className="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">
        New
      </span>;
    }
  };

  return (
    <>
      <CloudSyncStatusComponent />
      <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm overflow-auto">
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
            lightMode === 'light' ? (
              <IconMoon size={18} />
            ) : (
              <IconSun size={18} />
            )
          }
          onClick={() =>
            homeDispatch({
              field: 'lightMode',
              value: lightMode === 'light' ? 'dark' : 'light',
            })
          }
        />
        <SidebarButton
          text={user ? t('Account') : t('Sign in')}
          icon={user ? <IconArticle size={18} /> : <IconLogin size={18} />}
          suffixIcon={getAccountButtonSuffixBadge()}
          onClick={signInAccountOnClick}
        />
        {isPaidUser && (
          <SidebarButton
            text={t('Usage & credit')}
            icon={<IconCurrencyDollar size={18} />}
            onClick={() => {
              homeDispatch({
                field: 'showUsageModel',
                value: true,
              });
            }}
          />
        )}
        <SidebarButton
          text={t('Latest updates')}
          icon={<IconBrandFacebook size={18} />}
          onClick={() => {
            homeDispatch({
              field: 'showNewsModel',
              value: true,
            });
          }}
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
    </>
  );
};

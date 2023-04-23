import { IconCloud, IconCloudOff } from '@tabler/icons-react';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import HomeContext from '@/pages/api/home/home.context';

import dayjs from 'dayjs';

const CloudSyncComponent = () => {
  const { t } = useTranslation('features');

  const {
    state: {
      user,
      isPaidUser,
      syncingConversation,
      syncSuccess,
      conversationLastSyncAt,
    },
    dispatch: dispatch,
  } = useContext(HomeContext);

  const isCloudSyncEnabled = user && isPaidUser;

  const CloudSyncStatusComponent = () => {
    if (syncingConversation) {
      return <span>{t('Syncing...')}</span>;
    } else {
      if (syncSuccess) {
        return (
          <span>
            {t('Synced')} @ {dayjs(conversationLastSyncAt).format('h:mm A')}
          </span>
        );
      } else {
        return <span>{t('Sync failed')}</span>;
      }
    }
  };

  const cloudSyncBlockOnClick = () => {
    if (!isCloudSyncEnabled) {
      if (user) {
        dispatch({
          field: 'showProfileModel',
          value: true,
        });
      } else {
        dispatch({
          field: 'showLoginSignUpModel',
          value: true,
        });
      }
    } else {
      dispatch({
        field: 'forceSyncConversation',
        value: true,
      });
    }
  };

  return (
    <div
      className={`flex w-full cursor-pointer select-none items-center gap-3py-3 px-3 text-[14px] leading-3 ${!isCloudSyncEnabled ? "text-neutral-400" : "text-white"}`}
      onClick={cloudSyncBlockOnClick}
    >
      <div className="pr-3">
        {isCloudSyncEnabled ? (
          <IconCloud size={18} />
        ) : (
          <IconCloudOff size={18} />
        )}
      </div>
      <div>
        {isCloudSyncEnabled ? (
          <CloudSyncStatusComponent />
        ) : (
          <span>{t('Cloud sync disabled')}</span>
        )}
      </div>
    </div>
  );
};

export default CloudSyncComponent;

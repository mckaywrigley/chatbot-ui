import { IconExternalLink } from '@tabler/icons-react';
import { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

export const UserRoleSelect = () => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, userRoles, defaultUserRole },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'userRole',
        value: e.target.value,
      });
  };

  /*
  {userRoles.map((role) => (
            <option
              key={role}
              value={role}
              className="dark:bg-[#343541] dark:text-white"
            >
              role
            </option>
          ))}
   */

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('User Role')}
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="w-full bg-transparent p-2"
          placeholder={t('Select a user role') || ''}
          value={selectedConversation?.userRole || defaultUserRole}
          onChange={handleChange}
        >
            {userRoles.map((role) => (
                <option
                    key={role}
                    value={role}
                    className="dark:bg-[#343541] dark:text-white"
                >
                    {role}
                </option>
            ))}
        </select>
      </div>
      <div className="w-full mt-3 text-left text-neutral-700 dark:text-neutral-400 flex items-center">
        <a
          href="https://platform.openai.com/account/usage"
          target="_blank"
          className="flex items-center"
        >
          <IconExternalLink size={18} className={'inline mr-1'} />
          {t('View Account Usage')}
        </a>
      </div>
    </div>
  );
};

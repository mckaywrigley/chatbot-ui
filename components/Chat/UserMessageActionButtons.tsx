import { IconEdit } from '@tabler/icons-react';
import React, { FC } from 'react';

type Props = {
  toggleEditing: () => void;
};

export const UserMessageActionButtons: FC<Props> = ({
  toggleEditing,
}) => (
  <>
    <button
      className={`absolute translate-x-[1000px] text-gray-500 hover:text-gray-700 focus:translate-x-0 group-hover:translate-x-0 dark:text-gray-400 dark:hover:text-gray-300 ${
        window.innerWidth < 640 ? 'bottom-1 right-3' : 'right-6 top-[26px]'
      }
                      `}
      onClick={toggleEditing}
    >
      <IconEdit size={20} />
    </button>
  </>
);

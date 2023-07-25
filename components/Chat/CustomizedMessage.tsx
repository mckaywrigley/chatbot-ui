import { FC, useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { NEXT_PUBLIC_CUSTOMIZED_MESSAGE1, NEXT_PUBLIC_CUSTOMIZED_MESSAGE2, NEXT_PUBLIC_CUSTOMIZED_MESSAGE3, NEXT_PUBLIC_CUSTOMIZED_MESSAGE4, NEXT_PUBLIC_CUSTOMIZED_MESSAGE5 } from '@/utils/app/const';

interface Props {
  label: string;
}

export const CustomizedMessage: FC<Props> = ({
  label,
}) => {
  const { t } = useTranslation('chat');

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {label}
      </label>
      <span className="text-[12px] text-black/50 dark:text-white/50 text-sm">
        {t(
          NEXT_PUBLIC_CUSTOMIZED_MESSAGE1,
        )}
      </span>
      <span className="text-[12px] text-black/50 dark:text-white/50 text-sm">
        {t(
          NEXT_PUBLIC_CUSTOMIZED_MESSAGE2,
        )}
      </span>
      <span className="text-[12px] text-black/50 dark:text-white/50 text-sm">
        {t(
          NEXT_PUBLIC_CUSTOMIZED_MESSAGE3,
        )}
      </span>
      <span className="text-[12px] text-black/50 dark:text-white/50 text-sm">
        {t(
          NEXT_PUBLIC_CUSTOMIZED_MESSAGE4,
        )}
      </span>
      <span className="text-[12px] text-black/50 dark:text-white/50 text-sm">
        {t(
          NEXT_PUBLIC_CUSTOMIZED_MESSAGE5,
        )}
      </span>
    </div>
  );
};

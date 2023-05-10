import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface Props {
  onClick: any;
  side: 'left' | 'right';
}

export const SidebarToggleButton = ({ onClick, side }: Props) => {
  return (
    <>
      <button
        className={`absolute top-5 ${
          side === 'right'
            ? 'left-0 translate-x-[-120%]'
            : 'right-0 translate-x-[120%]'
        } z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5  transition-all ease-linear 
          sm:h-8 sm:w-8 sm:text-neutral-700`}
        onClick={onClick}
      >
        {side === 'right' ? (
          <IconArrowBarRight className="w-full" />
        ) : (
          <IconArrowBarLeft className="w-full" />
        )}
      </button>
      <div
        onClick={onClick}
        className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
      ></div>
    </>
  );
};

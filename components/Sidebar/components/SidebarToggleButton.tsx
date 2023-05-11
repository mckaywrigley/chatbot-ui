import {
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightExpand,
  IconMenu2,
} from '@tabler/icons-react';

interface Props {
  onClick: any;
  side: 'left' | 'right';
  className?: string;
}

export const SidebarToggleButton = ({
  onClick,
  side,
  className = '',
}: Props) => {
  return (
    <>
      <button
        className={`absolute top-5 ${
          side === 'right'
            ? 'left-0 translate-x-[-100%]'
            : 'right-0 translate-x-[100%]'
        } z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5  transition-all ease-linear sm:h-8 sm:w-8 sm:text-neutral-700 mobile:hidden ${className}`}
        onClick={onClick}
      >
        <IconMenu2 className="w-full" />
      </button>
      <button
        className={`absolute top-[50%] ${side}-0 -translate-y-[50%] h-10 w-10 dark:text-white transition-all ease-linear opacity-25 ${className} sm:hidden`}
        onClick={onClick}
      >
        {side == 'right' ? (
          <IconLayoutSidebarRightExpand className="w-full" strokeWidth={1.5} />
        ) : (
          <IconLayoutSidebarLeftExpand className="w-full" strokeWidth={1.5} />
        )}
      </button>
    </>
  );
};

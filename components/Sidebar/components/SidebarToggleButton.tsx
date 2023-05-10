import { IconArrowBarRight, IconMenu2 } from '@tabler/icons-react';

interface Props {
  onClick: any;
  side: 'left' | 'right';
  className?: string;
}

export const SidebarToggleButton = ({ onClick, side, className }: Props) => {
  return (
    <>
      <button
        className={`absolute top-5 ${
          side === 'right'
            ? 'left-0 translate-x-[-100%]'
            : 'right-0 translate-x-[100%]'
        } z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5  transition-all ease-linear sm:h-8 sm:w-8 sm:text-neutral-700 ${className}`}
        onClick={onClick}
      >
        <IconMenu2 className="w-full" />
      </button>
      <div
        onClick={onClick}
        className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
      ></div>
    </>
  );
};

import { ReactElement } from 'react';
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  side: 'left' | 'right';
  toggleOpen: () => void;
  children: ReactElement;
}

const Sidebar = ({ isOpen, side, toggleOpen, children }: Props) => {
  return isOpen ? (
    <div>
      {children}
      <button
        className={`fixed top-5 ${
          side === 'right' ? 'right' : 'left'
        }-[270px] z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:${
          side === 'right' ? 'right' : 'left'
        }-[270px] sm:h-8 sm:w-8 sm:text-neutral-700`}
        onClick={toggleOpen}
      >
        {side === 'right' ? <IconArrowBarRight /> : <IconArrowBarLeft />}
      </button>
      <div
        onClick={toggleOpen}
        className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
      ></div>
    </div>
  ) : (
    <button
      className={`fixed top-2.5 ${
        side === 'right' ? 'right' : 'left'
      }-4 z-50 h-7 w-7 text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:${
        side === 'right' ? 'right' : 'left'
      }-4 sm:h-8 sm:w-8 sm:text-neutral-700`}
      onClick={toggleOpen}
    >
      {side === 'right' ? <IconArrowBarLeft /> : <IconArrowBarRight />}
    </button>
  );
};

export default Sidebar;

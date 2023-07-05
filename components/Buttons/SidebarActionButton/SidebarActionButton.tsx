import { MouseEventHandler, ReactElement } from 'react';

interface Props {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactElement;
}

const SidebarActionButton = ({ handleClick, children }: Props) => (
  <button
    className="min-w-[20px] p-1 dark:text-neutral-400 dark:hover:text-neutral-100 text-neutral-600 hover:text-neutral-500"
    onClick={handleClick}
  >
    {children}
  </button>
);

export default SidebarActionButton;

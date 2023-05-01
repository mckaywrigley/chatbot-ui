import { MouseEventHandler, ReactElement } from 'react';

interface Props {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactElement;
  className?: string;
}

const SidebarActionButton = ({ handleClick, children, className }: Props) => (
  <button
    className={
      className || 'min-w-[20px] p-1 text-neutral-400 hover:text-neutral-100 '
    }
    onClick={handleClick}
  >
    {children}
  </button>
);

export default SidebarActionButton;

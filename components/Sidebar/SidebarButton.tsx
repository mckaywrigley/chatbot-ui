import { FC } from 'react';

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <button
      className="flex w-full cursor-pointer items-center gap-3 rounded-md py-3 px-3 text-white transition-colors duration-200 hover:bg-gray-500/10"
      onClick={onClick}
    >
      <div>{icon}</div>
      <div>{text}</div>
    </button>
  );
};

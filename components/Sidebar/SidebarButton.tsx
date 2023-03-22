import { FC } from "react";

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <div
      className="flex py-3 px-3 gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer w-full items-center"
      onClick={onClick}
    >
      <div className="">{icon}</div>
      <div>{text}</div>
    </div>
  );
};

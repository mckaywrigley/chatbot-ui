import { FC } from "react";

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <div
      className="flex hover:bg-[#343541] py-2 px-2 rounded-md cursor-pointer w-full items-center"
      onClick={onClick}
    >
      <div className="mr-2">{icon}</div>
      <div>{text}</div>
    </div>
  );
};

import { FC } from "react";

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <div
      className="flex hover:bg-[#343541] py-2 px-4 rounded-md cursor-pointer w-[200px] items-center"
      onClick={onClick}
    >
      <div className="mr-3">{icon}</div>
      <div>{text}</div>
    </div>
  );
};

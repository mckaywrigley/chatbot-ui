import { IconPlus } from "@tabler/icons-react";
import { FC } from "react";
import { SidebarSettings } from "./SidebarSettings";

interface Props {
  lightMode: "light" | "dark";
  onToggleLightMode: (mode: "light" | "dark") => void;
}

export const Sidebar: FC<Props> = ({ lightMode, onToggleLightMode }) => {
  return (
    <div className="flex flex-col bg-[#202123] min-w-[260px]">
      <div className="flex items-center justify-center h-[60px]">
        <button className="flex items-center w-[240px] h-[40px] rounded-lg bg-[#202123] border border-neutral-600 text-sm hover:bg-neutral-700">
          <IconPlus
            className="ml-4 mr-3"
            size={16}
          />
          New chat
        </button>
      </div>

      <div className="flex-1"></div>

      <SidebarSettings
        lightMode={lightMode}
        onToggleLightMode={onToggleLightMode}
      />
    </div>
  );
};

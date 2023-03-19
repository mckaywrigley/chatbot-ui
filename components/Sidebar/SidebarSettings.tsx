import { IconMoon, IconSun } from "@tabler/icons-react";
import { FC } from "react";
import { Key } from "./Key";
import { SidebarButton } from "./SidebarButton";

interface Props {
  lightMode: "light" | "dark";
  apiKey: string;
  onToggleLightMode: (mode: "light" | "dark") => void;
  onApiKeyChange: (apiKey: string) => void;
}

export const SidebarSettings: FC<Props> = ({ lightMode, apiKey, onToggleLightMode, onApiKeyChange }) => {
  return (
    <div className="flex flex-col items-center border-t border-neutral-500 px-2 py-4 text-sm space-y-2">
      <SidebarButton
        text={lightMode === "light" ? "Dark mode" : "Light mode"}
        icon={lightMode === "light" ? <IconMoon size={16} /> : <IconSun size={16} />}
        onClick={() => onToggleLightMode(lightMode === "light" ? "dark" : "light")}
      />
      <Key
        apiKey={apiKey}
        onApiKeyChange={onApiKeyChange}
      />
    </div>
  );
};

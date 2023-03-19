import { IconCheck, IconKey, IconX } from "@tabler/icons-react";
import { FC, KeyboardEvent, useState } from "react";
import { SidebarButton } from "./SidebarButton";

interface Props {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
}

export const Key: FC<Props> = ({ apiKey, onApiKeyChange }) => {
  const [isChanging, setIsChanging] = useState(false);
  const [newKey, setNewKey] = useState(apiKey);

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleUpdateKey(newKey);
    }
  };

  const handleUpdateKey = (newKey: string) => {
    onApiKeyChange(newKey);
    setIsChanging(false);
  };

  return isChanging ? (
    <div className="flex hover:bg-[#343541] py-2 px-2 rounded-md cursor-pointer w-full items-center">
      <IconKey size={16} />

      <input
        className="ml-2 flex-1 bg-transparent border-b border-neutral-400 focus:border-neutral-100 text-left overflow-hidden overflow-ellipsis pr-1 outline-none text-white"
        type="password"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        onKeyDown={handleEnterDown}
      />

      <div className="flex w-[40px]">
        <IconCheck
          className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
          size={18}
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateKey(newKey);
          }}
        />

        <IconX
          className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
          size={18}
          onClick={(e) => {
            e.stopPropagation();
            setIsChanging(false);
            setNewKey(apiKey);
          }}
        />
      </div>
    </div>
  ) : (
    <SidebarButton
      text="OpenAI API Key"
      icon={<IconKey size={16} />}
      onClick={() => setIsChanging(true)}
    />
  );
};

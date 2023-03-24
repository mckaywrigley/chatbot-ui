import { ChatFolder, Conversation } from "@/types";
import { cleanConversationHistory } from "@/utils/app/clean";
import { IconFileImport } from "@tabler/icons-react";
import { FC } from "react";

interface Props {
  onImport: (data: { conversations: Conversation[]; folders: ChatFolder[] }) => void;
}

export const Import: FC<Props> = ({ onImport }) => {
  return (
    <div className="flex py-3 px-3 gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer w-full items-center">
      <input
        className="opacity-0 absolute w-[200px] cursor-pointer"
        type="file"
        accept=".json"
        onChange={(e) => {
          if (!e.target.files?.length) return;

          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            let json = JSON.parse(e.target?.result as string);

            if (!json.folders) {
              json = { history: cleanConversationHistory(json), folders: [] };
            }

            onImport({ conversations: json.history, folders: json.folders });
          };
          reader.readAsText(file);
        }}
      />
      <div className="flex items-center gap-3 text-left">
        <IconFileImport size={16} />
        <div>Import conversations</div>
      </div>
    </div>
  );
};

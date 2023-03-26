import { KeyValuePair, Prompt } from "@/types";
import { IconArrowBarRight, IconFolderPlus, IconPlus } from "@tabler/icons-react";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "../Sidebar/Search";
import { PromptbarSettings } from "./PromptbarSettings";

interface Props {
  prompts: Prompt[];
  onToggleSidebar: () => void;
  onCreatePrompt: () => void;
  onUpdatePrompt: (prompt: Prompt, data: KeyValuePair) => void;
  onDeletePrompt: (prompt: Prompt) => void;
  onCreatePromptFolder: (name: string) => void;
}

export const Promptbar: FC<Props> = ({ prompts, onCreatePrompt, onCreatePromptFolder, onUpdatePrompt, onDeletePrompt, onToggleSidebar }) => {
  const { t } = useTranslation("promptbar");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>(prompts);

  const handleUpdatePrompt = (prompt: Prompt, data: KeyValuePair) => {
    onUpdatePrompt(prompt, data);
    setSearchTerm("");
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    onDeletePrompt(prompt);
    setSearchTerm("");
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const prompt = JSON.parse(e.dataTransfer.getData("prompt"));
      onUpdatePrompt(prompt, { key: "folderId", value: 0 });

      e.target.style.background = "none";
    }
  };

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = "#343541";
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = "none";
  };

  useEffect(() => {
    if (searchTerm) {
      setFilteredPrompts(
        prompts.filter((prompt) => {
          const searchable = prompt.name.toLowerCase();
          return searchable.includes(searchTerm.toLowerCase());
        })
      );
    } else {
      setFilteredPrompts(prompts);
    }
  }, [searchTerm, prompts]);

  return (
    <div className={`h-full transition-all flex flex-none space-y-2 p-2 flex-col bg-[#202123] w-[260px] z-50 sm:relative sm:top-0 fixed top-0 bottom-0`}>
      <div className="flex items-center">
        <button
          className="flex gap-3 p-3 items-center w-[190px] rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm flex-shrink-0 border border-white/20"
          onClick={() => {}}
        >
          <IconPlus size={16} />
          {t("New prompt")}
        </button>

        <button
          className="ml-2 flex gap-3 p-3 items-center rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm flex-shrink-0 border border-white/20"
          onClick={() => {
            onCreatePromptFolder(t("New folder"));
            setSearchTerm("");
          }}
        >
          <IconFolderPlus size={16} />
        </button>

        <IconArrowBarRight
          className="ml-1 p-1 text-neutral-300 cursor-pointer hover:text-neutral-400 hidden sm:flex"
          size={32}
          onClick={onToggleSidebar}
        />

        {prompts.length > 1 && (
          <Search
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
          />
        )}

        {prompts.length > 0 ? (
          <div
            className="pt-2 h-full"
            onDrop={(e) => handleDrop(e)}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            Prompts.
          </div>
        ) : (
          <div className="mt-4 text-white text-center">
            <div>{t("No prompts.")}</div>
          </div>
        )}
      </div>

      <PromptbarSettings />
    </div>
  );
};

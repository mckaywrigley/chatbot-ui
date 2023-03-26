import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { useTranslation } from "next-i18next";
import PromptDisclosure from "./PromptDisclosure";
import { PromptTemplate } from "@/types";
import { useRouter } from "next/router";

type Props = {
  onChangePrompt: (prompt: string) => void;
};

const promptAssets: { [x: string]: PromptTemplate[] } = {
  en: require(`@/public/prompts/en.json`),
  zh: require(`@/public/prompts/zh.json`),
  // ... Add support for more languages.
};

export default function PromptTemplates({ onChangePrompt }: Props) {
  const router = useRouter();
  // The default prompts are in English.
  const prompts: PromptTemplate[] =
    promptAssets[router.locale || "en"] || promptAssets["en"];

  const { t } = useTranslation("chat");
  let [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>();

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  const onSelect = (prompt: PromptTemplate) => {
    onChangePrompt(prompt.prompt);
    closeModal();
  };

  return (
    <>
      <div className="inset-0 pt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={openModal}
          className="rounded-md bg-black bg-opacity-80 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
        >
          {t("select prompt template")}
        </button>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black dark:bg-[#343541] bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-[#343541] p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    {t("Prompt Templates")}
                  </Dialog.Title>
                  <input
                    className="w-full border-none py-2 px-3 my-4 text-sm leading-5 text-gray-900 focus:ring-0 ring-1 dark:bg-slate-600 dark:text-slate-100"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    placeholder={t("Please input a prompt keyword") || ""}
                  />
                  {prompts
                    ?.filter(
                      (p: PromptTemplate) =>
                        !selected ||
                        p.act.toLowerCase().includes(selected.toLowerCase())
                    )
                    .map((prompt: PromptTemplate, index: string) => (
                      <PromptDisclosure
                        key={index}
                        prompt={prompt}
                        onSelect={onSelect}
                      />
                    ))}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

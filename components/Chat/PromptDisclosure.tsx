import { PromptTemplate } from "@/types";
import { Disclosure } from "@headlessui/react";
import { IconArrowDown } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";

type Props = {
  prompt: PromptTemplate;
  onSelect: (prompt: PromptTemplate) => void;
};

const PromptDisclosure = ({ prompt, onSelect }: Props) => {
  const { t } = useTranslation("chat");
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full justify-between rounded-lg bg-purple-100 px-4 py-2 my-2 text-left text-sm font-medium text-purple-900 hover:bg-purple-200 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:bg-gray-600 dark:text-purple-100">
            <span>{prompt.act}</span>
            <IconArrowDown
              className={`${
                open ? "rotate-180 transform" : ""
              } h-5 w-5 text-purple-500`}
            />
          </Disclosure.Button>
          <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500 dark:text-white">
            <div>{prompt.prompt}</div>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-2 mt-2 py-1 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:text-blue-50"
              onClick={() => onSelect(prompt)}
            >
              {t("Use it!")}
            </button>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default PromptDisclosure;

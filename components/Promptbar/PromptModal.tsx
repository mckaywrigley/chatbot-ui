import { Prompt } from '@/types/prompt';
import { FC, useEffect, useRef, useState } from 'react';

interface Props {
  prompt: Prompt;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePrompt: (prompt: Prompt) => void;
}

export const PromptModal: FC<Props> = ({
  prompt,
  isOpen,
  onClose,
  onUpdatePrompt,
}) => {
  const [name, setName] = useState(prompt.name);
  const [content, setContent] = useState(prompt.content);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('click', handleOutsideClick);
    }

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative">
      {isOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="hidden sm:inline-block sm:h-screen sm:align-middle"
              aria-hidden="true"
            />

            <div
              ref={modalRef}
              className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
              role="dialog"
            >
              <div className="mt-3 flex flex-col">
                <input
                  className="text-lg font-medium leading-6 text-gray-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <textarea
                  className="text-sm mt-2 rounded-md border border-gray-300 p-2 text-gray-500"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="text-base sm:text-sm mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="text-base sm:text-sm mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto"
                  onClick={() => {
                    const updatedPrompt = {
                      ...prompt,
                      name,
                      content,
                    };

                    onUpdatePrompt(updatedPrompt);
                    onClose();
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

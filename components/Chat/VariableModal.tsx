import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';

interface Props {
  variables: string[];
  onSubmit: (updatedVariables: string[]) => void;
  onClose: () => void;
}

export const VariableModal: FC<Props> = ({ variables, onSubmit, onClose }) => {
  const [updatedVariables, setUpdatedVariables] = useState<string[]>(
    Array(variables.length).fill(''),
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (index: number, value: string) => {
    setUpdatedVariables((prev) => {
      const newUpdatedVariables = [...prev];
      newUpdatedVariables[index] = value;
      return newUpdatedVariables;
    });
  };

  const handleSubmit = () => {
    onSubmit(updatedVariables);
  };

  const handleEnter = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit();
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [onClose]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onKeyDown={handleEnter}
    >
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block transform overflow-hidden rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
            {/* <input
                ref={nameInputRef}
                className="w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <textarea
                className="mt-6 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
                style={{ resize: 'none' }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
              />

              <button
                type="button"
                className="mt-6 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
                onClick={() => {
                  const updatedPrompt = {
                    ...prompt,
                    name,
                    content: content.trim(),
                  };

                  onUpdatePrompt(updatedPrompt);
                  onClose();
                }}
              >
                Save
              </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

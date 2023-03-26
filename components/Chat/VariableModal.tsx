import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';

interface Props {
  variables: string[];
  onSubmit: (updatedVariables: string[]) => void;
  onClose: () => void;
}

export const VariableModal: FC<Props> = ({ variables, onSubmit, onClose }) => {
  const [updatedVariables, setUpdatedVariables] = useState<
    { key: string; value: string }[]
  >(variables.map((variable) => ({ key: variable, value: '' })));

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (index: number, value: string) => {
    setUpdatedVariables((prev) => {
      const updated = [...prev];
      updated[index].value = value;
      return updated;
    });
  };

  const handleSubmit = () => {
    onSubmit(updatedVariables.map((variable) => variable.value));
  };

  const handleEnter = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      onSubmit(updatedVariables.map((variable) => variable.value));
      onClose();
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
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
      <div
        ref={modalRef}
        className="rounded bg-white p-6 sm:w-[500px]"
        role="dialog"
      >
        <div className="mb-4 text-xl font-bold text-black">
          Fill out the variables
        </div>

        {updatedVariables.map((variable, index) => (
          <div className="mb-4" key={index}>
            <div className="mb-2 text-sm font-bold text-gray-600">
              {variable.key}
            </div>

            <textarea
              ref={index === 0 ? nameInputRef : undefined}
              className="w-full rounded border border-gray-300 p-2 text-black"
              style={{ resize: 'none' }}
              value={variable.value}
              onChange={(e) => handleChange(index, e.target.value)}
              rows={5}
            />
          </div>
        ))}

        <button
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

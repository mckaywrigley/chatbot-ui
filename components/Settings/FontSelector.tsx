// components/FontSelector.tsx
import React, { ChangeEvent } from 'react';
import { useFont } from './FontContext';
import { useTranslation } from 'next-i18next';
import { IconTypography } from '@tabler/icons-react';

const FontSelector = () => {
  const { t } = useTranslation('chat');

  const { selectedFont, setSelectedFont } = useFont();

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Lexend', label: 'Lexend' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Ubuntu', label: 'Ubuntu' },
  ];

  const handleFontChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    setSelectedFont(selectedValue);
    document.body.style.fontFamily = selectedValue;
  };

  return (
    <div className="flex w-full items-center bg-transparent p-2">
      <IconTypography
        className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
        size={18}
      />
      <select
        className="w-full bg-transparent p-2"
        value={selectedFont}
        onChange={handleFontChange}
      >
        <option value="" disabled>
          {t('Select a Font')}
        </option>
        {fontOptions.map((font) => (
          <option
            key={font.value}
            value={font.value}
            className="dark:bg-[#343541] dark:text-white"
          >
            {font.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FontSelector;

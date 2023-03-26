import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { FC } from 'react';
import { useTranslation } from 'next-i18next';

interface Props {
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
  onCloseSearch: () => void;
}

export const Search: FC<Props> = ({ searchTerm, onSearch, onCloseSearch }) => {
  const { t } = useTranslation('sidebar');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    onSearch('');
  };

  const exitFromSearch = () => {
    onSearch('');

    onCloseSearch();
  }

  return (
    <div className="flex items-center w-full rounded-md border border-neutral-600 px-3 py-[0.70rem]">
      <IconArrowLeft
        className="cursor-pointer mr-3 text-neutral-300 hover:text-neutral-400"
        size={20}
        onClick={exitFromSearch}
      />

      <input
        className="w-full bg-transparent text-[12.5px] text-white outline-0"
        type="text"
        placeholder={t('Search conversations...') || ''}
        value={searchTerm}
        onChange={handleSearchChange}
      />

      {searchTerm && (
        <IconX
          className="cursor-pointer text-neutral-300 hover:text-neutral-400"
          size={18}
          onClick={clearSearch}
        />
      )}
    </div>
  );
};

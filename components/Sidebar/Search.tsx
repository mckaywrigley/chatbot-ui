import { IconSearch, IconX } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC } from 'react';

interface Props {
  placeholder: string;
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export const Search: FC<Props> = ({
  placeholder,
  searchTerm,
  onSearch,
  onFocus,
  onBlur,
}) => {
  const { t } = useTranslation('sidebar');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    onSearch('');
  };

  return (
    <div className="relative flex w-full items-center">
      {!searchTerm && (
        <IconSearch
          className="absolute right-4 cursor-pointer text-neutral-300 hover:text-neutral-400"
          size={18}
          onClick={clearSearch}
        />
      )}
      <input
        className="w-full flex-1 text-ellipsis rounded-md border border-neutral-600 bg-[#202123] px-4 py-3 pr-10 text-[14px] leading-3 text-white"
        type="text"
        placeholder={t(placeholder) || ''}
        value={searchTerm}
        onChange={handleSearchChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />

      {searchTerm && (
        <IconX
          className="absolute right-4 cursor-pointer text-neutral-300 hover:text-neutral-400"
          size={18}
          onClick={clearSearch}
        />
      )}
    </div>
  );
};

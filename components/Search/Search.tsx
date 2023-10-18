import { useTranslation } from 'next-i18next';
import { IconX } from '@tabler/icons-react';

interface SearchProps {
  placeholder: string;
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
}
const Search = ({ placeholder, searchTerm, onSearch }: SearchProps) => {
  const { t } = useTranslation('sidebar');

  return (
    <div className="relative flex items-center">
      <input
        className="w-full flex-1 rounded-md border border-neutral-600 bg-[#202123] px-4 py-3 pr-10 text-[14px] leading-3 text-white"
        type="text"
        placeholder={t(placeholder) || ''}
        value={searchTerm}
        onChange={e => onSearch(e.target.value)}
      />

      {searchTerm && (
        <IconX
          className="absolute right-4 cursor-pointer text-neutral-300 hover:text-neutral-400"
          size={18}
          onClick={_ => onSearch('')}
        />
      )}
    </div>
  );
};

export default Search;

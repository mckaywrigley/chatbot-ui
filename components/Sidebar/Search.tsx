import { IconX } from "@tabler/icons-react";
import { FC } from "react";
import { useTranslation } from "next-i18next";

interface Props {
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
}

export const Search: FC<Props> = ({ searchTerm, onSearch }) => {
  const { t } = useTranslation('sidebar');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    onSearch("");
  };

  return (
    <div className="relative flex items-center">
      <input
        className="flex-1 w-full pr-10 bg-[#202123] border border-neutral-600 text-sm rounded-md px-4 py-3 text-white"
        type="text"
        placeholder={t('Search conversations...') || ''}
        value={searchTerm}
        onChange={handleSearchChange}
      />

      {searchTerm && (
        <IconX
          className="absolute right-4 text-neutral-300 cursor-pointer hover:text-neutral-400"
          size={24}
          onClick={clearSearch}
        />
      )}
    </div>
  );
};

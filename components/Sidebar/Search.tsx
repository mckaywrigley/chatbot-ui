import { IconX } from "@tabler/icons-react";
import { FC } from "react";

interface Props {
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
}

export const Search: FC<Props> = ({ searchTerm, onSearch }) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    onSearch("");
  };

  return (
    <div className="relative flex items-center sm:pl-2 px-2 mb-2">
      <input
        className="flex-1 w-full pr-10 bg-[#202123] border border-neutral-600 text-sm rounded-lg px-4 py-2 text-white"
        type="text"
        placeholder="Search conversations..."
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

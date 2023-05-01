import { IconFolderPlus, IconMistOff, IconPlus } from '@tabler/icons-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CloseSidebarButton,
  OpenSidebarButton,
} from './components/OpenCloseButton';

import Search from '../Search';

interface Props<T> {
  isOpen: boolean;
  addItemButtonTitle: string;
  side: 'left' | 'right';
  items: T[];
  itemComponent: ReactNode;
  folderComponent: ReactNode;
  footerComponent?: ReactNode;
  searchTerm: string;
  handleSearchTerm: (searchTerm: string) => void;
  toggleOpen: () => void;
  handleCreateItem: () => void;
  handleCreateFolder: () => void;
  handleDrop: (e: any) => void;
}

const Sidebar = <T,>({
  isOpen,
  addItemButtonTitle,
  side,
  items,
  itemComponent,
  folderComponent,
  footerComponent,
  searchTerm,
  handleSearchTerm,
  toggleOpen,
  handleCreateItem,
  handleCreateFolder,
  handleDrop,
}: Props<T>) => {
  const { t } = useTranslation('promptbar');

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#343541';
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  const [showMenu, setShowMenu] = useState(false);
  const [showMenuAnimation, setShowMenuAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowMenu(true);
      setTimeout(() => {
        setShowMenuAnimation(true);
      }, 200);
    } else {
      setShowMenuAnimation(false);
      setTimeout(() => {
        setShowMenu(false);
      }, 200);
    }
  }, [isOpen]);

  return (
    <div
      className={`${
        showMenuAnimation ? 'w-[260px]' : 'w-0'
      } transition-all ease-linear `}
    >
      <div
        className={`
        ${!isOpen ? 'hidden' : ''}
        ${showMenuAnimation && side === 'right' ? '!right-0' : ''} 
        ${showMenuAnimation && side === 'left' ? '!left-0' : ''}
           fixed top-0 z-40 flex h-full w-[260px] flex-none flex-col space-y-2 bg-[#202123] p-2 text-[14px] transition-all ease-linear sm:relative sm:top-0`}
        style={side === 'left' ? { left: '-260px' } : { right: '-260px' }}
      >
        <div className="flex items-center">
          <button
            className="text-sidebar flex w-[190px] flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-md border border-white/20 p-3 text-white transition-colors duration-200 hover:bg-gray-500/10"
            onClick={() => {
              handleCreateItem();
              handleSearchTerm('');
            }}
          >
            <IconPlus size={16} />
            {addItemButtonTitle}
          </button>

          <button
            className="ml-2 flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-md border border-white/20 p-3 text-sm text-white transition-colors duration-200 hover:bg-gray-500/10"
            onClick={handleCreateFolder}
          >
            <IconFolderPlus size={16} />
          </button>
        </div>
        {items?.length > 0 && (
          <Search
            placeholder={t('Search prompts...') || ''}
            searchTerm={searchTerm}
            onSearch={handleSearchTerm}
          />
        )}

        <div className="flex-grow overflow-auto resize-y">
          {items?.length > 0 && (
            <div className="flex border-b border-white/20 pb-2">
              {folderComponent}
            </div>
          )}

          {items?.length > 0 ? (
            <div
              className="pt-2"
              onDrop={handleDrop}
              onDragOver={allowDrop}
              onDragEnter={highlightDrop}
              onDragLeave={removeHighlight}
            >
              {itemComponent}
            </div>
          ) : (
            <div className="mt-8 select-none text-center text-white opacity-50">
              <IconMistOff className="mx-auto mb-3" />
              <span className="text-[14px] leading-normal">
                {t('No prompts.')}
              </span>
            </div>
          )}
        </div>
        {footerComponent}
      </div>

      {isOpen && <CloseSidebarButton onClick={toggleOpen} side={side} />}
      {!isOpen && <OpenSidebarButton onClick={toggleOpen} side={side} />}
    </div>
  );
};

export default Sidebar;

import React, { forwardRef, useContext } from 'react';

import HomeContext from '@/pages/api/home/home.context';

import ChangeOutputLanguageButton from './ChangeOutputLanguageButton';
import ModeSelector from "./ModeSelector";

import PropTypes from 'prop-types';

type EnhancedMenuProps = {
  isFocused: boolean;
  setIsFocused: (isFocused: boolean) => void;
};

const EnhancedMenu = forwardRef<HTMLDivElement, EnhancedMenuProps>(
  ({ isFocused, setIsFocused }, ref) => {
    const {
      state: { messageIsStreaming },
    } = useContext(HomeContext);

    return (
      <div
        ref={ref}
        className="absolute h-fit -top-2 left-0 w-full px-4 py-2 flex flex-row justify-between bg-white dark:bg-[#343541] opacity-90 text-black dark:text-white z-10 rounded-md -translate-y-[100%] border dark:border-gray-900/50 shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]"
        style={{
          display: isFocused && !messageIsStreaming ? 'flex' : 'none',
        }}
      >
        <ModeSelector />
        <ChangeOutputLanguageButton />
      </div>
    );
  },
);

EnhancedMenu.propTypes = {
  isFocused: PropTypes.bool.isRequired,
  setIsFocused: PropTypes.func.isRequired,
};

EnhancedMenu.displayName = 'EnhancedMenu';

export default EnhancedMenu;

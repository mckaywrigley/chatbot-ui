import React, { forwardRef } from 'react';

import PropTypes from 'prop-types';

type EnhancedMenuProps = {
  isFocused: boolean;
  setIsFocused: (isFocused: boolean) => void;
};

const EnhancedMenu = forwardRef<HTMLDivElement, EnhancedMenuProps>(
  ({ isFocused, setIsFocused }, ref) => {
    return (
      <div
        ref={ref}
        className="shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] absolute top-0 left-0 w-full h-full text-black dark:text-white z-10 rounded-sm -translate-y-[100%] border dark:border-gray-900/50"
        style={{
          display: isFocused ? 'block' : 'none',
        }}
      >
        <button> test focus button </button>I am a dot dot dot menu
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

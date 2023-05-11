import React, {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import HomeContext from '@/pages/api/home/home.context';

import ChangeOutputLanguageButton from './ChangeOutputLanguageButton';
import ModeSelector from './ModeSelector';

import PropTypes from 'prop-types';

type EnhancedMenuProps = {
  isFocused: boolean;
  setIsFocused: (isFocused: boolean) => void;
};

const EnhancedMenu = forwardRef<HTMLDivElement, EnhancedMenuProps>(
  ({ isFocused, setIsFocused }, ref) => {
    const {
      state: { messageIsStreaming, currentMessage },
    } = useContext(HomeContext);

    const shouldShow = useMemo(() => {
      return isFocused && !messageIsStreaming;
    }, [isFocused, messageIsStreaming]);

    // THIS IS A DELAY FOR THE MENU ANIMATION
    const [showMenuDisplay, setShowMenuDisplay] = useState(false);
    const [showMenuAnimation, setShowMenuAnimation] = useState(false);

    useEffect(() => {
      if (shouldShow) {
        setShowMenuDisplay(true);
        setTimeout(() => {
          setShowMenuAnimation(true);
        }, 200);
      } else {
        setShowMenuAnimation(false);
        setTimeout(() => {
          setShowMenuDisplay(false);
        }, 200);
      }
    }, [shouldShow]);

    return (
      <div
        ref={ref}
        className={`absolute h-fit left-0 w-full px-4 py-2 flex flex-col md:flex-row justify-between
        bg-white dark:bg-[#343541] text-black dark:text-white z-10 rounded-md -translate-y-[100%]
          border dark:border-gray-900/50 shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]
          transition-all ease-linear ${
            showMenuAnimation ? '-top-2 opacity-90' : 'top-8 opacity-0'
          }`}
        style={{
          display: showMenuDisplay ? 'flex' : 'none',
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

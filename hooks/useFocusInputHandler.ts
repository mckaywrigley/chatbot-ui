import { useState, useEffect, useRef, RefObject } from 'react';

interface FocusHandlerResult {
  isFocused: boolean;
  setIsFocused: (isFocused: boolean) => void;
  menuRef: RefObject<HTMLDivElement>;
}

function useFocusHandler(textareaRef: RefObject<HTMLTextAreaElement>): FocusHandlerResult {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleFocus = (e: MouseEvent) => {
      if (
        menuRef.current &&
        menuRef.current.contains(e.target as HTMLDivElement)
      ) {
        setIsFocused(true);
      } else if (
        textareaRef.current &&
        textareaRef.current.contains(e.target as HTMLDivElement)
      ) {
        setIsFocused(true);
      } else {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleFocus);
    return () => {
      document.removeEventListener('mousedown', handleFocus);
    };
  }, [textareaRef]);

  return { isFocused, menuRef , setIsFocused};
}

export default useFocusHandler;
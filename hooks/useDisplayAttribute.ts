import { MutableRefObject, useEffect, useState } from "react";

const useDisplayAttribute = <T extends HTMLElement>(
  elementRef: MutableRefObject<T | null>,
): string | undefined => {
  const [displayValue, setDisplayValue] = useState<string>();

  useEffect(() => {
    const updateDisplayValue = () => {
      if (elementRef.current) {
        setDisplayValue(elementRef.current.style.display);
      }
    };

    const target = elementRef.current;

    if (target) {
      updateDisplayValue();

      const onStyleChange = (mutations: MutationRecord[]) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'style'
          ) {
            updateDisplayValue();
          }
        });
      };

      const observer = new MutationObserver(onStyleChange);
      const config = { attributes: true, attributeFilter: ['style'] };

      observer.observe(target, config);

      return () => {
        observer.disconnect();
      };
    }
  }, [elementRef]);

  return displayValue;
};

export default useDisplayAttribute;
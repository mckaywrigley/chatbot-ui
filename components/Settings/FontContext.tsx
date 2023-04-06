import React, {
  FC,
  createContext,
  Dispatch,
  PropsWithChildren,
  useState,
  useContext,
  SetStateAction,
} from 'react';

interface FontContextValue {
  selectedFont: string;
  setSelectedFont: Dispatch<SetStateAction<string>>;
}

const FontContext = createContext<FontContextValue | undefined>(undefined);

export const FontProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [selectedFont, setSelectedFont] = useState('Inter');

  return (
    <FontContext.Provider value={{ selectedFont, setSelectedFont }}>
      {children}
    </FontContext.Provider>
  );
};

export const useFont = () => {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
};

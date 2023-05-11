import React, { useEffect, useState } from 'react';

interface Props {
  inputValue?: string;
}
function TokenCounter({ inputValue = '' }: Props) {
  const maxToken = 1000;
  const [currentTokenUsage, setCurrentTokenUsage] = useState(0);

  useEffect(() => {
    setCurrentTokenUsage(inputValue.length);
  }, [inputValue]);

  return (
    <div>
      {currentTokenUsage} / {maxToken}
    </div>
  );
}

export default TokenCounter;

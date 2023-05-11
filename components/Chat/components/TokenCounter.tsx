import React, { useEffect, useState } from 'react';

interface Props {
  value?: string;
  className?: string;
}
function TokenCounter({ value = '', className = '' }: Props) {
  const maxToken = 1000;
  const [currentTokenUsage, setCurrentTokenUsage] = useState(0);

  useEffect(() => {
    setCurrentTokenUsage(value.length);
  }, [value]);

  return (
    <div className={className}>
      {currentTokenUsage} / {maxToken}
    </div>
  );
}

export default TokenCounter;

import React, { useMemo } from 'react';

interface Props {
  tier: string;
}

function TierTag({ tier }: Props) {
  const tierColor = useMemo(() => {
    switch (tier.toLowerCase()) {
      case 'free':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'pro':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  }, [tier]);

  return (
    <span
      className={`${tierColor}  font-medium ml-2 mr-2 px-2.5 py-0.5 rounded`}
    >
      {tier}
    </span>
  );
}

export default TierTag;

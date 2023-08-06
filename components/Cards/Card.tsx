import React from 'react';

interface CardProps {
  title: string;
  description: string;
  onSelect: () => void;
}

const Card: React.FC<CardProps> = ({ title, description, onSelect }) => {
  return (
    <button
      className="w-full p-4 m-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-black/5 rounded-lg shadow-md transition-colors"
      onClick={onSelect}
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </button>
  );
};

export default Card;

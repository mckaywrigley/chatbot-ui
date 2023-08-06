import React from 'react';

import Card from './Card';

interface PromptData {
  id: string;
  name: string;
  description: string;
  content: string;
  model: {
    id: string;
    name: string;
    maxLength: number;
    tokenLimit: number;
  };
  folderId: string | null;
}

interface CardListProps {
  cards: PromptData[];
  handlePromptSelect: (prompt: PromptData) => void;
}

const CardList: React.FC<CardListProps> = ({ cards, handlePromptSelect }) => {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {cards.map((prompt) => (
        <Card
          key={prompt.id}
          title={prompt.name}
          description={prompt.description}
          onSelect={() => handlePromptSelect(prompt)}
        />
      ))}
    </div>
  );
};

export default CardList;

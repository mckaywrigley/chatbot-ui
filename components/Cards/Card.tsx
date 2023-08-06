import React from 'react';

interface CardProps {
    title: string;
    description: string;
    onSelect: () => void;
}

const Card: React.FC<CardProps> = ({ title, description, onSelect }) => {
    return (
        <button
            className="w-full md:w-1/2 lg:w-1/3 xl:w-1/4 p-4 m-2 bg-gray-100 hover:bg-gray-300 rounded-lg shadow-md transition-colors"
            onClick={onSelect}
        >
            <div>
                <h2 className="text-xl font-bold mb-2">{title}</h2>
                <p className="text-sm text-gray-600">{description}</p>
            </div>
        </button>
    );
};

export default Card;

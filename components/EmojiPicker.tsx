import React, { useState, forwardRef, useRef } from 'react';
import { emojiCategories } from './emojiData';

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
}

const categoryIcons: Record<string, string> = {
    'Smileys & People': '😊',
    'Animals & Nature': '🐾',
    'Food & Drink': '🍔',
    'Activity': '🎉',
    'Travel & Places': '🚗',
    'Objects': '💡',
    'Symbols': '❤️',
    'Flags': '🏳️',
};

export const EmojiPicker = forwardRef<HTMLDivElement, EmojiPickerProps>(({ onEmojiSelect }, ref) => {
    const [activeCategory, setActiveCategory] = useState(Object.keys(emojiCategories)[0]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleCategoryClick = (category: string) => {
        setActiveCategory(category);
        const container = scrollContainerRef.current;
        const element = document.getElementById(`emoji-category-${category}`);
        if (element && container) {
            // We subtract the container's own offset top to get the relative scroll position
            container.scrollTop = element.offsetTop - container.offsetTop;
        }
    };

    return (
        <div ref={ref} className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-2xl shadow-lg w-80 h-96 flex flex-col overflow-hidden animate-scale-in-menu">
            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-2 custom-scrollbar">
                {Object.entries(emojiCategories).map(([category, emojis]) => (
                    <div key={category} id={`emoji-category-${category}`}>
                        <h3 className="text-sm font-bold text-gray-400 p-2 sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">{category}</h3>
                        <div className="grid grid-cols-8 gap-1">
                            {emojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => onEmojiSelect(emoji)}
                                    className="text-2xl rounded-md hover:bg-gray-700 aspect-square transition-colors"
                                    title={emoji} // for accessibility
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex-shrink-0 grid grid-cols-8 p-1 bg-gray-900/50 border-t border-gray-700">
                {Object.keys(emojiCategories).map(category => (
                    <button
                        key={category}
                        onClick={() => handleCategoryClick(category)}
                        title={category}
                        className={`p-1.5 rounded-lg text-xl transition-colors ${activeCategory === category ? 'bg-blue-600/50' : 'hover:bg-gray-700'}`}
                    >
                        {categoryIcons[category]}
                    </button>
                ))}
            </div>
        </div>
    );
});

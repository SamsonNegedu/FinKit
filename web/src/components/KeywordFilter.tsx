import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface KeywordFilterProps {
    keywords: string[];
    onKeywordsChange: (keywords: string[]) => void;
}

const KeywordFilter: React.FC<KeywordFilterProps> = ({ keywords, onKeywordsChange }) => {
    const [newKeyword, setNewKeyword] = useState('');

    const handleAddKeyword = () => {
        if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
            onKeywordsChange([...keywords, newKeyword.trim()]);
            setNewKeyword('');
        }
    };

    const handleRemoveKeyword = (keywordToRemove: string) => {
        onKeywordsChange(keywords.filter(keyword => keyword !== keywordToRemove));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddKeyword();
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add keyword to filter..."
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
                <button
                    onClick={handleAddKeyword}
                    className="p-1.5 text-blue-600 hover:text-blue-700 focus:outline-none"
                    title="Add keyword"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {keywords.map((keyword) => (
                        <span
                            key={keyword}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                            {keyword}
                            <button
                                onClick={() => handleRemoveKeyword(keyword)}
                                className="ml-1.5 text-blue-600 hover:text-blue-800 focus:outline-none"
                                title="Remove keyword"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KeywordFilter; 

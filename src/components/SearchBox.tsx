import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBoxProps {
    value: string;
    onSearch: (query: string) => void;
    onClear: () => void;
    placeholder?: string;
}

export function SearchBox({ value, onSearch, onClear, placeholder = "Search bookmarks..." }: SearchBoxProps) {
    const [inputValue, setInputValue] = useState(value);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onSearch(newValue);
    };

    const handleClear = () => {
        setInputValue('');
        onClear();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            handleClear();
        }
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto mb-6">
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    id="searchBox"
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus
                    className="w-full pl-9 pr-9 py-2.5 text-base bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
                {inputValue && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
} 
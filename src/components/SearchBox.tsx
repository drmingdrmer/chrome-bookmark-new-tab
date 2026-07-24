import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

// 击键之间的等待时间，避免每敲一个字符就查询一次书签
const SEARCH_DEBOUNCE_MS = 200;

interface SearchBoxProps {
    value: string;
    onSearch: (query: string) => void;
    onClear: () => void;
    placeholder?: string;
}

export function SearchBox({ value, onSearch, onClear, placeholder = "Search bookmarks..." }: SearchBoxProps) {
    const [inputValue, setInputValue] = useState(value);
    const pendingSearch = useRef<ReturnType<typeof setTimeout>>();

    // 输入停止后再查询；组件卸载时取消未触发的查询
    useEffect(() => {
        return () => clearTimeout(pendingSearch.current);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        clearTimeout(pendingSearch.current);
        pendingSearch.current = setTimeout(() => onSearch(newValue), SEARCH_DEBOUNCE_MS);
    };

    const handleClear = () => {
        setInputValue('');
        clearTimeout(pendingSearch.current);
        onClear();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            handleClear();
        }
    };

    return (
        <div className="relative w-full max-w-lg mx-auto">
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
                    className="w-full pl-9 pr-3 py-2.5 text-base bg-white/20 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
            </div>
        </div>
    );
} 
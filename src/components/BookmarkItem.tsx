import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bookmark } from '@/types/bookmark';
import { highlightSearchTerm } from '@/utils/bookmark-helpers';

interface BookmarkItemProps {
    bookmark: Bookmark;
    searchTerm?: string;
    folderPath?: string;
    onDelete: (bookmarkId: string) => void;
    showUrl?: boolean;
    index?: number;
}

export function BookmarkItem({
    bookmark,
    searchTerm = '',
    folderPath = '',
    onDelete,
    showUrl = true
}: BookmarkItemProps) {
    // 搜索模式下禁用拖拽功能
    const isSearchMode = !!searchTerm;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: bookmark.id,
        disabled: isSearchMode  // 搜索模式下禁用拖拽
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm(`Delete "${bookmark.title}"?`);
        if (confirmed) {
            onDelete(bookmark.id);
        }
    };

    const handleLinkClick = (e: React.MouseEvent) => {
        // 如果正在拖拽，阻止链接点击
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    };

    const getHighlightedTitle = () => {
        return searchTerm ? highlightSearchTerm(bookmark.title, searchTerm) : bookmark.title;
    };

    const getHighlightedUrl = () => {
        return searchTerm && bookmark.url ? highlightSearchTerm(bookmark.url, searchTerm) : bookmark.url;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative flex items-start ${isSearchMode ? 'space-x-0' : 'space-x-1'} p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/10 ${isDragging ? 'opacity-50 z-50' : ''
                }`}
        >
            {/* Drag Handle - 只在非搜索模式下显示 */}
            {!isSearchMode && (
                <div
                    {...attributes}
                    {...listeners}
                    className="drag-handle opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity duration-200 mt-0.5 cursor-grab active:cursor-grabbing"
                >
                    <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
            )}

            {/* Bookmark Content */}
            <div className="flex-1 min-w-0">
                <a
                    href={bookmark.url}
                    className="block group-hover:text-blue-300 transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                >
                    <div className="mb-0.5">
                        <h3
                            className="text-sm font-medium text-white truncate leading-tight"
                            dangerouslySetInnerHTML={{ __html: getHighlightedTitle() }}
                        />
                        {/* Debug Info */}
                        <div className="text-xs text-yellow-400 opacity-70 mt-0.5">
                            ID: {bookmark.id} | Index: {bookmark.index ?? 'undefined'}
                        </div>
                    </div>

                    {showUrl && bookmark.url && (
                        <p
                            className="text-sm text-gray-400 truncate leading-tight"
                            dangerouslySetInnerHTML={{ __html: getHighlightedUrl() || '' }}
                        />
                    )}

                    {folderPath && (
                        <p className="text-sm text-gray-500 mt-0.5">
                            📁 {folderPath}
                        </p>
                    )}
                </a>
            </div>

            {/* Delete Button */}
            <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                aria-label={`Delete ${bookmark.title}`}
                tabIndex={isSearchMode ? -1 : 0}  // 搜索模式下不可通过Tab访问
            >
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
    );
} 
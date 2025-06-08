import React from 'react';
import { Folder } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Bookmark } from '@/types/bookmark';
import { BookmarkItem } from './BookmarkItem';
import { getFolderColor } from '@/utils/bookmark-helpers';

interface FolderColumnProps {
    title: string;
    subtitle?: string;
    folderId?: string;
    bookmarks: Bookmark[];
    onDeleteBookmark: (bookmarkId: string) => void;
}

export function FolderColumn({
    title,
    subtitle,
    folderId,
    bookmarks,
    onDeleteBookmark
}: FolderColumnProps) {
    const backgroundColor = folderId ? getFolderColor(folderId) : 'rgba(255, 255, 255, 0.05)';

    const { setNodeRef, isOver } = useDroppable({
        id: folderId || 'root',
    });

    const bookmarkIds = bookmarks.map(bookmark => bookmark.id);

    return (
        <div
            ref={setNodeRef}
            className={`w-full rounded-xl border border-white/10 overflow-hidden transition-all duration-200 ${isOver ? 'ring-2 ring-blue-400/50 border-blue-400/50' : ''
                }`}
            style={{ backgroundColor }}
        >
            {/* Header */}
            <div className="px-3 py-1.5 border-b border-white/10 bg-black/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                        <Folder className="w-4 h-4 text-blue-300" />
                        <h2 className="text-base font-semibold text-white">{title}</h2>
                    </div>
                    {subtitle && (
                        <span className="text-xs text-gray-400">{subtitle}</span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-1.5 max-h-96 overflow-y-auto">
                {bookmarks.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">
                        <Folder className="w-5 h-5 mx-auto mb-1.5 opacity-50" />
                        <p className="text-sm leading-tight">No bookmarks in this folder</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
                            {bookmarks.map((bookmark) => (
                                <BookmarkItem
                                    key={bookmark.id}
                                    bookmark={bookmark}
                                    onDelete={onDeleteBookmark}
                                    showUrl={true}
                                />
                            ))}
                        </SortableContext>
                    </div>
                )}
            </div>
        </div>
    );
} 
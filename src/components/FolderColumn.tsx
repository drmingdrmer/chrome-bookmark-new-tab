import React from 'react';
import { Folder } from 'lucide-react';
import { Bookmark } from '@/types/bookmark';
import { BookmarkItem } from './BookmarkItem';
import { getFolderColor } from '@/utils/bookmark-helpers';

interface FolderColumnProps {
    title: string;
    subtitle?: string;
    folderId?: string;
    bookmarks: Bookmark[];
    onDeleteBookmark: (bookmarkId: string) => void;
    onMoveBookmark?: (bookmarkId: string, targetFolderId: string, newIndex: number) => void;
    allBookmarks?: Record<string, Bookmark>;
}

export function FolderColumn({
    title,
    subtitle,
    folderId,
    bookmarks,
    onDeleteBookmark,
    onMoveBookmark,
    allBookmarks = {}
}: FolderColumnProps) {
    const backgroundColor = folderId ? getFolderColor(folderId) : 'rgba(255, 255, 255, 0.05)';

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        console.log('📁 拖拽到文件夹:', title);

        if (!onMoveBookmark) {
            console.log('❌ 文件夹没有移动处理器');
            return;
        }

        try {
            const draggedId = e.dataTransfer.getData('text/plain');
            if (!draggedId) {
                console.log('❌ 文件夹没有拖拽数据');
                return;
            }

            // Move to the end of this folder
            const newIndex = bookmarks.length;

            console.log(`🎯 移动书签 ${draggedId} 到文件夹 ${folderId} 位置 ${newIndex}`);
            onMoveBookmark(draggedId, folderId || '', newIndex);
        } catch (error) {
            console.error('Error handling folder drop:', error);
        }
    };

    return (
        <div
            className="flex-shrink-0 w-80 rounded-xl border border-white/10 overflow-hidden"
            style={{ backgroundColor }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
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
                        {bookmarks.map((bookmark, index) => (
                            <BookmarkItem
                                key={bookmark.id}
                                bookmark={bookmark}
                                onDelete={onDeleteBookmark}
                                onMove={onMoveBookmark}
                                showUrl={true}
                                index={index}
                                allBookmarks={allBookmarks}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 
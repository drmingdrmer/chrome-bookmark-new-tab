import React from 'react';
import { Folder, Eraser } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Bookmark } from '@/types/bookmark';
import { BookmarkItem } from './BookmarkItem';
import { getFolderColor } from '@/utils/bookmark-helpers';

interface FolderColumnProps {
    title: string;
    subtitle?: string;
    folderId?: string;
    folderPath?: string;
    bookmarks: Bookmark[];
    onDeleteBookmark: (bookmarkId: string) => void;
    onUpdateBookmark?: (bookmarkId: string, updates: Partial<Bookmark>) => void;
}

// Color palette for accent lines
const ACCENT_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange  
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#6366f1', // Indigo
    '#84cc16', // Lime
];

let accentColorMap: Record<string, string> = {};
let accentColorIndex = 0;

function getAccentColor(folderId: string): string {
    if (!accentColorMap[folderId]) {
        accentColorMap[folderId] = ACCENT_COLORS[accentColorIndex % ACCENT_COLORS.length];
        accentColorIndex++;
    }
    return accentColorMap[folderId];
}

export function FolderColumn({
    title,
    subtitle,
    folderId,
    folderPath,
    bookmarks,
    onDeleteBookmark,
    onUpdateBookmark
}: FolderColumnProps) {
    const accentColor = folderId ? getAccentColor(folderId) : '#3b82f6';

    const { setNodeRef, isOver } = useDroppable({
        id: folderId || 'root',
    });

    const bookmarkIds = bookmarks.map(bookmark => bookmark.id);

    // 清理书签标题的函数
    const cleanBookmarkTitles = async () => {
        // 正则表达式匹配模式：多个[]包围的文字 + 空格 + ***
        const pattern = /^(\[[^\]]+\]\s*)+\*\*\*\s*/;

        const bookmarksToUpdate = bookmarks.filter(bookmark =>
            pattern.test(bookmark.title)
        );

        if (bookmarksToUpdate.length === 0) {
            return;
        }

        const confirmed = window.confirm(
            `将清理 ${bookmarksToUpdate.length} 个书签的标题格式，继续吗？`
        );

        if (!confirmed) {
            return;
        }

        try {
            for (const bookmark of bookmarksToUpdate) {
                const cleanTitle = bookmark.title.replace(pattern, '');
                await chrome.bookmarks.update(bookmark.id, {
                    title: cleanTitle
                });

                // 逐个通知父组件更新书签
                if (onUpdateBookmark) {
                    onUpdateBookmark(bookmark.id, { title: cleanTitle });
                }
            }
        } catch (error) {
            console.error('清理书签标题失败:', error);
            alert('清理失败，请检查扩展权限');
        }
    };

    return (
        <div
            ref={setNodeRef}
            className={`group w-full h-full rounded-xl border border-white/10 overflow-hidden transition-all duration-200 flex flex-col ${isOver ? 'ring-2 ring-blue-400/50 border-blue-400/50' : ''
                }`}
        >
            {/* Header */}
            <div className="px-3 py-1.5 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-white truncate leading-tight">
                            {title}
                            {folderPath && (
                                <span className="text-xs font-normal text-gray-400 ml-2">
                                    {folderPath}
                                </span>
                            )}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {subtitle && (
                            <span className="text-xs text-gray-400">{subtitle}</span>
                        )}

                        {/* 清理按钮 */}
                        <button
                            onClick={cleanBookmarkTitles}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                            title="清理书签标题格式"
                        >
                            <Eraser className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Accent Line */}
            <div
                className="h-0.5"
                style={{ backgroundColor: accentColor }}
            ></div>

            {/* Content */}
            <div className="p-1.5 bg-black/50 backdrop-blur-sm flex-1">
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
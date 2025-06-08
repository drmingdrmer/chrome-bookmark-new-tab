import React, { useState } from 'react';
import { Folder, Eraser, Brain } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Bookmark } from '@/types/bookmark';
import { BookmarkItem } from './BookmarkItem';
import { getFolderColor } from '@/utils/bookmark-helpers';
import { useBookmarkRatings } from '@/hooks/useBookmarkRatings';

interface FolderColumnProps {
    title: string;
    subtitle?: string;
    folderId?: string;
    folderPath?: string;
    bookmarks: Bookmark[];
    onDeleteBookmark: (bookmarkId: string) => void;
    onUpdateBookmark?: (bookmarkId: string, updates: Partial<Bookmark>) => void;
    showDebugInfo?: boolean;
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
    onUpdateBookmark,
    showDebugInfo = false
}: FolderColumnProps) {
    const [isRating, setIsRating] = useState(false);
    const accentColor = folderId ? getAccentColor(folderId) : '#3b82f6';

    const {
        rateBookmarks,
        isLoading: ratingsLoading,
        error: ratingsError,
        progressStep,
        showSuccess,
        clearError
    } = useBookmarkRatings();

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

    // AI评分功能
    const handleAIRating = async () => {
        const bookmarksWithUrls = bookmarks.filter(bookmark => bookmark.url);

        if (bookmarksWithUrls.length === 0) {
            alert('此文件夹中没有可评分的书签');
            return;
        }

        const confirmed = window.confirm(
            `将对 ${bookmarksWithUrls.length} 个书签进行AI评分，这可能需要几秒钟时间。继续吗？`
        );

        if (!confirmed) {
            return;
        }

        setIsRating(true);
        clearError();

        try {
            const ratings = await rateBookmarks(bookmarksWithUrls);
            if (ratings && ratings.length > 0) {
                // 不显示alert，用户已经能看到进度完成状态
                console.log(`✅ 成功评分 ${ratings.length} 个书签！`);
            }
        } catch (error) {
            console.error('AI评分失败:', error);
            alert(`评分失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsRating(false);
        }
    };

    return (
        <div
            ref={setNodeRef}
            className={`w-full h-full rounded-xl border border-white/10 overflow-hidden transition-all duration-200 flex flex-col ${isOver ? 'ring-2 ring-blue-400/50 border-blue-400/50' : ''
                }`}
        >
            {/* Header */}
            <div className="group px-3 py-1.5 bg-black/20 backdrop-blur-sm">
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

                        {/* AI评分按钮 */}
                        <button
                            onClick={handleAIRating}
                            disabled={isRating || ratingsLoading}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-gray-400 hover:text-purple-300 hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed relative"
                            title={ratingsLoading && progressStep ? progressStep : "AI评分书签"}
                        >
                            <Brain className={`w-3 h-3 ${isRating || ratingsLoading ? 'animate-pulse' : ''}`} />

                            {/* 进度指示器 */}
                            {(ratingsLoading && progressStep) && (
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-lg border border-white/20">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                        <span>{progressStep}</span>
                                    </div>
                                </div>
                            )}

                            {/* 成功指示器 */}
                            {showSuccess && (
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-900/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-lg border border-green-400/30">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span>✅ 评分完成！</span>
                                    </div>
                                </div>
                            )}
                        </button>

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
                                    showDebugInfo={showDebugInfo}
                                />
                            ))}
                        </SortableContext>
                    </div>
                )}
            </div>
        </div>
    );
} 
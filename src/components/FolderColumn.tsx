import React, { useState, useEffect } from 'react';
import { Folder, Eraser, Brain } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Bookmark } from '@/types/bookmark';
import BookmarkItem from './BookmarkItem';
import { getFolderColor } from '@/utils/bookmark-helpers';
import { useBookmarkRatings } from '@/hooks/useBookmarkRatings';
import { BookmarkRating } from '@/utils/bookmark-ratings';

interface FolderColumnProps {
    title: string;
    subtitle?: string;
    folderId?: string;
    folderPath?: string;
    bookmarks: Bookmark[];
    onDeleteBookmark: (bookmarkId: string) => void;
    onUpdateBookmark?: (bookmarkId: string, updates: Partial<Bookmark>) => void;
    showDebugInfo?: boolean;
    allRatings?: Record<string, BookmarkRating>;
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

function FolderColumn({
    title,
    subtitle,
    folderId,
    folderPath,
    bookmarks,
    onDeleteBookmark,
    onUpdateBookmark,
    showDebugInfo = false,
    allRatings = {}
}: FolderColumnProps) {
    const [isRating, setIsRating] = useState(false);
    const [showRatingStatus, setShowRatingStatus] = useState(false);
    const accentColor = folderId ? getAccentColor(folderId) : '#3b82f6';

    const {
        rateBookmarks,
        isLoading: ratingsLoading,
        error: ratingsError,
        progressStep,
        showSuccess,
        clearError,
        clearStatus
    } = useBookmarkRatings();

    // 监听评分完成，自动隐藏状态区域
    useEffect(() => {
        if (showSuccess && !ratingsLoading) {
            // 评分成功后2秒自动隐藏状态区域
            const timer = setTimeout(() => {
                setShowRatingStatus(false);
                clearStatus(); // 清除所有状态
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [showSuccess, ratingsLoading, clearStatus]);

    // 当评分状态重置时，也隐藏状态区域
    useEffect(() => {
        if (!isRating && !ratingsLoading && !showSuccess && !ratingsError) {
            setShowRatingStatus(false);
        }
    }, [isRating, ratingsLoading, showSuccess, ratingsError]);

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
            return;
        }

        setIsRating(true);
        setShowRatingStatus(true);
        clearError();

        try {
            await rateBookmarks(bookmarksWithUrls);
        } catch (error) {
            console.error('AI评分失败:', error);
        } finally {
            setIsRating(false);
        }
    };

    // 关闭状态显示
    const handleCloseRatingStatus = () => {
        setShowRatingStatus(false);
        clearStatus(); // 清除所有状态
    };

    return (
        <div
            ref={setNodeRef}
            className={`w-full h-full rounded-xl border border-white/10 overflow-hidden flex flex-col ${isOver ? 'ring-2 ring-blue-400/50 border-blue-400/50' : ''
                }`}
        >
            {/* Header */}
            <div className="group px-3 py-1.5 bg-black/20">
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
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-purple-300 hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="AI评分书签"
                        >
                            <Brain className={`w-3 h-3 ${isRating || ratingsLoading ? 'animate-pulse' : ''}`} />
                        </button>

                        {/* 清理按钮 */}
                        <button
                            onClick={cleanBookmarkTitles}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
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

            {/* AI评分状态显示区域 */}
            {showRatingStatus && (
                <div className="px-3 py-2 bg-blue-500 border-b border-blue-400">
                    {ratingsLoading && progressStep && (
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse flex-shrink-0"></div>
                            <span className="text-sm text-white flex-1">{progressStep}</span>
                        </div>
                    )}

                    {showSuccess && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-green-400 rounded-full flex-shrink-0"></div>
                                <span className="text-sm text-green-300">✅ AI评分完成！所有书签已完成智能评分</span>
                            </div>
                            <button
                                onClick={handleCloseRatingStatus}
                                className="text-gray-400 hover:text-white text-sm px-2 py-1 hover:bg-white/10 rounded"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {ratingsError && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-red-400 rounded-full flex-shrink-0"></div>
                                <span className="text-sm text-red-300">❌ 评分失败: {ratingsError}</span>
                            </div>
                            <button
                                onClick={handleCloseRatingStatus}
                                className="text-gray-400 hover:text-white text-sm px-2 py-1 hover:bg-white/10 rounded"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-1.5 bg-black/40 flex-1">
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
                                    preloadedRating={bookmark.url ? allRatings[bookmark.url] : undefined}
                                />
                            ))}
                        </SortableContext>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(FolderColumn);
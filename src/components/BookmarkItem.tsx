import React, { useEffect, useState } from 'react';
import { Trash2, GripVertical, Star } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bookmark } from '@/types/bookmark';
import { highlightSearchTerm } from '@/utils/bookmark-helpers';
import { BookmarkRating, getRating } from '@/utils/bookmark-ratings';

interface BookmarkItemProps {
    bookmark: Bookmark;
    searchTerm?: string;
    folderPath?: string;
    onDelete: (bookmarkId: string) => void;
    showUrl?: boolean;
    index?: number;
    showDebugInfo?: boolean;
}

export function BookmarkItem({
    bookmark,
    searchTerm = '',
    folderPath = '',
    onDelete,
    showUrl = true,
    showDebugInfo = false
}: BookmarkItemProps) {
    // 搜索模式下禁用拖拽功能
    const isSearchMode = !!searchTerm;

    // 评分状态
    const [rating, setRating] = useState<BookmarkRating | null>(null);

    // 加载评分
    useEffect(() => {
        if (bookmark.url) {
            getRating(bookmark.url).then(setRating).catch(() => setRating(null));
        }
    }, [bookmark.url]);

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
        if (!bookmark.url) return '';

        // 移除协议前缀
        const cleanUrl = bookmark.url.replace(/^https?:\/\//, '');

        return searchTerm ? highlightSearchTerm(cleanUrl, searchTerm) : cleanUrl;
    };

    // 获取评分星级
    const getStarRating = (score: number) => {
        const fullStars = Math.floor(score / 20); // 100分满分，每20分一颗星
        const halfStar = (score % 20) >= 10; // 10分以上显示半星
        return { fullStars, halfStar };
    };

    // 获取评分颜色
    const getRatingColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative flex items-start ${isSearchMode ? 'space-x-0' : 'space-x-1'} p-1 rounded-lg transition-all duration-200 border border-transparent hover:border-white/10 ${isDragging ? 'opacity-50 z-50' : ''
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

            {/* Bookmark Content - 现在占据全部可用空间 */}
            <div className="flex-1 min-w-0 relative">
                <a
                    href={bookmark.url}
                    className="block group-hover:text-blue-300 transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                >
                    <div className="mb-0.5">
                        <div className="flex items-center justify-between">
                            <h3
                                className="text-sm font-medium text-gray-200 truncate leading-tight flex-1"
                                dangerouslySetInnerHTML={{ __html: getHighlightedTitle() }}
                            />

                            {/* AI评分显示 */}
                            {rating && (
                                <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                                    {/* 星级显示 */}
                                    <div className="flex items-center">
                                        {[...Array(getStarRating(rating.score).fullStars)].map((_, i) => (
                                            <Star key={i} className={`w-3 h-3 ${getRatingColor(rating.score)} fill-current`} />
                                        ))}
                                        {getStarRating(rating.score).halfStar && (
                                            <Star className={`w-3 h-3 ${getRatingColor(rating.score)} fill-current opacity-50`} />
                                        )}
                                    </div>

                                    {/* 分数显示 */}
                                    <span className={`text-xs ${getRatingColor(rating.score)} font-medium`}>
                                        {rating.score}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* AI评分详情 */}
                        {rating && (
                            <div className="text-xs text-gray-400 mt-0.5">
                                <span className="text-gray-500">{rating.dimension}</span>
                                {rating.reason && (
                                    <span className="ml-2 text-gray-400" title={rating.reason}>
                                        {rating.reason.length > 50 ? rating.reason.substring(0, 50) + '...' : rating.reason}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Debug Info */}
                        {showDebugInfo && (
                            <div className="text-xs text-yellow-400 opacity-70 mt-0.5">
                                ID: {bookmark.id} | Index: {bookmark.index ?? 'undefined'}
                            </div>
                        )}
                    </div>

                    {showUrl && bookmark.url && (
                        <p
                            className="text-sm text-gray-500 truncate leading-tight"
                            dangerouslySetInnerHTML={{ __html: getHighlightedUrl() || '' }}
                        />
                    )}

                    {folderPath && (
                        <p className="text-sm text-gray-500 mt-0.5">
                            📁 {folderPath}
                        </p>
                    )}
                </a>

                {/* Delete Button - 绝对定位在右下角，紧贴边界 */}
                <button
                    onClick={handleDelete}
                    className="absolute -bottom-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 text-white bg-black/60 hover:text-white hover:bg-red-500/80 rounded backdrop-blur-sm z-10 border border-white/20"
                    aria-label={`Delete ${bookmark.title}`}
                    tabIndex={isSearchMode ? -1 : 0}  // 搜索模式下不可通过Tab访问
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
} 
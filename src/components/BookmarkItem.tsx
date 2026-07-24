import React from 'react';
import { Trash2, GripVertical, Star } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bookmark } from '@/types/bookmark';
import { splitBySearchTerm } from '@/utils/bookmark-helpers';
import { BookmarkRating } from '@/utils/bookmark-ratings';

function Highlighted({ text, searchTerm }: { text: string; searchTerm: string }) {
    return (
        <>
            {splitBySearchTerm(text, searchTerm).map((segment, index) =>
                segment.isMatch ? (
                    <mark key={index} className="bg-yellow-200 text-gray-900">{segment.text}</mark>
                ) : (
                    <React.Fragment key={index}>{segment.text}</React.Fragment>
                )
            )}
        </>
    );
}

interface BookmarkItemProps {
    bookmark: Bookmark;
    searchTerm?: string;
    folderPath?: string;
    onDelete: (bookmarkId: string) => void;
    showUrl?: boolean;
    index?: number;
    showDebugInfo?: boolean;
    rating?: BookmarkRating | null;
}

function BookmarkItem({
    bookmark,
    searchTerm = '',
    folderPath = '',
    onDelete,
    showUrl = true,
    showDebugInfo = false,
    rating = null
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
        return <Highlighted text={bookmark.title} searchTerm={searchTerm} />;
    };

    const getHighlightedUrl = () => {
        if (!bookmark.url) return null;

        // 移除协议前缀
        const cleanUrl = bookmark.url.replace(/^https?:\/\//, '');

        return <Highlighted text={cleanUrl} searchTerm={searchTerm} />;
    };

    // 获取评分星级 (适配1-10分制)
    const getStarRating = (score: number) => {
        const fullStars = Math.floor(score / 2); // 10分满分，每2分一颗星
        const halfStar = (score % 2) >= 1; // 1分以上显示半星
        return { fullStars, halfStar };
    };

    // 获取评分颜色 (纯黄色到灰色的渐变)
    const getRatingColor = (score: number) => {
        if (score >= 9) return 'text-yellow-600';     // 9-10分：暗黄色
        if (score >= 8) return 'text-yellow-700';     // 8分：纯黄色
        if (score >= 7) return 'text-yellow-800';     // 7分：深黄色
        if (score >= 6) return 'text-yellow-900';     // 6分：更深黄色
        if (score >= 5) return 'text-gray-400';       // 5分：浅灰色
        if (score >= 4) return 'text-gray-500';       // 4分：中等灰色
        if (score >= 3) return 'text-gray-600';       // 3分：深灰色
        return 'text-gray-700';                       // 1-2分：最深灰色
    };



    // 获取维度的视觉样式
    const getDimensionStyle = (dimension: string) => {
        const styles = {
            work: {
                bgColor: 'bg-blue-500/10',
                borderColor: 'border-blue-400/30',
                textColor: 'text-blue-400',
                icon: '💼',
                label: '工作'
            },
            learn: {
                bgColor: 'bg-green-500/10',
                borderColor: 'border-green-400/30',
                textColor: 'text-green-400',
                icon: '📚',
                label: '学习'
            },
            fun: {
                bgColor: 'bg-pink-500/10',
                borderColor: 'border-pink-400/30',
                textColor: 'text-pink-400',
                icon: '🎮',
                label: '娱乐'
            },
            tool: {
                bgColor: 'bg-slate-600/10',
                borderColor: 'border-slate-500/30',
                textColor: 'text-slate-400',
                icon: '🔧',
                label: '工具'
            },
            other: {
                bgColor: 'bg-gray-500/10',
                borderColor: 'border-gray-400/30',
                textColor: 'text-gray-400',
                icon: '📄',
                label: '其他'
            }
        };
        return styles[dimension as keyof typeof styles] || styles.other;
    };



    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative flex items-start ${isSearchMode ? 'space-x-0' : 'space-x-1'} p-1 rounded-lg border border-transparent hover:border-white/10 ${isDragging ? 'opacity-50 z-50' : ''}`}
        >
            {/* Drag Handle - 只在非搜索模式下显示 */}
            {!isSearchMode && (
                <div
                    {...attributes}
                    {...listeners}
                    className="drag-handle opacity-0 group-hover:opacity-50 hover:opacity-100 mt-0.5 cursor-grab active:cursor-grabbing"
                >
                    <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
            )}

            {/* Bookmark Content - 现在占据全部可用空间 */}
            <div className="flex-1 min-w-0 relative">
                <a
                    href={bookmark.url}
                    className="block group-hover:text-blue-300"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                >
                    <div className="mb-0.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-200 truncate leading-tight flex-1">
                                {getHighlightedTitle()}
                            </h3>

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
                            <div className="text-xs mt-0.5 text-gray-400" title={rating.reason || ''}>
                                <span className={`font-medium ${getDimensionStyle(rating.dimension).textColor}`}>
                                    ● {getDimensionStyle(rating.dimension).label}
                                </span>
                                {rating.reason && (
                                    <span> {rating.reason}</span>
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
                        <p className="text-sm text-gray-500 truncate leading-tight">
                            {getHighlightedUrl()}
                        </p>
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
                    className="absolute -bottom-0.5 -right-0.5 opacity-0 group-hover:opacity-100 p-1 text-white bg-black/80 hover:text-white hover:bg-red-500/80 rounded z-10 border border-white/20"
                    aria-label={`Delete ${bookmark.title}`}
                    tabIndex={isSearchMode ? -1 : 0}  // 搜索模式下不可通过Tab访问
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

export default React.memo(BookmarkItem);
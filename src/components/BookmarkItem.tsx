import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Bookmark } from '@/types/bookmark';
import { highlightSearchTerm } from '@/utils/bookmark-helpers';

interface BookmarkItemProps {
    bookmark: Bookmark;
    searchTerm?: string;
    folderPath?: string;
    onDelete: (bookmarkId: string) => void;
    onMove?: (bookmarkId: string, targetFolderId: string, newIndex: number) => void;
    showUrl?: boolean;
    index?: number;
    allBookmarks?: Record<string, Bookmark>;
}

export function BookmarkItem({
    bookmark,
    searchTerm = '',
    folderPath = '',
    onDelete,
    onMove,
    showUrl = true,
    index = 0,
    allBookmarks = {}
}: BookmarkItemProps) {
    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm(`Delete "${bookmark.title}"?`);
        if (confirmed) {
            onDelete(bookmark.id);
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        console.log('🚀 拖拽开始:', bookmark.title);

        // 停止事件传播，防止父元素干扰
        e.stopPropagation();

        // 检查dataTransfer是否存在
        if (!e.dataTransfer) {
            console.error('❌ dataTransfer不存在!');
            return;
        }

        try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', bookmark.id);
            console.log('✅ 拖拽数据设置成功:', bookmark.id);
        } catch (error) {
            console.error('❌ 设置拖拽数据失败:', error);
        }

        // Add dragging class for visual feedback
        const element = e.currentTarget as HTMLElement;
        element.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        console.log('🏁 拖拽结束:', bookmark.title);
        e.stopPropagation();

        // Remove dragging class when drag operation ends
        const element = e.currentTarget as HTMLElement;
        element.classList.remove('dragging');

        // Remove any remaining drag-over classes from all elements
        const allElements = document.querySelectorAll('.drag-over');
        allElements.forEach(el => el.classList.remove('drag-over'));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }

        const element = e.currentTarget as HTMLElement;
        element.classList.add('drag-over');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const element = e.currentTarget as HTMLElement;
        element.classList.remove('drag-over');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('📦 拖拽放下到:', bookmark.title);

        const element = e.currentTarget as HTMLElement;
        element.classList.remove('drag-over');

        if (!onMove) {
            console.log('❌ 没有移动处理器');
            return;
        }

        // 添加更好的错误处理
        if (!e.dataTransfer) {
            console.error('❌ dataTransfer 不存在');
            return;
        }

        try {
            const draggedId = e.dataTransfer.getData('text/plain');
            console.log('📋 获取到拖拽ID:', draggedId);

            if (!draggedId) {
                console.log('❌ 没有拖拽数据');
                return;
            }

            if (draggedId === bookmark.id) {
                console.log('❌ 不能拖拽到自己');
                return;
            }

            // Determine drop position based on mouse position
            const rect = element.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const dropBefore = e.clientY < midY;

            // Calculate new index based on target position
            let newIndex = index;

            // If dropping before this item, use its current index
            if (dropBefore) {
                newIndex = index;
            } else {
                // If dropping after this item, use the next index
                newIndex = index + 1;
            }

            // If dragged item is from the same parent and has a lower index,
            // we need to adjust because removing it will shift indices
            const draggedBookmark = allBookmarks[draggedId];
            if (draggedBookmark && draggedBookmark.parentId === bookmark.parentId) {
                // Find current index of dragged item in the same folder
                const siblings = Object.values(allBookmarks).filter(b =>
                    b.parentId === bookmark.parentId && !b.isFolder
                );
                const draggedCurrentIndex = siblings.findIndex(b => b.id === draggedId);

                if (draggedCurrentIndex !== -1 && draggedCurrentIndex < index) {
                    // Dragged item is before target, so adjust target index down by 1
                    newIndex = Math.max(0, newIndex - 1);
                }
            }

            console.log(`🎯 移动书签 ${draggedId} 到文件夹 ${bookmark.parentId} 位置 ${newIndex}`);
            onMove(draggedId, bookmark.parentId || '', newIndex);
        } catch (error) {
            console.error('❌ 处理拖拽失败:', error);
        }
    };

    const handleLinkClick = (e: React.MouseEvent) => {
        // 如果正在拖拽，阻止链接点击
        const container = (e.currentTarget as HTMLElement).closest('[draggable="true"]');
        if (container && container.classList.contains('dragging')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // 如果点击的是拖拽手柄，准备拖拽
        const target = e.target as HTMLElement;
        if (target.closest('.drag-handle')) {
            e.preventDefault();
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
            className="group relative flex items-start space-x-1 p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/10"
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseDown={handleMouseDown}
        >
            {/* Drag Handle */}
            <div
                className="drag-handle opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity duration-200 mt-0.5 cursor-grab active:cursor-grabbing"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <GripVertical className="w-3 h-3 text-gray-400" />
            </div>

            {/* Bookmark Content */}
            <div className="flex-1 min-w-0">
                <a
                    href={bookmark.url}
                    className="block group-hover:text-blue-300 transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                >
                    <div className="mb-0.5">
                        <h3
                            className="text-sm font-medium text-white truncate leading-tight"
                            dangerouslySetInnerHTML={{ __html: getHighlightedTitle() }}
                        />
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
            >
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
    );
} 
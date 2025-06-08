import React from 'react';
import { Settings, AlertCircle, Loader2 } from 'lucide-react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { SearchBox } from './SearchBox';
import { BookmarkItem } from './BookmarkItem';
import { FolderColumn } from './FolderColumn';
import { SettingsPanel } from './SettingsPanel';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useSettings } from '@/hooks/useSettings';
import { chunkArray, countItemsInFolder } from '@/utils/bookmark-helpers';
import { Bookmark } from '@/types/bookmark';

export function App() {
    const {
        allBookmarks,
        searchResults,
        searchTerm,
        isLoading: bookmarksLoading,
        error: bookmarksError,
        searchBookmarks,
        deleteBookmark,
        moveBookmark,
        getFolderData,
        clearSearch,
    } = useBookmarks();

    const {
        config,
        isSettingsOpen,
        isLoading: settingsLoading,
        error: settingsError,
        toggleSettings,
        closeSettings,
        updateMaxEntries,
    } = useSettings();

    const [activeBookmark, setActiveBookmark] = React.useState<Bookmark | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const isLoading = bookmarksLoading || settingsLoading;
    const error = bookmarksError || settingsError;

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const bookmark = allBookmarks[active.id as string];
        if (bookmark) {
            setActiveBookmark(bookmark);
            console.log('🚀 开始拖拽:', bookmark.title);
        }
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        console.log('📍 拖拽经过:', over.id);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveBookmark(null);

        if (!over || active.id === over.id) {
            console.log('🏁 拖拽取消或位置未改变');
            return;
        }

        const activeBookmark = allBookmarks[active.id as string];
        const overItem = allBookmarks[over.id as string];

        if (!activeBookmark) {
            console.log('❌ 未找到拖拽的书签');
            return;
        }

        console.log('📦 拖拽结束:', activeBookmark.title, '到', over.id);

        // 情况1: 拖拽到文件夹上
        if (overItem?.isFolder) {
            const targetFolderId = overItem.id;
            const targetFolderBookmarks = Object.values(allBookmarks)
                .filter(b => b.parentId === targetFolderId && !b.isFolder)
                .sort((a, b) => (a.index || 0) - (b.index || 0));
            const newIndex = targetFolderBookmarks.length;

            console.log(`🎯 移动书签 ${activeBookmark.id} 到文件夹 ${targetFolderId} 位置 ${newIndex}`);
            moveBookmark(activeBookmark.id, targetFolderId, newIndex);
            return;
        }

        // 情况2: 拖拽到文件夹列容器上（over.id是文件夹ID字符串，但不在allBookmarks中）
        if (typeof over.id === 'string' && !overItem) {
            // 检查over.id是否是一个有效的文件夹ID
            const folderId = over.id;

            // 如果是'root'或者确实是文件夹ID，则移动到该文件夹
            if (folderId === 'root' || folderId.startsWith('direct-')) {
                const targetFolderId = folderId === 'root' ? '' : '';
                const targetFolderBookmarks = Object.values(allBookmarks)
                    .filter(b => b.parentId === targetFolderId && !b.isFolder)
                    .sort((a, b) => (a.index || 0) - (b.index || 0));
                const newIndex = targetFolderBookmarks.length;

                console.log(`🎯 移动书签 ${activeBookmark.id} 到根目录 位置 ${newIndex}`);
                moveBookmark(activeBookmark.id, targetFolderId, newIndex);
                return;
            }

            // 检查是否是有效的文件夹ID
            const folderExists = Object.values(allBookmarks).some(b => b.isFolder && b.id === folderId);
            if (folderExists) {
                const targetFolderBookmarks = Object.values(allBookmarks)
                    .filter(b => b.parentId === folderId && !b.isFolder)
                    .sort((a, b) => (a.index || 0) - (b.index || 0));
                const newIndex = targetFolderBookmarks.length;

                console.log(`🎯 移动书签 ${activeBookmark.id} 到文件夹 ${folderId} 位置 ${newIndex}`);
                moveBookmark(activeBookmark.id, folderId, newIndex);
                return;
            }

            console.log('❌ 无法识别的拖拽目标:', over.id);
            return;
        }

        // 情况3: 拖拽到另一个书签上，进行同文件夹内重排序
        if (overItem && !overItem.isFolder &&
            activeBookmark.parentId === overItem.parentId) {

            const parentId = activeBookmark.parentId || '';

            // 使用目标书签的index作为新位置
            const targetIndex = overItem.index || 0;
            const activeIndex = activeBookmark.index || 0;

            // 如果拖拽到原位置，则不需要移动
            if (targetIndex === activeIndex) {
                console.log('🔄 位置没有变化，无需移动');
                return;
            }

            // 计算新的索引位置
            // 如果向后移动，新位置是目标位置+1；如果向前移动，新位置就是目标位置
            const newIndex = activeIndex <= targetIndex ? targetIndex + 1 : targetIndex;

            console.log(`🔄 重排序: ${activeBookmark.title} 从位置 ${activeIndex} 到 ${newIndex}`);

            // Case 3: 同文件夹内重新排序
            console.log('📝 同文件夹内重新排序');

            // Chrome API的index参数是最终位置，直接使用newIndex即可
            // 之前的"减1"逻辑是错误的理解
            console.log(`🎯 移动到目标位置: ${newIndex}`);

            moveBookmark(activeBookmark.id, parentId, newIndex);
            return;
        }

        // 情况4: 拖拽到不同文件夹的书签上，移动到该书签所在的文件夹
        if (overItem && !overItem.isFolder &&
            activeBookmark.parentId !== overItem.parentId) {

            const targetFolderId = overItem.parentId || '';

            // 使用目标书签的index作为插入位置（在其后插入）
            const newIndex = (overItem.index || 0) + 1;

            console.log(`🎯 移动书签 ${activeBookmark.id} 到文件夹 ${targetFolderId} 位置 ${newIndex}`);
            moveBookmark(activeBookmark.id, targetFolderId, newIndex);
            return;
        }

        console.log('❌ 未处理的拖拽情况:', { activeId: active.id, overId: over.id, overItem });
    }

    // Render search results
    const renderSearchResults = () => {
        if (searchResults.length === 0) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-base mb-1">No bookmarks found</p>
                    <p className="text-sm">Try searching with different keywords</p>
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 text-center">
                    <p className="text-gray-400">
                        Found {searchResults.length} bookmark{searchResults.length !== 1 ? 's' : ''}
                        matching "{searchTerm}"
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map(({ bookmark, folderPath }) => (
                        <BookmarkItem
                            key={bookmark.id}
                            bookmark={bookmark}
                            searchTerm={searchTerm}
                            folderPath={folderPath}
                            onDelete={deleteBookmark}
                            showUrl={true}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Render bookmark folders
    const renderBookmarkFolders = () => {
        const { folders, directBookmarks } = getFolderData();

        const columns: React.ReactNode[] = [];

        // Add direct bookmarks column if any exist
        if (directBookmarks.length > 0) {
            const chunks = chunkArray(directBookmarks, config.maxEntriesPerColumn);
            chunks.forEach((chunk, index) => {
                const subtitle = chunks.length > 1 ? `(${index + 1}/${chunks.length})` : undefined;
                columns.push(
                    <FolderColumn
                        key={`direct-${index}`}
                        title="Direct Bookmarks"
                        subtitle={subtitle}
                        bookmarks={chunk}
                        onDeleteBookmark={deleteBookmark}
                    />
                );
            });
        }

        // Add folder columns
        folders.forEach(folder => {
            if (!folder.children || folder.children.length === 0) return;

            const folderBookmarks = folder.children
                .map(childId => allBookmarks[childId])
                .filter(bookmark => bookmark && !bookmark.isFolder);

            const itemCount = countItemsInFolder(folder, allBookmarks);

            if (itemCount <= config.maxEntriesPerColumn) {
                // Single column for this folder
                columns.push(
                    <FolderColumn
                        key={folder.id}
                        title={folder.title}
                        folderId={folder.id}
                        bookmarks={folderBookmarks}
                        onDeleteBookmark={deleteBookmark}
                    />
                );
            } else {
                // Split into multiple columns
                const chunks = chunkArray(folderBookmarks, config.maxEntriesPerColumn);
                chunks.forEach((chunk, index) => {
                    const subtitle = `(${index + 1}/${chunks.length})`;
                    columns.push(
                        <FolderColumn
                            key={`${folder.id}-${index}`}
                            title={folder.title}
                            subtitle={subtitle}
                            folderId={folder.id}
                            bookmarks={chunk}
                            onDeleteBookmark={deleteBookmark}
                        />
                    );
                });
            }
        });

        if (columns.length === 0) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-base mb-1">No bookmarks found</p>
                    <p className="text-sm">Start adding bookmarks to see them here</p>
                </div>
            );
        }

        return (
            <div className="grid gap-3" style={{
                gridTemplateColumns: 'repeat(auto-fill, 300px)',
                justifyContent: 'start'
            }}>
                {columns}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                    <p className="text-lg">Loading bookmarks...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-lg mb-2">Error loading bookmarks</p>
                    <p className="text-sm text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-gray-900">
                {/* Header */}
                <header className="relative p-4">
                    {/* Settings Button */}
                    <button
                        id="settings-toggle"
                        onClick={toggleSettings}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                        aria-label="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    {/* Search Box */}
                    <SearchBox
                        value={searchTerm}
                        onSearch={searchBookmarks}
                        onClear={clearSearch}
                    />
                </header>

                {/* Main Content */}
                <main id="bookmarks-container" className="max-w-none mx-auto px-4 pb-4">
                    {searchTerm ? renderSearchResults() : renderBookmarkFolders()}
                </main>

                {/* Settings Panel */}
                <SettingsPanel
                    isOpen={isSettingsOpen}
                    config={config}
                    onClose={closeSettings}
                    onUpdateMaxEntries={updateMaxEntries}
                />

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeBookmark ? (
                        <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 rounded-lg p-2 rotate-3 scale-105">
                            <BookmarkItem
                                bookmark={activeBookmark}
                                onDelete={() => { }}
                                showUrl={false}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
} 
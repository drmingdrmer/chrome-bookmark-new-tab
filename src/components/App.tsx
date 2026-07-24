import React from 'react';
import { Settings, AlertCircle, Loader2, Brain } from 'lucide-react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SearchBox } from './SearchBox';
import BookmarkItem from './BookmarkItem';
import { BookmarkCascade } from './BookmarkCascade';
import FolderColumn from './FolderColumn';
import { SettingsPanel } from './SettingsPanel';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { RecommendationsBar } from './RecommendationsBar';
import { ScoreRangeSlider } from './ScoreRangeSlider';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useSettings } from '@/hooks/useSettings';
import { useRecommendations } from '@/hooks/useRecommendations';
import { chunkArray, getFolderPath } from '@/utils/bookmark-helpers';
import { FULL_SCORE_RANGE, isFullScoreRange, isInScoreRange } from '@/utils/bookmark-ratings';
import { Bookmark, ScoreRange } from '@/types/bookmark';

// 评分按钮在窄屏独占一行，避免压缩点击目标
const SCORE_FILTER_WIDTH = 'w-full shrink-0 md:w-56 xl:w-72';

// 背景图 + 黑色遮罩层，加载中/出错/正常三种状态共用
function PageBackground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen w-full bg-black relative" style={{
            backgroundImage: 'url(girl-grey.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
        }}>
            <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
            {children}
        </div>
    );
}

// 加载中和出错状态共用的居中提示布局
function CenteredNotice({ children }: { children: React.ReactNode }) {
    return (
        <PageBackground>
            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <div className="text-center text-white">
                    {children}
                </div>
            </div>
        </PageBackground>
    );
}

export function App() {
    const {
        allBookmarks,
        searchResults,
        searchTerm,
        isLoading: bookmarksLoading,
        error: bookmarksError,
        allRatings,
        storageData,
        searchBookmarks,
        deleteBookmark,
        moveBookmark,
        updateBookmark,
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
        updateShowDebugInfo,
    } = useSettings(storageData);

    const [activeBookmark, setActiveBookmark] = React.useState<Bookmark | null>(null);
    const [isAIAnalysisOpen, setIsAIAnalysisOpen] = React.useState(false);
    const [scoreRange, setScoreRange] = React.useState<ScoreRange>(FULL_SCORE_RANGE);

    // 所有非文件夹书签，推荐刷新与 AI 面板共用
    const flatBookmarks = React.useMemo(
        () => Object.values(allBookmarks).filter(b => !b.isFolder),
        [allBookmarks]
    );

    const {
        recommendations,
        isLoading: recommendationsLoading,
        error: recommendationsError,
        isConfigValid: aiConfigValid,
        refresh: refreshRecommendations,
    } = useRecommendations();

    const handleRefreshRecommendations = React.useCallback(
        () => refreshRecommendations(flatBookmarks, allRatings),
        [refreshRecommendations, flatBookmarks, allRatings]
    );

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
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveBookmark(null);

        if (!over || active.id === over.id) {
            return;
        }

        const activeBookmark = allBookmarks[active.id as string];
        const overItem = allBookmarks[over.id as string];

        if (!activeBookmark) {
            return;
        }



        // 情况1: 拖拽到列容器上，追加到该列对应文件夹的末尾
        // 只有列容器会在 droppable data 中带上 folderId，书签项不会
        const dropFolderId = over.data.current?.folderId;
        if (typeof dropFolderId === 'string') {
            const newIndex = Object.values(allBookmarks)
                .filter(b => b.parentId === dropFolderId && !b.isFolder).length;

            moveBookmark(activeBookmark.id, dropFolderId, newIndex);
            return;
        }

        // 情况2: 拖拽到另一个书签上，进行同文件夹内重排序
        if (overItem && !overItem.isFolder &&
            activeBookmark.parentId === overItem.parentId) {

            const parentId = activeBookmark.parentId || '';

            // 使用目标书签的index作为新位置
            const targetIndex = overItem.index || 0;
            const activeIndex = activeBookmark.index || 0;

            // 如果拖拽到原位置，则不需要移动
            if (targetIndex === activeIndex) {
                return;
            }

            // 计算新的索引位置
            // 如果向后移动，新位置是目标位置+1；如果向前移动，新位置就是目标位置
            const newIndex = activeIndex <= targetIndex ? targetIndex + 1 : targetIndex;

            // Chrome API的index参数是最终位置，直接使用newIndex即可
            // 之前的"减1"逻辑是错误的理解

            moveBookmark(activeBookmark.id, parentId, newIndex);
            return;
        }

        // 情况3: 拖拽到不同文件夹的书签上，移动到该书签所在的文件夹
        if (overItem && !overItem.isFolder &&
            activeBookmark.parentId !== overItem.parentId) {

            const targetFolderId = overItem.parentId || '';

            // 使用目标书签的index作为插入位置（在其后插入）
            const newIndex = (overItem.index || 0) + 1;

            moveBookmark(activeBookmark.id, targetFolderId, newIndex);
            return;
        }


    }

    // 书签是否落在当前评分筛选区间内
    const isInSelectedScores = React.useCallback(
        (bookmark: Bookmark) => isInScoreRange(bookmark.url ? allRatings[bookmark.url] : undefined, scoreRange),
        [allRatings, scoreRange]
    );

    // Render search results
    const renderSearchResults = () => {
        const visibleResults = searchResults.filter(({ bookmark }) => isInSelectedScores(bookmark));

        if (visibleResults.length === 0) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-base mb-1">No bookmarks found</p>
                    <p className="text-sm">
                        {isFullScoreRange(scoreRange)
                            ? 'Try searching with different keywords'
                            : `No match scored ${scoreRange.min}-${scoreRange.max}`}
                    </p>
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 text-center">
                    <p className="text-gray-400">
                        Found {visibleResults.length} bookmark{visibleResults.length !== 1 ? 's' : ''}
                        matching &quot;{searchTerm}&quot;
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {visibleResults.map(({ bookmark, folderPath }) => (
                        <div key={bookmark.id} className="bg-black/60 rounded-xl border border-white/10 p-1.5">
                            <BookmarkItem
                                bookmark={bookmark}
                                searchTerm={searchTerm}
                                folderPath={folderPath}
                                onDelete={deleteBookmark}
                                showUrl={true}
                                showDebugInfo={config.showDebugInfo}
                                rating={bookmark.url ? allRatings[bookmark.url] : undefined}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Render bookmark folders
    // 列只取决于书签数据和显示配置，缓存后拖拽和面板开关不会重建所有列
    const bookmarkFolders = React.useMemo(() => {
        const { folders, directBookmarks } = getFolderData();
        const isFiltering = !isFullScoreRange(scoreRange);

        const columns: React.ReactElement[] = [];

        // Add direct bookmarks column if any exist
        const visibleDirectBookmarks = directBookmarks.filter(isInSelectedScores);
        if (visibleDirectBookmarks.length > 0) {
            const chunks = chunkArray(visibleDirectBookmarks, config.maxEntriesPerColumn);
            chunks.forEach((chunk, index) => {
                const subtitle = chunks.length > 1 ? `(${index + 1}/${chunks.length})` : undefined;
                columns.push(
                    <FolderColumn
                        key={`direct-${index}`}
                        columnId={`column:direct-${index}`}
                        title="Direct Bookmarks"
                        subtitle={subtitle}
                        bookmarks={chunk}
                        onDeleteBookmark={deleteBookmark}
                        onUpdateBookmark={updateBookmark}
                        showDebugInfo={config.showDebugInfo}
                        allRatings={allRatings}
                    />
                );
            });
        }

        // Add folder columns
        folders.forEach(folder => {
            if (!folder.children || folder.children.length === 0) return;

            const folderBookmarks = folder.children
                .map(childId => allBookmarks[childId])
                .filter(bookmark => bookmark && !bookmark.isFolder)
                .filter(isInSelectedScores);

            // 筛选时隐藏没有匹配项的列，避免整屏空列
            if (isFiltering && folderBookmarks.length === 0) return;

            const folderPath = getFolderPath(folder, allBookmarks);

            // 只含子文件夹的文件夹仍渲染一个空列，作为拖拽落点
            const chunks = folderBookmarks.length > 0
                ? chunkArray(folderBookmarks, config.maxEntriesPerColumn)
                : [[]];

            chunks.forEach((chunk, index) => {
                const subtitle = chunks.length > 1 ? `(${index + 1}/${chunks.length})` : undefined;
                columns.push(
                    <FolderColumn
                        key={`${folder.id}-${index}`}
                        columnId={`column:${folder.id}-${index}`}
                        title={folder.title}
                        subtitle={subtitle}
                        folderId={folder.id}
                        folderPath={folderPath}
                        bookmarks={chunk}
                        onDeleteBookmark={deleteBookmark}
                        onUpdateBookmark={updateBookmark}
                        showDebugInfo={config.showDebugInfo}
                        allRatings={allRatings}
                    />
                );
            });
        });

        if (columns.length === 0) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-base mb-1">No bookmarks found</p>
                    <p className="text-sm">
                        {isFiltering
                            ? `No bookmarks scored ${scoreRange.min}-${scoreRange.max}`
                            : 'Start adding bookmarks to see them here'}
                    </p>
                </div>
            );
        }

        return (
            <BookmarkCascade>{columns}</BookmarkCascade>
        );
    }, [
        getFolderData,
        allBookmarks,
        allRatings,
        config.maxEntriesPerColumn,
        config.showDebugInfo,
        deleteBookmark,
        updateBookmark,
        isInSelectedScores,
        scoreRange,
    ]);

    if (isLoading) {
        return (
            <CenteredNotice>
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-400" />
                <p className="text-lg mb-2">Loading bookmarks...</p>
                <p className="text-sm text-gray-300">
                    {bookmarksLoading && settingsLoading ? 'Loading bookmarks and settings...' :
                        bookmarksLoading ? 'Loading bookmarks...' :
                            settingsLoading ? 'Loading settings...' : 'Initializing...'}
                </p>
            </CenteredNotice>
        );
    }

    if (error) {
        return (
            <CenteredNotice>
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <p className="text-lg mb-2">Error loading bookmarks</p>
                <p className="text-sm text-gray-400">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                >
                    Try Again
                </button>
            </CenteredNotice>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <PageBackground>
                {/* 内容容器 */}
                <div className="relative z-10">
                    {/* Header */}
                    <header className="flex flex-wrap items-center gap-3 px-5 py-4 md:flex-nowrap">
                        {/* AI Analysis Button */}
                        <button
                            onClick={() => setIsAIAnalysisOpen(true)}
                            className="order-1 shrink-0 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg md:order-none"
                            aria-label="AI Analysis"
                            tabIndex={-1}
                        >
                            <Brain className="w-5 h-5" />
                        </button>

                        {/* 评分筛选：常驻表头，随时可以调整显示范围 */}
                        <div className={`order-3 basis-full md:order-none md:basis-auto ${SCORE_FILTER_WIDTH}`} title="只显示评分落在该区间内的书签">
                            <ScoreRangeSlider range={scoreRange} onChange={setScoreRange} />
                        </div>

                        {/* Search Box */}
                        <div className="order-4 basis-full flex-1 min-w-0 md:order-none md:basis-auto">
                            <SearchBox
                                value={searchTerm}
                                onSearch={searchBookmarks}
                                onClear={clearSearch}
                            />
                        </div>

                        {/* 与左侧筛选器等宽，让搜索框保持在页面正中 */}
                        <div className={`hidden md:block ${SCORE_FILTER_WIDTH}`} aria-hidden="true" />

                        {/* Settings Button */}
                        <button
                            id="settings-toggle"
                            onClick={toggleSettings}
                            className="order-2 ml-auto shrink-0 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg md:order-none md:ml-0"
                            aria-label="Settings"
                            tabIndex={-1}
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </header>

                    {/* Main Content */}
                    <main id="bookmarks-container" className="max-w-none mx-auto px-5 pb-5">
                        {searchTerm ? renderSearchResults() : (
                            <>
                                <RecommendationsBar
                                    recommendations={recommendations}
                                    isLoading={recommendationsLoading}
                                    error={recommendationsError}
                                    isConfigValid={aiConfigValid}
                                    onRefresh={handleRefreshRecommendations}
                                />
                                {bookmarkFolders}
                            </>
                        )}
                    </main>

                    {/* Settings Panel */}
                    <SettingsPanel
                        isOpen={isSettingsOpen}
                        config={config}
                        onClose={closeSettings}
                        onUpdateMaxEntries={updateMaxEntries}
                        onUpdateShowDebugInfo={updateShowDebugInfo}
                    />

                    {/* AI Analysis Panel */}
                    <AIAnalysisPanel
                        isOpen={isAIAnalysisOpen}
                        onClose={() => setIsAIAnalysisOpen(false)}
                        bookmarks={flatBookmarks}
                        allRatings={allRatings}
                    />

                    {/* Drag Overlay */}
                    <DragOverlay>
                        {activeBookmark ? (
                            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 rounded-lg p-2 rotate-3 scale-105">
                                <BookmarkItem
                                    bookmark={activeBookmark}
                                    onDelete={() => { }}
                                    showUrl={false}
                                    showDebugInfo={config.showDebugInfo}
                                    rating={activeBookmark.url ? allRatings[activeBookmark.url] : undefined}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
            </PageBackground>
        </DndContext>
    );
}

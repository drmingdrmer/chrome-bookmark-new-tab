import React from 'react';
import { Settings, AlertCircle, Loader2 } from 'lucide-react';
import { SearchBox } from './SearchBox';
import { BookmarkItem } from './BookmarkItem';
import { FolderColumn } from './FolderColumn';
import { SettingsPanel } from './SettingsPanel';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useSettings } from '@/hooks/useSettings';
import { chunkArray, countItemsInFolder } from '@/utils/bookmark-helpers';

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

    const isLoading = bookmarksLoading || settingsLoading;
    const error = bookmarksError || settingsError;

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
                    {searchResults.map(({ bookmark, folderPath }, index) => (
                        <BookmarkItem
                            key={bookmark.id}
                            bookmark={bookmark}
                            searchTerm={searchTerm}
                            folderPath={folderPath}
                            onDelete={deleteBookmark}
                            onMove={moveBookmark}
                            showUrl={true}
                            index={index}
                            allBookmarks={allBookmarks}
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
                        onMoveBookmark={moveBookmark}
                        allBookmarks={allBookmarks}
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
                        onMoveBookmark={moveBookmark}
                        allBookmarks={allBookmarks}
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
                            onMoveBookmark={moveBookmark}
                            allBookmarks={allBookmarks}
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
            <div className="flex space-x-4 overflow-x-auto pb-4">
                {columns}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                    <p className="text-lg">Loading bookmarks...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-lg mb-2">Error loading bookmarks</p>
                    <p className="text-sm text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
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
            <main id="bookmarks-container" className="px-4 pb-4">
                {searchTerm ? renderSearchResults() : renderBookmarkFolders()}
            </main>

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={isSettingsOpen}
                config={config}
                onClose={closeSettings}
                onUpdateMaxEntries={updateMaxEntries}
            />
        </div>
    );
} 
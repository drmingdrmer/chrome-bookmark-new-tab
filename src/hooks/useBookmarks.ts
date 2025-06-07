import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkTreeNode, Config, SearchResult } from '@/types/bookmark';
import { getAllBookmarks, searchBookmarks as searchBookmarksAPI, deleteBookmark as deleteBookmarkAPI, moveBookmark as moveBookmarkAPI } from '@/utils/chrome-api';
import {
    collectAllBookmarks,
    getOrderedTopLevelFolders,
    getBookmarkFolderPath,
    resetFolderColors
} from '@/utils/bookmark-helpers';

export function useBookmarks() {
    const [allBookmarks, setAllBookmarks] = useState<Record<string, Bookmark>>({});
    const [bookmarkTreeNodes, setBookmarkTreeNodes] = useState<BookmarkTreeNode[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load all bookmarks
    const loadBookmarks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const tree = await getAllBookmarks();
            setBookmarkTreeNodes(tree);

            const bookmarksMap = collectAllBookmarks(tree);
            setAllBookmarks(bookmarksMap);

            // Reset folder colors when reloading
            resetFolderColors();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Search bookmarks
    const searchBookmarks = useCallback(async (query: string) => {
        setSearchTerm(query);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await searchBookmarksAPI(query);
            const searchResults: SearchResult[] = results
                .filter(result => result.url) // Only include actual bookmarks, not folders
                .map(result => {
                    const bookmark = allBookmarks[result.id];
                    const matchType = bookmark?.title.toLowerCase().includes(query.toLowerCase()) ? 'title' : 'url';
                    const folderPath = bookmark ? getBookmarkFolderPath(bookmark, allBookmarks) : '';

                    return {
                        bookmark: bookmark || {
                            id: result.id,
                            title: result.title,
                            url: result.url,
                            parentId: result.parentId || '',
                            isFolder: false,
                        },
                        matchType,
                        folderPath,
                    };
                });

            setSearchResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to search bookmarks');
        }
    }, [allBookmarks]);

    // Delete bookmark
    const deleteBookmark = useCallback(async (bookmarkId: string) => {
        try {
            await deleteBookmarkAPI(bookmarkId);

            // Refresh bookmarks after deletion
            await loadBookmarks();

            // If we're in search mode, refresh search results
            if (searchTerm) {
                await searchBookmarks(searchTerm);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
        }
    }, [loadBookmarks, searchBookmarks, searchTerm]);

    // Move bookmark
    const moveBookmark = useCallback(async (bookmarkId: string, targetFolderId: string, newIndex: number) => {
        console.log('🔧 Hook移动书签:', { bookmarkId, targetFolderId, newIndex });

        try {
            const result = await moveBookmarkAPI(bookmarkId, {
                parentId: targetFolderId,
                index: newIndex
            });

            console.log('✅ 书签移动成功:', result);

            // Refresh bookmarks after move
            await loadBookmarks();

            // If we're in search mode, refresh search results
            if (searchTerm) {
                await searchBookmarks(searchTerm);
            }

        } catch (err) {
            console.error('❌ 移动书签失败:', err);
            setError(err instanceof Error ? err.message : 'Failed to move bookmark');
        }
    }, [loadBookmarks, searchBookmarks, searchTerm]);

    // Get organized folder data
    const getFolderData = useCallback(() => {
        const { folders, directBookmarks } = getOrderedTopLevelFolders(bookmarkTreeNodes, allBookmarks);
        return { folders, directBookmarks };
    }, [bookmarkTreeNodes, allBookmarks]);

    // Clear search
    const clearSearch = useCallback(() => {
        setSearchTerm('');
        setSearchResults([]);
    }, []);

    // Initialize bookmarks on mount
    useEffect(() => {
        loadBookmarks();
    }, [loadBookmarks]);

    return {
        allBookmarks,
        bookmarkTreeNodes,
        searchResults,
        searchTerm,
        isLoading,
        error,
        loadBookmarks,
        searchBookmarks,
        deleteBookmark,
        moveBookmark,
        getFolderData,
        clearSearch,
    };
} 
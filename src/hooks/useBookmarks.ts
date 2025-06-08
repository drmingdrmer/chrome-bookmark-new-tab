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

            // 增量更新：直接从本地状态移除书签，避免重新加载导致闪烁
            setAllBookmarks(prev => {
                const updated = { ...prev };
                delete updated[bookmarkId];
                console.log('🗑️ 本地状态已移除书签:', bookmarkId);
                return updated;
            });

            // 如果在搜索模式，只刷新搜索结果
            if (searchTerm) {
                await searchBookmarks(searchTerm);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
        }
    }, [searchBookmarks, searchTerm]);

    // Move bookmark
    const moveBookmark = useCallback(async (bookmarkId: string, targetFolderId: string, newIndex: number) => {
        console.log('🔧 Hook移动书签:', { bookmarkId, targetFolderId, newIndex });

        try {
            const result = await moveBookmarkAPI(bookmarkId, {
                parentId: targetFolderId,
                index: newIndex
            });

            console.log('✅ 书签移动成功:', result);

            // 增量更新：更新书签和相关文件夹的children
            setAllBookmarks(prev => {
                const updated = { ...prev };
                const bookmark = updated[bookmarkId];

                if (!bookmark) {
                    console.warn('⚠️ 找不到要移动的书签:', bookmarkId);
                    return updated;
                }

                const oldParentId = bookmark.parentId;
                const newParentId = result.parentId || '';

                // 1. 更新书签本身
                updated[bookmarkId] = {
                    ...bookmark,
                    parentId: newParentId,
                    index: result.index || 0
                };

                // 2. 如果是跨文件夹移动，更新旧父文件夹的children
                if (oldParentId !== newParentId && updated[oldParentId]?.children) {
                    updated[oldParentId] = {
                        ...updated[oldParentId],
                        children: updated[oldParentId].children!.filter(id => id !== bookmarkId)
                    };
                }

                // 3. 更新新父文件夹的children
                if (updated[newParentId]?.children) {
                    const newChildren = [...updated[newParentId].children!];
                    // 移除可能存在的重复项
                    const filteredChildren = newChildren.filter(id => id !== bookmarkId);
                    // 插入到正确位置
                    filteredChildren.splice(result.index || 0, 0, bookmarkId);

                    updated[newParentId] = {
                        ...updated[newParentId],
                        children: filteredChildren
                    };
                }

                console.log('📝 本地状态已更新:', {
                    bookmark: updated[bookmarkId],
                    oldParent: oldParentId ? updated[oldParentId] : null,
                    newParent: updated[newParentId]
                });

                return updated;
            });

            // 如果在搜索模式，只刷新搜索结果（不重新加载所有书签）
            if (searchTerm) {
                await searchBookmarks(searchTerm);
            }

        } catch (err) {
            console.error('❌ 移动书签失败:', err);
            setError(err instanceof Error ? err.message : 'Failed to move bookmark');
        }
    }, [searchBookmarks, searchTerm]);

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
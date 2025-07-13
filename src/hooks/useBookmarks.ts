import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkTreeNode, Config, SearchResult } from '@/types/bookmark';
import { getAllBookmarks, searchBookmarks as searchBookmarksAPI, deleteBookmark as deleteBookmarkAPI, moveBookmark as moveBookmarkAPI } from '@/utils/chrome-api';
import {
    collectAllBookmarks,
    getOrderedTopLevelFolders,
    getBookmarkFolderPath,
    resetFolderColors
} from '@/utils/bookmark-helpers';
import { getAllRatings, BookmarkRating } from '@/utils/bookmark-ratings';

export function useBookmarks() {
    const [allBookmarks, setAllBookmarks] = useState<Record<string, Bookmark>>({});
    const [bookmarkTreeNodes, setBookmarkTreeNodes] = useState<BookmarkTreeNode[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allRatings, setAllRatings] = useState<Record<string, BookmarkRating>>({});

    // Load all bookmarks
    const loadBookmarks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // 并行加载书签和评分数据
            const [tree, ratings] = await Promise.all([
                getAllBookmarks(),
                getAllRatings()
            ]);

            setBookmarkTreeNodes(tree);
            const bookmarksMap = collectAllBookmarks(tree);
            setAllBookmarks(bookmarksMap);
            setAllRatings(ratings);

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


        // 乐观更新：立即更新本地状态，避免拖拽后的闪烁
        const performOptimisticUpdate = (expectedIndex: number) => {
            setAllBookmarks(prev => {
                const updated = { ...prev };
                const bookmark = updated[bookmarkId];

                if (!bookmark) {
        
                    return updated;
                }

                const oldParentId = bookmark.parentId;
                const newParentId = targetFolderId;

                // 1. 更新书签本身
                updated[bookmarkId] = {
                    ...bookmark,
                    parentId: newParentId,
                    index: expectedIndex
                };

                // 2. 如果是跨文件夹移动，更新旧父文件夹的children
                if (oldParentId !== newParentId && updated[oldParentId]?.children) {
                    const remainingChildren = updated[oldParentId].children!.filter(id => id !== bookmarkId);

                    updated[oldParentId] = {
                        ...updated[oldParentId],
                        children: remainingChildren
                    };

                    // 重新计算旧文件夹中剩余书签的index
                    remainingChildren.forEach((childId, index) => {
                        if (updated[childId] && !updated[childId].isFolder) {
                            updated[childId] = {
                                ...updated[childId],
                                index: index
                            };
                        }
                    });
                }

                // 3. 更新新父文件夹的children和重新计算所有子项的index
                if (updated[newParentId]?.children) {
                    const newChildren = [...updated[newParentId].children!];
                    // 移除可能存在的重复项
                    const filteredChildren = newChildren.filter(id => id !== bookmarkId);
                    // 插入到正确位置
                    filteredChildren.splice(expectedIndex, 0, bookmarkId);

                    updated[newParentId] = {
                        ...updated[newParentId],
                        children: filteredChildren
                    };

                    // 重新计算该文件夹中所有书签的index
                    filteredChildren.forEach((childId, index) => {
                        if (updated[childId] && !updated[childId].isFolder) {
                            updated[childId] = {
                                ...updated[childId],
                                index: index
                            };
                        }
                    });
                }



                return updated;
            });
        };

        // 立即执行乐观更新
        performOptimisticUpdate(newIndex);

        try {
            const result = await moveBookmarkAPI(bookmarkId, {
                parentId: targetFolderId,
                index: newIndex
            });

            

            // 如果API返回的index与预期不同，进行校正
            if (result.index !== newIndex) {

                performOptimisticUpdate(result.index || 0);
            }

            // 如果在搜索模式，只刷新搜索结果（不重新加载所有书签）
            if (searchTerm) {
                await searchBookmarks(searchTerm);
            }

        } catch (err) {

            setError(err instanceof Error ? err.message : 'Failed to move bookmark');

            // 如果API调用失败，恢复原始状态
            await loadBookmarks();
        }
    }, [searchBookmarks, searchTerm, loadBookmarks]);

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

    // Update bookmark
    const updateBookmark = useCallback((bookmarkId: string, updates: Partial<Bookmark>) => {
        setAllBookmarks(prev => {
            const updated = { ...prev };
            if (updated[bookmarkId]) {
                updated[bookmarkId] = {
                    ...updated[bookmarkId],
                    ...updates
                };
    
            }
            return updated;
        });

        // 如果在搜索模式且更新的是标题，需要重新搜索
        if (searchTerm && updates.title) {
            setTimeout(() => searchBookmarks(searchTerm), 100);
        }
    }, [searchTerm, searchBookmarks]);

    // Initialize bookmarks on mount
    useEffect(() => {
        loadBookmarks();
    }, [loadBookmarks]);

    // Listen for rating updates and reload ratings
    useEffect(() => {
        const handleRatingUpdate = async () => {
            try {
                const updatedRatings = await getAllRatings();
                setAllRatings(updatedRatings);
            } catch (error) {
    
            }
        };

        window.addEventListener('bookmark-ratings-updated', handleRatingUpdate);
        return () => {
            window.removeEventListener('bookmark-ratings-updated', handleRatingUpdate);
        };
    }, []);

    return {
        allBookmarks,
        bookmarkTreeNodes,
        searchResults,
        searchTerm,
        isLoading,
        error,
        allRatings,
        loadBookmarks,
        searchBookmarks,
        deleteBookmark,
        moveBookmark,
        updateBookmark,
        getFolderData,
        clearSearch,
    };
} 
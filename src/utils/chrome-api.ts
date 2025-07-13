import { BookmarkTreeNode, Bookmark } from '@/types/bookmark';

/**
 * Get all bookmarks from Chrome API
 */
export async function getAllBookmarks(): Promise<BookmarkTreeNode[]> {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((tree) => {
            resolve(tree);
        });
    });
}

/**
 * Search bookmarks using Chrome API
 */
export async function searchBookmarks(query: string): Promise<BookmarkTreeNode[]> {
    return new Promise((resolve) => {
        chrome.bookmarks.search(query, (results) => {
            resolve(results);
        });
    });
}

/**
 * Delete a bookmark using Chrome API
 */
export async function deleteBookmark(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.bookmarks.remove(id, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Move a bookmark to a new position
 */
export async function moveBookmark(
    id: string,
    destination: { parentId?: string; index?: number }
): Promise<BookmarkTreeNode> {
    return new Promise((resolve, reject) => {
        chrome.bookmarks.move(id, destination, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                console.log('🎯 移动书签成功:', id, destination, result);
                resolve(result);
            }
        });
    });
}

/**
 * Get storage data from Chrome storage API
 */
export async function getStorageData<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            console.log('📖 Getting storage data for key:', key, 'result:', result);
            resolve(result[key] || null);
        });
    });
}

/**
 * Set storage data using Chrome storage API
 */
export async function setStorageData<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('💾 Setting storage data:', key, value);
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                console.error('💾 Storage set error:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log('💾 Storage set successful');
                resolve();
            }
        });
    });
}

/**
 * Batch load all Chrome storage data for performance optimization
 */
export async function batchLoadStorageData(): Promise<{
    config: any;
    ratings: any;
    aiConfig: any;
}> {
    const [localData, syncData] = await Promise.all([
        new Promise<any>((resolve) => {
            chrome.storage.local.get(['config', 'bookmark_ratings'], (result) => {
                resolve(result);
            });
        }),
        new Promise<any>((resolve) => {
            chrome.storage.sync.get(['apiUrl', 'apiKey', 'model'], (result) => {
                resolve(result);
            });
        })
    ]);

    return {
        config: localData.config || null,
        ratings: localData.bookmark_ratings || {},
        aiConfig: {
            apiUrl: syncData.apiUrl || '',
            apiKey: syncData.apiKey || '',
            model: syncData.model || ''
        }
    };
} 
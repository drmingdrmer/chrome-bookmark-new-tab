import { BookmarkTreeNode, Bookmark } from '@/types/bookmark';

/**
 * Wrap a callback-style Chrome API call, rejecting on chrome.runtime.lastError
 *
 * Chrome reports failures through lastError rather than throwing, so a
 * callback that ignores it turns any API error into a silent undefined.
 */
function promisify<T>(call: (callback: (value: T) => void) => void): Promise<T> {
    return new Promise((resolve, reject) => {
        call((value) => {
            if (chrome.runtime.lastError) {
                console.error('Chrome API 调用失败:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(value);
            }
        });
    });
}

/**
 * Get all bookmarks from Chrome API
 */
export async function getAllBookmarks(): Promise<BookmarkTreeNode[]> {
    return promisify(callback => chrome.bookmarks.getTree(callback));
}

/**
 * Search bookmarks using Chrome API
 */
export async function searchBookmarks(query: string): Promise<BookmarkTreeNode[]> {
    return promisify(callback => chrome.bookmarks.search(query, callback));
}

/**
 * Delete a bookmark using Chrome API
 */
export async function deleteBookmark(id: string): Promise<void> {
    return promisify<void>(callback => chrome.bookmarks.remove(id, () => callback()));
}

/**
 * Move a bookmark to a new position
 */
export async function moveBookmark(
    id: string,
    destination: { parentId?: string; index?: number }
): Promise<BookmarkTreeNode> {
    const result = await promisify<BookmarkTreeNode>(
        callback => chrome.bookmarks.move(id, destination, callback)
    );

    console.log('🎯 移动书签成功:', id, destination, result);
    return result;
}

/**
 * Get storage data from Chrome storage API
 */
export async function getStorageData<T>(key: string): Promise<T | null> {
    const result = await promisify<Record<string, T>>(
        callback => chrome.storage.local.get([key], callback)
    );

    console.log('📖 Getting storage data for key:', key, 'result:', result);
    return result[key] ?? null;
}

/**
 * Set storage data using Chrome storage API
 */
export async function setStorageData<T>(key: string, value: T): Promise<void> {
    console.log('💾 Setting storage data:', key, value);

    await promisify<void>(callback => chrome.storage.local.set({ [key]: value }, () => callback()));

    console.log('💾 Storage set successful');
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
        promisify<any>(callback => chrome.storage.local.get(['config', 'bookmark_ratings'], callback)),
        promisify<any>(callback => chrome.storage.sync.get(['apiUrl', 'apiKey', 'model'], callback))
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
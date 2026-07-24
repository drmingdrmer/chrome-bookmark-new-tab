import { BookmarkTreeNode } from '@/types/bookmark';

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

const AI_CONFIG_KEYS = ['apiUrl', 'apiKey', 'model'];

export interface AIConfigData {
    apiUrl: string;
    apiKey: string;
    model: string;
}

/**
 * Read the AI config, preferring local storage
 *
 * Older versions kept it in sync storage, so a value still there is used
 * until migrateAIConfigToLocal has run.
 */
export async function getAIConfig(): Promise<AIConfigData> {
    const [local, synced] = await Promise.all([
        promisify<any>(callback => chrome.storage.local.get(AI_CONFIG_KEYS, callback)),
        promisify<any>(callback => chrome.storage.sync.get(AI_CONFIG_KEYS, callback))
    ]);

    return {
        apiUrl: local.apiUrl || synced.apiUrl || '',
        apiKey: local.apiKey || synced.apiKey || '',
        model: local.model || synced.model || ''
    };
}

/**
 * Persist the AI config to local storage
 */
export async function setAIConfig(config: AIConfigData): Promise<void> {
    await promisify<void>(callback => chrome.storage.local.set(config, () => callback()));
}

/**
 * Move an AI config left in sync storage by older versions into local storage
 *
 * Anything in sync storage is replicated to the user's Google account, so the
 * synced copy is dropped once its values are safe locally.
 */
export async function migrateAIConfigToLocal(): Promise<void> {
    const synced = await promisify<any>(callback => chrome.storage.sync.get(AI_CONFIG_KEYS, callback));

    if (!AI_CONFIG_KEYS.some(key => synced[key])) {
        return;
    }

    // 本地已有的值优先，避免用陈旧的同步副本覆盖
    const local = await promisify<any>(callback => chrome.storage.local.get(AI_CONFIG_KEYS, callback));
    const missing: Record<string, string> = {};
    AI_CONFIG_KEYS.forEach(key => {
        if (!local[key] && synced[key]) {
            missing[key] = synced[key];
        }
    });

    if (Object.keys(missing).length > 0) {
        await promisify<void>(callback => chrome.storage.local.set(missing, () => callback()));
    }

    await promisify<void>(callback => chrome.storage.sync.remove(AI_CONFIG_KEYS, () => callback()));
    console.log('🔧 AI配置已从 storage.sync 迁移到 storage.local');
}

/**
 * Batch load all Chrome storage data for performance optimization
 */
export async function batchLoadStorageData(): Promise<{
    config: any;
    ratings: any;
    aiConfig: AIConfigData;
}> {
    const [localData, aiConfig] = await Promise.all([
        promisify<any>(callback => chrome.storage.local.get(['config', 'bookmark_ratings'], callback)),
        getAIConfig()
    ]);

    return {
        config: localData.config || null,
        ratings: localData.bookmark_ratings || {},
        aiConfig
    };
} 
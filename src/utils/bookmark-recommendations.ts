// 推荐结果的本地存储：按维度分组保存，刷新前一直沿用，避免每次打开都重新分析

import { BookmarkDimension, BookmarkRecommendation } from '@/types/bookmark';

export type RecommendationsByDimension = Partial<Record<BookmarkDimension, BookmarkRecommendation[]>>;

const RECOMMENDATIONS_STORAGE_KEY = 'bookmark_recommendations';

interface RecommendationStore {
    byDimension: RecommendationsByDimension;
    timestamp: number;
}

// 读取已保存的推荐；没有则返回空
export async function getStoredRecommendations(): Promise<RecommendationsByDimension> {
    const result = await chrome.storage.local.get(RECOMMENDATIONS_STORAGE_KEY);
    const store: RecommendationStore | undefined = result[RECOMMENDATIONS_STORAGE_KEY];
    return store?.byDimension || {};
}

// 覆盖保存整组推荐
export async function saveRecommendations(byDimension: RecommendationsByDimension): Promise<void> {
    await chrome.storage.local.set({
        [RECOMMENDATIONS_STORAGE_KEY]: { byDimension, timestamp: Date.now() }
    });
}

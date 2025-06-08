// 书签评分存储工具函数

export interface BookmarkRating {
    url: string;
    score: number;
    dimension: string;
    reason: string;
    timestamp: number;
}

const RATINGS_STORAGE_KEY = 'bookmark_ratings';

// 获取所有评分
export async function getAllRatings(): Promise<Record<string, BookmarkRating>> {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.local.get(RATINGS_STORAGE_KEY);
            return result[RATINGS_STORAGE_KEY] || {};
        }
        return {};
    } catch (error) {
        console.error('Failed to load ratings:', error);
        return {};
    }
}

// 保存单个评分
export async function saveRating(url: string, rating: Omit<BookmarkRating, 'url'>): Promise<void> {
    try {
        const allRatings = await getAllRatings();
        const ratingData: BookmarkRating = {
            url,
            ...rating,
            timestamp: Date.now()
        };

        allRatings[url] = ratingData;

        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({
                [RATINGS_STORAGE_KEY]: allRatings
            });
        }
    } catch (error) {
        console.error('Failed to save rating:', error);
        throw error;
    }
}

// 批量保存评分
export async function saveRatings(ratings: BookmarkRating[]): Promise<void> {
    try {
        const allRatings = await getAllRatings();

        ratings.forEach(rating => {
            if (rating.url) {
                allRatings[rating.url] = {
                    ...rating,
                    timestamp: Date.now()
                };
            }
        });

        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({
                [RATINGS_STORAGE_KEY]: allRatings
            });
        }
    } catch (error) {
        console.error('Failed to save ratings:', error);
        throw error;
    }
}

// 获取单个URL的评分
export async function getRating(url: string): Promise<BookmarkRating | null> {
    try {
        const allRatings = await getAllRatings();
        return allRatings[url] || null;
    } catch (error) {
        console.error('Failed to get rating:', error);
        return null;
    }
}

// 删除评分
export async function deleteRating(url: string): Promise<void> {
    try {
        const allRatings = await getAllRatings();
        delete allRatings[url];

        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({
                [RATINGS_STORAGE_KEY]: allRatings
            });
        }
    } catch (error) {
        console.error('Failed to delete rating:', error);
        throw error;
    }
}

// 清空所有评分
export async function clearAllRatings(): Promise<void> {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.remove(RATINGS_STORAGE_KEY);
        }
    } catch (error) {
        console.error('Failed to clear ratings:', error);
        throw error;
    }
} 
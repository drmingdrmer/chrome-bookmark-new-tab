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
    const result = await chrome.storage.local.get(RATINGS_STORAGE_KEY);
    return result[RATINGS_STORAGE_KEY] || {};
}

// 批量保存评分
export async function saveRatings(ratings: BookmarkRating[]): Promise<void> {
    const allRatings = await getAllRatings();

    ratings.forEach(rating => {
        if (rating.url) {
            allRatings[rating.url] = {
                ...rating,
                timestamp: Date.now()
            };
        }
    });

    await chrome.storage.local.set({
        [RATINGS_STORAGE_KEY]: allRatings
    });
}

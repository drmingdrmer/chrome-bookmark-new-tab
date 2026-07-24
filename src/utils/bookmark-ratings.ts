// 书签评分存储工具函数

import { ScoreRange } from '@/types/bookmark';

// AI 评分为 1-10 分，筛选区间直接按分数取值
export const MIN_SCORE = 0;
export const MAX_SCORE = 10;

export const FULL_SCORE_RANGE: ScoreRange = { min: MIN_SCORE, max: MAX_SCORE };

export interface BookmarkRating {
    url: string;
    score: number;
    dimension: string;
    reason: string;
    timestamp: number;
}

const RATINGS_STORAGE_KEY = 'bookmark_ratings';

// 是否为完整区间，即不做任何筛选
export function isFullScoreRange(range: ScoreRange): boolean {
    return range.min <= MIN_SCORE && range.max >= MAX_SCORE;
}

/**
 * 书签是否落在选定评分区间内
 *
 * 完整区间显示全部书签；一旦收窄，未评分的书签因为没有分数而被排除。
 */
export function isInScoreRange(rating: BookmarkRating | undefined, range: ScoreRange): boolean {
    if (isFullScoreRange(range)) {
        return true;
    }

    if (!rating) {
        return false;
    }

    return rating.score >= range.min && rating.score <= range.max;
}

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

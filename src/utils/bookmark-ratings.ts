// 书签评分存储工具函数

import { StarRange } from '@/types/bookmark';

// AI 评分为 1-10 分，界面按每 2 分一颗星显示，因此星级范围是 0-5
export const MIN_STARS = 0;
export const MAX_STARS = 5;
const SCORE_PER_STAR = 2;

export const FULL_STAR_RANGE: StarRange = { min: MIN_STARS, max: MAX_STARS };

export interface BookmarkRating {
    url: string;
    score: number;
    dimension: string;
    reason: string;
    timestamp: number;
}

const RATINGS_STORAGE_KEY = 'bookmark_ratings';

// 分数转星级，7 分即 3.5 颗星
export function scoreToStars(score: number): number {
    return score / SCORE_PER_STAR;
}

// 是否为完整区间，即不做任何筛选
export function isFullStarRange(range: StarRange): boolean {
    return range.min <= MIN_STARS && range.max >= MAX_STARS;
}

/**
 * 书签是否落在选定星级区间内
 *
 * 完整区间显示全部书签；一旦收窄，未评分的书签因为没有星级而被排除。
 */
export function isInStarRange(rating: BookmarkRating | undefined, range: StarRange): boolean {
    if (isFullStarRange(range)) {
        return true;
    }

    if (!rating) {
        return false;
    }

    const stars = scoreToStars(rating.score);
    return stars >= range.min && stars <= range.max;
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

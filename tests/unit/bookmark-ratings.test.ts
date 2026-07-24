import {
    BookmarkRating,
    FULL_SCORE_RANGE,
    MAX_SCORE,
    MIN_SCORE,
    isFullScoreRange,
    isInScoreRange,
} from '@/utils/bookmark-ratings';

function rated(score: number): BookmarkRating {
    return { url: 'https://example.com', score, dimension: 'work', reason: '', timestamp: 0 };
}

describe('isFullScoreRange', () => {
    it('is true for the whole scale', () => {
        expect(isFullScoreRange(FULL_SCORE_RANGE)).toBe(true);
        expect(isFullScoreRange({ min: MIN_SCORE, max: MAX_SCORE })).toBe(true);
    });

    it('is false once either end moves inward', () => {
        expect(isFullScoreRange({ min: 1, max: MAX_SCORE })).toBe(false);
        expect(isFullScoreRange({ min: MIN_SCORE, max: 9 })).toBe(false);
    });
});

describe('isInScoreRange', () => {
    it('keeps every bookmark when the range covers the whole scale', () => {
        expect(isInScoreRange(rated(1), FULL_SCORE_RANGE)).toBe(true);
        expect(isInScoreRange(rated(10), FULL_SCORE_RANGE)).toBe(true);
        expect(isInScoreRange(undefined, FULL_SCORE_RANGE)).toBe(true);
    });

    it('drops unrated bookmarks once the range is narrowed', () => {
        expect(isInScoreRange(undefined, { min: 0, max: 9 })).toBe(false);
        expect(isInScoreRange(undefined, { min: 1, max: MAX_SCORE })).toBe(false);
    });

    it('includes both ends of the range', () => {
        expect(isInScoreRange(rated(4), { min: 4, max: 6 })).toBe(true);
        expect(isInScoreRange(rated(6), { min: 4, max: 6 })).toBe(true);
    });

    it('excludes scores outside the range', () => {
        expect(isInScoreRange(rated(3), { min: 4, max: 6 })).toBe(false);
        expect(isInScoreRange(rated(7), { min: 4, max: 6 })).toBe(false);
    });

    it('matches only one score when both ends are equal', () => {
        expect(isInScoreRange(rated(8), { min: 8, max: 8 })).toBe(true);
        expect(isInScoreRange(rated(9), { min: 8, max: 8 })).toBe(false);
    });

    // 每一分都能单独选中，不再像星级那样两分并作一档
    it('distinguishes adjacent scores', () => {
        expect([7, 8, 9].map(s => isInScoreRange(rated(s), { min: 8, max: 9 })))
            .toEqual([false, true, true]);
    });
});

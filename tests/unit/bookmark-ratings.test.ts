import {
    BookmarkRating,
    FULL_STAR_RANGE,
    MAX_STARS,
    MIN_STARS,
    isFullStarRange,
    isInStarRange,
    scoreToStars,
} from '@/utils/bookmark-ratings';

function rated(score: number): BookmarkRating {
    return { url: 'https://example.com', score, dimension: 'work', reason: '', timestamp: 0 };
}

describe('scoreToStars', () => {
    it('maps the 1-10 score onto the 0-5 star scale in half steps', () => {
        expect([1, 2, 5, 7, 10].map(scoreToStars)).toEqual([0.5, 1, 2.5, 3.5, 5]);
    });
});

describe('isFullStarRange', () => {
    it('is true for the whole scale', () => {
        expect(isFullStarRange(FULL_STAR_RANGE)).toBe(true);
        expect(isFullStarRange({ min: MIN_STARS, max: MAX_STARS })).toBe(true);
    });

    it('is false once either end moves inward', () => {
        expect(isFullStarRange({ min: 1, max: MAX_STARS })).toBe(false);
        expect(isFullStarRange({ min: MIN_STARS, max: 4 })).toBe(false);
    });
});

describe('isInStarRange', () => {
    it('keeps every bookmark when the range covers the whole scale', () => {
        expect(isInStarRange(rated(1), FULL_STAR_RANGE)).toBe(true);
        expect(isInStarRange(rated(10), FULL_STAR_RANGE)).toBe(true);
        expect(isInStarRange(undefined, FULL_STAR_RANGE)).toBe(true);
    });

    it('drops unrated bookmarks once the range is narrowed', () => {
        expect(isInStarRange(undefined, { min: 0, max: 4 })).toBe(false);
        expect(isInStarRange(undefined, { min: 1, max: MAX_STARS })).toBe(false);
    });

    it('includes both ends of the range', () => {
        // 4 分即 2 颗星，6 分即 3 颗星
        expect(isInStarRange(rated(4), { min: 2, max: 3 })).toBe(true);
        expect(isInStarRange(rated(6), { min: 2, max: 3 })).toBe(true);
    });

    it('excludes scores outside the range', () => {
        expect(isInStarRange(rated(3), { min: 2, max: 3 })).toBe(false);
        expect(isInStarRange(rated(7), { min: 2, max: 3 })).toBe(false);
    });

    it('keeps half-star scores that fall inside the range', () => {
        // 7 分即 3.5 颗星
        expect(isInStarRange(rated(7), { min: 3, max: 4 })).toBe(true);
        expect(isInStarRange(rated(7), { min: 4, max: MAX_STARS })).toBe(false);
    });

    it('matches only one score when both ends are equal', () => {
        expect(isInStarRange(rated(4), { min: 2, max: 2 })).toBe(true);
        expect(isInStarRange(rated(5), { min: 2, max: 2 })).toBe(false);
    });
});

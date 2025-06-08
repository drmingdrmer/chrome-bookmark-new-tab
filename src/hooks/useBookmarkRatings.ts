import { useState, useEffect, useCallback } from 'react';
import { BookmarkRating, getAllRatings, saveRatings } from '@/utils/bookmark-ratings';
import { useAI } from './useAI';
import { Bookmark } from '@/types/bookmark';

export function useBookmarkRatings() {
    const [ratings, setRatings] = useState<Record<string, BookmarkRating>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { analyzeBatch, isConfigValid } = useAI();

    // 加载评分数据
    const loadRatings = useCallback(async () => {
        try {
            const allRatings = await getAllRatings();
            setRatings(allRatings);
        } catch (error) {
            console.error('Failed to load ratings:', error);
            setError('Failed to load ratings');
        }
    }, []);

    // 批量评分书签
    const rateBookmarks = useCallback(async (bookmarks: Bookmark[]) => {
        if (!isConfigValid) {
            throw new Error('AI配置无效，请先配置AI参数');
        }

        if (bookmarks.length === 0) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 过滤掉已有评分的书签（可选：如果想要重新评分，移除这个过滤）
            const bookmarksToRate = bookmarks.filter(bookmark =>
                bookmark.url && !ratings[bookmark.url]
            );

            if (bookmarksToRate.length === 0) {
                setError('所有书签都已有评分');
                return;
            }

            // 调用AI批量分析
            const analyses = await analyzeBatch(bookmarksToRate);

            // 转换为评分格式
            const newRatings: BookmarkRating[] = analyses.map(analysis => ({
                url: analysis.bookmark.url!,
                score: analysis.score,
                dimension: analysis.dimension,
                reason: analysis.reason,
                timestamp: Date.now()
            }));

            // 保存到本地存储
            await saveRatings(newRatings);

            // 更新状态
            const updatedRatings = { ...ratings };
            newRatings.forEach(rating => {
                updatedRatings[rating.url] = rating;
            });
            setRatings(updatedRatings);

            return newRatings;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '评分失败';
            setError(errorMessage);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [analyzeBatch, isConfigValid, ratings]);

    // 获取单个书签的评分
    const getBookmarkRating = useCallback((url: string): BookmarkRating | null => {
        return ratings[url] || null;
    }, [ratings]);

    // 检查书签是否已评分
    const hasRating = useCallback((url: string): boolean => {
        return !!ratings[url];
    }, [ratings]);

    // 获取评分统计
    const getRatingStats = useCallback(() => {
        const allRatings = Object.values(ratings);
        const total = allRatings.length;

        if (total === 0) {
            return { total: 0, average: 0, distribution: {} };
        }

        const sum = allRatings.reduce((acc, rating) => acc + rating.score, 0);
        const average = sum / total;

        const distribution = allRatings.reduce((acc, rating) => {
            acc[rating.dimension] = (acc[rating.dimension] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return { total, average: Math.round(average * 10) / 10, distribution };
    }, [ratings]);

    // 初始化时加载评分
    useEffect(() => {
        loadRatings();
    }, [loadRatings]);

    return {
        ratings,
        isLoading,
        error,
        rateBookmarks,
        getBookmarkRating,
        hasRating,
        getRatingStats,
        loadRatings,
        clearError: () => setError(null)
    };
} 
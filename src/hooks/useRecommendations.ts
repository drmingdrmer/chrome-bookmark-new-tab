import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { aiService } from '@/services/aiService';
import { Bookmark, BookmarkAnalysis, BookmarkDimension } from '@/types/bookmark';
import { BookmarkRating } from '@/utils/bookmark-ratings';
import {
    RecommendationsByDimension,
    getStoredRecommendations,
    saveRecommendations
} from '@/utils/bookmark-recommendations';

const DIMENSIONS: BookmarkDimension[] = ['work', 'learn', 'fun', 'tool', 'other'];
const TOP_COUNT = 5;

// 顶部推荐栏的数据源：加载已保存的推荐，仅在用户点刷新时重新分析
export function useRecommendations() {
    const [recommendations, setRecommendations] = useState<RecommendationsByDimension>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 配置共享自 aiService 单例，保存后立即生效
    const isConfigValid = useSyncExternalStore(aiService.subscribe, aiService.isConfigValid);

    useEffect(() => {
        aiService.loadConfig().catch(() => { /* 配置错误由使用配置的操作各自暴露 */ });
        getStoredRecommendations()
            .then(setRecommendations)
            .catch(err => setError(err instanceof Error ? err.message : '读取推荐失败'));
    }, []);

    // 从已保存的评分里，为每个维度重新分析出推荐并保存
    const refresh = useCallback(async (
        bookmarks: Bookmark[],
        allRatings: Record<string, BookmarkRating>
    ) => {
        if (!aiService.isConfigValid()) {
            setError('AI配置无效，请先配置API设置');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const analyses: BookmarkAnalysis[] = bookmarks.flatMap(bookmark => {
                const rating = bookmark.url ? allRatings[bookmark.url] : undefined;
                if (!rating) return [];
                return [{
                    bookmark,
                    score: rating.score,
                    dimension: rating.dimension as BookmarkDimension,
                    reason: rating.reason
                }];
            });

            const perDimension = await Promise.all(DIMENSIONS.map(async dimension => {
                const dimensionAnalyses = analyses.filter(a => a.dimension === dimension);
                if (dimensionAnalyses.length === 0) {
                    return [dimension, []] as const;
                }
                const recs = await aiService.getTopRecommendationsForDimension(
                    dimension,
                    dimensionAnalyses,
                    TOP_COUNT
                );
                return [dimension, recs] as const;
            }));

            const next: RecommendationsByDimension = Object.fromEntries(perDimension);
            await saveRecommendations(next);
            setRecommendations(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : '推荐生成失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { recommendations, isLoading, error, isConfigValid, refresh };
}

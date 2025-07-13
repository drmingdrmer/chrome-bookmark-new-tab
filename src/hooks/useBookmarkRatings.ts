import { useState, useEffect, useCallback } from 'react';
import { BookmarkRating, getAllRatings, saveRatings } from '@/utils/bookmark-ratings';
import { useAI } from './useAI';
import { Bookmark } from '@/types/bookmark';

export function useBookmarkRatings() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressStep, setProgressStep] = useState<string>('');
    const [showSuccess, setShowSuccess] = useState(false);

    const { analyzeBatch, isConfigValid } = useAI();

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
        setShowSuccess(false);
        setProgressStep('🔍 正在检查书签...');

        try {
            // 包含所有有URL的书签，允许重新评分
            const bookmarksToRate = bookmarks.filter(bookmark => bookmark.url);

            if (bookmarksToRate.length === 0) {
                setError('没有可评分的书签（需要有URL）');
                return;
            }

            setProgressStep(`📝 准备分析 ${bookmarksToRate.length} 个书签...`);

            // 调用AI批量分析
            const analyses = await analyzeBatch(bookmarksToRate, (step) => {
                setProgressStep(step);
            });

            setProgressStep('🔄 正在转换评分格式...');

            // 转换为评分格式
            const newRatings: BookmarkRating[] = analyses.map(analysis => ({
                url: analysis.bookmark.url!,
                score: analysis.score,
                dimension: analysis.dimension,
                reason: analysis.reason,
                timestamp: Date.now()
            }));

            setProgressStep('💾 正在保存评分结果...');

            // 保存到本地存储
            await saveRatings(newRatings);

            // 通知父组件更新评分数据
            // 不需要本地状态更新，由父组件重新加载评分

            setProgressStep('✅ 评分完成');
            setShowSuccess(true);

            // 通知需要刷新显示
            window.dispatchEvent(new CustomEvent('bookmark-ratings-updated', {
                detail: { updatedUrls: newRatings.map(r => r.url) }
            }));

            return newRatings;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '评分失败';
            setError(errorMessage);
            setProgressStep('❌ 评分失败');
            throw error;
        } finally {
            setIsLoading(false);
            // 不在这里清除状态，让组件自己管理状态清除
        }
    }, [analyzeBatch, isConfigValid]);





    // 清除所有状态
    const clearStatus = useCallback(() => {
        setProgressStep('');
        setShowSuccess(false);
        setError(null);
    }, []);

    return {
        isLoading,
        error,
        progressStep,
        showSuccess,
        rateBookmarks,
        clearError: () => setError(null),
        clearStatus
    };
} 
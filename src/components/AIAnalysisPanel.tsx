import React, { useState } from 'react';
import { Brain, Sparkles, TrendingUp, Target, X } from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { Bookmark, BookmarkAnalysis, BookmarkDimension } from '@/types/bookmark';
import { BookmarkRating } from '@/utils/bookmark-ratings';
import { ANALYZE_ALL_EVENT } from '@/utils/bookmark-helpers';

interface AIAnalysisPanelProps {
    isOpen: boolean;
    onClose: () => void;
    bookmarks: Bookmark[];
    allRatings: Record<string, BookmarkRating>;
}

const DIMENSION_LABELS = {
    work: '工作',
    learn: '学习',
    fun: '娱乐',
    tool: '工具',
    other: '其他'
};

const DIMENSION_COLORS = {
    work: 'text-blue-400',
    learn: 'text-green-400',
    fun: 'text-pink-400',
    tool: 'text-yellow-400',
    other: 'text-gray-400'
};

export function AIAnalysisPanel({ isOpen, onClose, bookmarks, allRatings }: AIAnalysisPanelProps) {
    const {
        isLoading,
        error,
        isConfigValid,
        getRecommendations,
        recommendations,
        clearError
    } = useAI();

    const [selectedDimension, setSelectedDimension] = useState<BookmarkDimension>('work');

    if (!isOpen) return null;

    // 已保存的评分就是"已分析结果"：分布和推荐都直接读取它，无需重新分析
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

    // 触发每个栏目各自评分，等价于逐个点击栏目的 AI 评分按钮；结果保存后分布会自动刷新
    const handleAnalyzeAll = () => {
        if (!isConfigValid) {
            alert('请先在设置中配置AI参数');
            return;
        }
        clearError();
        window.dispatchEvent(new CustomEvent(ANALYZE_ALL_EVENT));
    };

    const handleGetRecommendations = async (dimension: BookmarkDimension) => {
        if (!isConfigValid) {
            alert('请先在设置中配置AI参数');
            return;
        }

        // 用该维度已分析好的结果直接生成推荐
        const dimensionAnalyses = analyses.filter(a => a.dimension === dimension);
        if (dimensionAnalyses.length === 0) {
            return;
        }

        try {
            await getRecommendations(dimension, dimensionAnalyses, 5);
        } catch (error) {
            console.error('获取推荐失败:', error);
        }
    };

    const dimensionCounts = analyses.reduce((counts, analysis) => {
        counts[analysis.dimension] = (counts[analysis.dimension] || 0) + 1;
        return counts;
    }, {} as Record<BookmarkDimension, number>);

    const dimensionRecommendations = recommendations.filter(r => r.dimension === selectedDimension);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-20 left-6 w-96 max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl z-50 animate-slide-down">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                        <Brain className="w-5 h-5 text-purple-300" />
                        <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status */}
                    {!isConfigValid && (
                        <div className="p-4 bg-yellow-900/30 border border-yellow-400/30 rounded-lg">
                            <p className="text-sm text-yellow-300">
                                ⚠️ 请先在设置中配置AI参数
                            </p>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="p-4 bg-red-900/30 border border-red-400/30 rounded-lg">
                            <p className="text-sm text-red-300">
                                ❌ {error}
                            </p>
                        </div>
                    )}

                    {/* Analysis Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-medium text-white flex items-center space-x-2">
                                <TrendingUp className="w-4 h-4" />
                                <span>书签分析</span>
                            </h4>
                            <button
                                onClick={handleAnalyzeAll}
                                disabled={!isConfigValid}
                                className="px-3 py-1.5 text-sm text-purple-300 border border-purple-300/50 hover:bg-purple-300/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                分析全部 ({bookmarks.length})
                            </button>
                        </div>

                        {/* Analysis Results：直接来自已保存的评分 */}
                        {analyses.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-300">
                                    已分析 {analyses.length} 个书签
                                </p>

                                {/* Dimension Distribution */}
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(dimensionCounts).map(([dimension, count]) => (
                                        <div key={dimension} className="p-2 bg-white/5 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm ${DIMENSION_COLORS[dimension as BookmarkDimension]}`}>
                                                    {DIMENSION_LABELS[dimension as BookmarkDimension]}
                                                </span>
                                                <span className="text-sm text-gray-400">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">
                                {'还没有评分结果，点击"分析全部"或各栏目的评分按钮生成'}
                            </p>
                        )}
                    </div>

                    {/* Recommendations Section */}
                    {analyses.length > 0 && (
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                <h4 className="text-md font-medium text-white">智能推荐</h4>
                            </div>

                            {/* Dimension Selector */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {Object.entries(DIMENSION_LABELS).map(([dimension, label]) => {
                                    const count = dimensionCounts[dimension as BookmarkDimension] || 0;
                                    if (count === 0) return null;

                                    return (
                                        <button
                                            key={dimension}
                                            onClick={() => {
                                                setSelectedDimension(dimension as BookmarkDimension);
                                                handleGetRecommendations(dimension as BookmarkDimension);
                                            }}
                                            className={`px-3 py-1.5 text-sm rounded-lg ${selectedDimension === dimension
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                                }`}
                                        >
                                            {label} ({count})
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Recommendation Results */}
                            {dimensionRecommendations.length > 0 && (
                                <div className="space-y-3">
                                    {dimensionRecommendations.map((rec) => (
                                        <div key={rec.bookmark.id} className="p-3 bg-white/5 rounded-lg border-l-2 border-purple-400">
                                            <div className="flex items-start justify-between mb-2">
                                                <h5 className="text-sm font-medium text-white line-clamp-2">
                                                    {rec.bookmark.title}
                                                </h5>
                                                <div className="flex items-center space-x-1 ml-2">
                                                    {[...Array(rec.priority)].map((_, i) => (
                                                        <Target key={i} className="w-3 h-3 text-yellow-400" />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-2">
                                                {rec.recommendReason}
                                            </p>
                                            <a
                                                href={rec.bookmark.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-400 hover:text-blue-300 truncate block"
                                            >
                                                {rec.bookmark.url}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

import React from 'react';
import { Brain, TrendingUp, X } from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { Bookmark, BookmarkDimension } from '@/types/bookmark';
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
    const { isConfigValid } = useAI();

    if (!isOpen) return null;

    // 各维度的已评分数量，直接来自已保存的评分
    const dimensionCounts = bookmarks.reduce((counts, bookmark) => {
        const rating = bookmark.url ? allRatings[bookmark.url] : undefined;
        if (rating) {
            const dimension = rating.dimension as BookmarkDimension;
            counts[dimension] = (counts[dimension] || 0) + 1;
        }
        return counts;
    }, {} as Record<BookmarkDimension, number>);

    const ratedCount = Object.values(dimensionCounts).reduce((sum, count) => sum + count, 0);

    // 触发每个栏目各自评分，等价于逐个点击栏目的 AI 评分按钮；结果保存后分布会自动刷新
    const handleAnalyzeAll = () => {
        if (!isConfigValid) {
            alert('请先在设置中配置AI参数');
            return;
        }
        window.dispatchEvent(new CustomEvent(ANALYZE_ALL_EVENT));
    };

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

                        {/* Dimension Distribution：直接来自已保存的评分 */}
                        {ratedCount > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-300">
                                    已分析 {ratedCount} 个书签
                                </p>

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
                </div>
            </div>
        </>
    );
}

import React from 'react';
import { Sparkles, RefreshCw, Flame } from 'lucide-react';
import { BookmarkDimension } from '@/types/bookmark';
import { RecommendationsByDimension } from '@/utils/bookmark-recommendations';

interface RecommendationsBarProps {
    recommendations: RecommendationsByDimension;
    isLoading: boolean;
    error: string | null;
    isConfigValid: boolean;
    onRefresh: () => void;
}

// 固定顺序展示全部 5 个维度
const DIMENSION_META: { key: BookmarkDimension; label: string; icon: string; color: string }[] = [
    { key: 'work', label: '工作', icon: '💼', color: 'text-blue-400' },
    { key: 'learn', label: '学习', icon: '📚', color: 'text-green-400' },
    { key: 'fun', label: '娱乐', icon: '🎮', color: 'text-pink-400' },
    { key: 'tool', label: '工具', icon: '🔧', color: 'text-slate-400' },
    { key: 'other', label: '其他', icon: '📄', color: 'text-gray-400' }
];

// 推荐指数：priority 1-5，用火苗数量直观表示
function PriorityBadge({ priority }: { priority: number }) {
    const level = Math.max(1, Math.min(5, priority));
    return (
        <span className="flex items-center flex-shrink-0" title={`推荐指数 ${level}/5`}>
            {[...Array(level)].map((_, i) => (
                <Flame key={i} className="w-3 h-3 text-orange-400 fill-current" />
            ))}
        </span>
    );
}

export function RecommendationsBar({
    recommendations,
    isLoading,
    error,
    isConfigValid,
    onRefresh
}: RecommendationsBarProps) {
    return (
        <section className="relative mb-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
            <div className="relative flex items-center gap-2 mb-2 px-1">
                <div className="flex items-center gap-2 text-white">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <h2 className="text-sm font-semibold">推荐阅读</h2>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isLoading || !isConfigValid}
                    title={isConfigValid ? '重新分析各分类推荐' : '请先在设置中配置AI参数'}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-300 border border-white/10 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? '分析中...' : '刷新'}</span>
                </button>
            </div>

            {error && (
                <p className="text-xs text-red-400 px-1 mb-2">❌ {error}</p>
            )}
            {!isConfigValid && (
                <p className="text-xs text-yellow-300 px-1 mb-2">⚠️ 请先在设置中配置AI参数</p>
            )}

            <div
                className="relative grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))' }}
            >
                {DIMENSION_META.map(meta => {
                    const recs = recommendations[meta.key] || [];
                    return (
                        <div key={meta.key} className="rounded-lg border border-white/10 bg-white/[0.06] p-2 min-w-0">
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <span className={`text-sm font-medium ${meta.color}`}>
                                    {meta.icon} {meta.label}
                                </span>
                                <span className="text-xs text-gray-500">{recs.length}</span>
                            </div>

                            {recs.length === 0 ? (
                                <p className="text-xs text-gray-500 px-1 py-2">暂无推荐</p>
                            ) : (
                                <ul className="space-y-1">
                                    {recs.map(rec => (
                                        <li key={rec.bookmark.id}>
                                            <a
                                                href={rec.bookmark.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-1.5 rounded-lg hover:bg-white/5"
                                                title={rec.recommendReason}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="text-xs text-gray-200 line-clamp-1 flex-1 min-w-0">
                                                        {rec.bookmark.title}
                                                    </span>
                                                    <PriorityBadge priority={rec.priority} />
                                                </div>
                                                {rec.recommendReason && (
                                                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                                        {rec.recommendReason}
                                                    </p>
                                                )}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

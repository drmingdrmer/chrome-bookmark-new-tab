import React from 'react';
import { Star } from 'lucide-react';
import { StarRange } from '@/types/bookmark';
import { MAX_STARS, MIN_STARS } from '@/utils/bookmark-ratings';

interface StarRangeSliderProps {
    range: StarRange;
    onChange: (range: StarRange) => void;
}

const STAR_SPAN = MAX_STARS - MIN_STARS;

/**
 * 双滑块星级区间选择器
 *
 * 两个 range input 叠放在同一条轨道上，只有滑块本身接收指针事件，
 * 因此点击轨道任意位置都会落到离得更近的那个滑块上。
 */
export function StarRangeSlider({ range, onChange }: StarRangeSliderProps) {
    const toPercent = (stars: number) => ((stars - MIN_STARS) / STAR_SPAN) * 100;

    // 两端互相夹住，避免滑块交叉导致区间反转
    const handleMin = (value: number) => onChange({ ...range, min: Math.min(value, range.max) });
    const handleMax = (value: number) => onChange({ ...range, max: Math.max(value, range.min) });

    return (
        <div className="flex items-center space-x-3">
            <div className="relative flex items-center h-5 flex-1 min-w-[7rem]">
                {/* 轨道 */}
                <div className="absolute inset-x-0 h-1.5 bg-white/20 rounded-full" />

                {/* 选中区间 */}
                <div
                    className="absolute h-1.5 bg-purple-400 rounded-full"
                    style={{
                        left: `${toPercent(range.min)}%`,
                        right: `${100 - toPercent(range.max)}%`
                    }}
                />

                <input
                    type="range"
                    min={MIN_STARS}
                    max={MAX_STARS}
                    step={1}
                    value={range.min}
                    onChange={(e) => handleMin(Number(e.target.value))}
                    className="star-range-slider"
                    // 两个滑块重合在最右端时，让最小值滑块可以被拖回来
                    style={{ zIndex: range.min >= MAX_STARS ? 5 : 3 }}
                    aria-label="最低星级"
                />
                <input
                    type="range"
                    min={MIN_STARS}
                    max={MAX_STARS}
                    step={1}
                    value={range.max}
                    onChange={(e) => handleMax(Number(e.target.value))}
                    className="star-range-slider"
                    style={{ zIndex: 4 }}
                    aria-label="最高星级"
                />
            </div>

            <span className="flex items-center text-xs text-gray-300 whitespace-nowrap">
                <Star className="w-3 h-3 mr-1 text-yellow-400 fill-current" />
                {range.min} - {range.max}
            </span>
        </div>
    );
}

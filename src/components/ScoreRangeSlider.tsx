import React from 'react';
import { ScoreRange } from '@/types/bookmark';
import { MAX_SCORE, MIN_SCORE } from '@/utils/bookmark-ratings';

interface ScoreRangeSliderProps {
    range: ScoreRange;
    onChange: (range: ScoreRange) => void;
}

interface ScoreRowProps {
    label: string;
    value: number;
    onSelect: (score: number) => void;
}

interface ScoreButtonProps {
    label: string;
    score: number;
    isSelected: boolean;
    onSelect: (score: number) => void;
}

const SCORES = Array.from(
    { length: MAX_SCORE - MIN_SCORE + 1 },
    (_, index) => MIN_SCORE + index
);

function ScoreButton({ label, score, isSelected, onSelect }: ScoreButtonProps) {
    const className = isSelected
        ? 'bg-purple-400 text-gray-900'
        : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white';

    return (
        <button
            type="button"
            onClick={() => onSelect(score)}
            className={`h-6 min-w-0 rounded-sm text-[10px] leading-none transition-colors ${className}`}
            aria-pressed={isSelected}
            aria-label={`Set ${label} score to ${score}`}
        >
            {score}
        </button>
    );
}

function ScoreRow({ label, value, onSelect }: ScoreRowProps) {
    return (
        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-1">
            <span className="text-[10px] font-medium text-gray-400">{label}</span>
            <div className="grid grid-cols-11 gap-px" role="group" aria-label={`${label} score`}>
                {SCORES.map(score => (
                    <ScoreButton
                        key={score}
                        label={label}
                        score={score}
                        isSelected={score === value}
                        onSelect={onSelect}
                    />
                ))}
            </div>
        </div>
    );
}

export function ScoreRangeSlider({ range, onChange }: ScoreRangeSliderProps) {
    const handleMin = (min: number) => onChange({ min, max: Math.max(min, range.max) });
    const handleMax = (max: number) => onChange({ min: Math.min(max, range.min), max });

    return (
        <div className="grid gap-0.5 w-full min-w-0">
            <ScoreRow label="min" value={range.min} onSelect={handleMin} />
            <ScoreRow label="max" value={range.max} onSelect={handleMax} />
        </div>
    );
}

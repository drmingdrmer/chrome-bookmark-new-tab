import React from 'react';

interface BookmarkCascadeProps {
    children: React.ReactElement[];
}

const CARD_MIN_WIDTH = 18 * 16;
const CARD_GAP = 12;

function getColumnCount(width: number): number {
    return Math.max(1, Math.floor((width + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)));
}

function useColumnCount(containerRef: React.RefObject<HTMLDivElement>): number {
    const [columnCount, setColumnCount] = React.useState(1);

    React.useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateColumnCount = () => {
            const nextColumnCount = getColumnCount(container.clientWidth);
            setColumnCount(current => current === nextColumnCount ? current : nextColumnCount);
        };
        const observer = new ResizeObserver(updateColumnCount);

        updateColumnCount();
        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef]);

    return columnCount;
}

function partitionCards(cards: React.ReactElement[], columnCount: number): React.ReactElement[][] {
    const columns = Array.from({ length: columnCount }, () => [] as React.ReactElement[]);
    cards.forEach((card, index) => columns[index % columnCount].push(card));
    return columns;
}

export function BookmarkCascade({ children }: BookmarkCascadeProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const columnCount = useColumnCount(containerRef);
    const columns = partitionCards(children, columnCount);

    return (
        <div
            ref={containerRef}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
            {columns.map((cards, index) => (
                <div key={index} className="space-y-3 [&>div]:h-auto">
                    {cards}
                </div>
            ))}
        </div>
    );
}

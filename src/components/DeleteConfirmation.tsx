import React from 'react';

interface DeleteConfirmationProps {
    bookmarkTitle: string;
    onCancel: () => void;
    onConfirm: () => void;
}

function handleAction(event: React.MouseEvent, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
}

export function DeleteConfirmation({
    bookmarkTitle,
    onCancel,
    onConfirm,
}: DeleteConfirmationProps) {
    return (
        <div
            role="dialog"
            aria-label={`确认删除 ${bookmarkTitle}`}
            className="absolute bottom-0 right-6 z-20 flex items-center gap-1 rounded border border-red-400/30 bg-gray-900 px-1 py-1 shadow-lg"
        >
            <span className="whitespace-nowrap px-1 text-xs text-gray-200">确认删除？</span>
            <button
                type="button"
                onClick={event => handleAction(event, onCancel)}
                className="rounded px-1.5 py-0.5 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
            >
                取消
            </button>
            <button
                type="button"
                onClick={event => handleAction(event, onConfirm)}
                className="rounded bg-red-500/80 px-1.5 py-0.5 text-xs text-white hover:bg-red-500"
            >
                删除
            </button>
        </div>
    );
}

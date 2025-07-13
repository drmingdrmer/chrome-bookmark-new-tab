import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/components/App';
import '@/styles/globals.css';
import { debugDragAndDrop } from '@/utils/drag-debug';

// 使调试函数在控制台可用
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
    (window as any).debugDragAndDrop = debugDragAndDrop;
    console.log('💡 提示：在控制台运行 debugDragAndDrop() 来诊断拖拽问题');
}

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    process.env.NODE_ENV === 'development' ? (
        <React.StrictMode>
            <App />
        </React.StrictMode>
    ) : (
        <App />
    )
); 
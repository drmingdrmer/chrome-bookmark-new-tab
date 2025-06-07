// 拖拽调试工具
export function debugDragAndDrop() {
    console.log('🔍 开始拖拽功能诊断...');

    // 1. 检查是否有可拖拽元素
    const allDraggableElements = document.querySelectorAll('[draggable="true"]');
    console.log(`📊 找到 ${allDraggableElements.length} 个draggable="true"元素`);

    // 过滤出真正的书签项（排除拖拽手柄等）
    const bookmarkElements = Array.from(allDraggableElements).filter(el => {
        return el.className.includes('group relative flex items-start');
    });

    console.log(`📚 其中 ${bookmarkElements.length} 个是书签项`);

    if (bookmarkElements.length === 0) {
        console.error('❌ 没有找到可拖拽的书签元素！');
        return;
    }

    // 2. 检查第一个书签元素
    const firstElement = bookmarkElements[0] as HTMLElement;
    console.log('🎯 第一个书签元素:', {
        tagName: firstElement.tagName,
        className: firstElement.className.substring(0, 50) + '...',
        draggable: firstElement.draggable,
        hasChildren: firstElement.children.length
    });

    // 3. 检查事件监听器（使用真实的拖拽事件）
    console.log('📋 检查拖拽事件处理器...');

    // 创建一个带有dataTransfer的拖拽事件
    let dragStartFired = false;
    const tempHandler = (e: DragEvent) => {
        dragStartFired = true;
        console.log('  ✅ dragstart事件触发了！');
        console.log('  - dataTransfer存在:', !!e.dataTransfer);
    };

    firstElement.addEventListener('dragstart', tempHandler, { once: true });

    // 尝试使用真实的DragEvent
    try {
        const dragStartEvent = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true
        });

        // 手动触发
        firstElement.dispatchEvent(dragStartEvent);

        if (!dragStartFired) {
            console.log('  ⚠️ dragstart事件未被触发');
        }
    } catch (error) {
        console.error('  ❌ 创建DragEvent失败:', error);
    }

    firstElement.removeEventListener('dragstart', tempHandler);

    // 4. 检查内部链接元素
    const links = firstElement.querySelectorAll('a');
    if (links.length > 0) {
        console.log(`⚠️ 找到 ${links.length} 个链接元素:`);
        links.forEach((link, index) => {
            const linkDraggable = link.getAttribute('draggable');
            console.log(`  - 链接 ${index + 1}: draggable="${linkDraggable}", href="${link.href.substring(0, 50)}..."`);
        });
    }

    // 5. 检查拖拽手柄
    const dragHandles = firstElement.querySelectorAll('.drag-handle');
    if (dragHandles.length > 0) {
        console.log(`🔧 找到 ${dragHandles.length} 个拖拽手柄`);
        dragHandles.forEach((handle, index) => {
            const handleDraggable = handle.getAttribute('draggable');
            console.log(`  - 手柄 ${index + 1}: draggable="${handleDraggable}"`);
        });
    }

    // 6. 检查CSS
    const computedStyle = window.getComputedStyle(firstElement);
    console.log('🎨 元素样式:', {
        cursor: computedStyle.cursor,
        userSelect: computedStyle.userSelect,
        pointerEvents: computedStyle.pointerEvents,
        position: computedStyle.position
    });

    // 7. 检查React Props
    console.log('⚛️ 检查React属性...');
    const reactKey = Object.keys(firstElement).find(key => key.startsWith('__react'));
    if (reactKey) {
        console.log('  ✅ 找到React fiber');
    } else {
        console.log('  ⚠️ 未找到React fiber（可能是生产构建）');
    }

    console.log('\n📝 建议：');
    console.log('1. 确保拖拽整个书签项，而不是拖拽手柄');
    console.log('2. 检查控制台是否有"🚀 拖拽开始"日志');
    console.log('3. 确保Chrome扩展有bookmarks权限');
    console.log('4. 尝试在不同的书签之间拖拽');

    console.log('\n✅ 拖拽诊断完成');
}

// 将函数添加到全局对象，方便在控制台调用
if (typeof window !== 'undefined') {
    (window as any).debugDragAndDrop = debugDragAndDrop;
} 
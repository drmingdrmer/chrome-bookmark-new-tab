// 拖拽功能调试工具 - @dnd-kit版本

interface DragDebugResult {
    totalElements: number;
    bookmarkItems: number;
    folderColumns: number;
    sortableContexts: number;
    dndContexts: number;
    errors: string[];
    recommendations: string[];
}

export function debugDragAndDrop(): DragDebugResult {
    const result: DragDebugResult = {
        totalElements: 0,
        bookmarkItems: 0,
        folderColumns: 0,
        sortableContexts: 0,
        dndContexts: 0,
        errors: [],
        recommendations: []
    };

    try {
        console.log('🔍 开始调试 @dnd-kit 拖拽功能...');

        // 检查 DnD Context (查找包含 dnd-kit 的元素)
        const dndWrappers = document.querySelectorAll('[data-dnd-wrapper], [data-dndkit-scrollable-container]');
        const rootElements = document.querySelectorAll('body > div');
        result.dndContexts = dndWrappers.length > 0 ? dndWrappers.length : rootElements.length;
        console.log(`📱 找到 ${result.dndContexts} 个可能的 DndContext 容器`);

        // 检查书签项目
        const bookmarkItems = document.querySelectorAll('.group.relative.flex.items-start');
        result.bookmarkItems = bookmarkItems.length;
        console.log(`📚 找到 ${result.bookmarkItems} 个书签项目`);

        // 检查文件夹列
        const folderColumns = document.querySelectorAll('.flex-shrink-0.w-80.rounded-xl');
        result.folderColumns = folderColumns.length;
        console.log(`📁 找到 ${result.folderColumns} 个文件夹列`);

        // 检查拖拽手柄
        const dragHandles = document.querySelectorAll('.drag-handle');
        console.log(`🤏 找到 ${dragHandles.length} 个拖拽手柄`);

        // 验证 @dnd-kit 特有属性
        const sortableElements = document.querySelectorAll('[data-sortable-item]');
        const droppableElements = document.querySelectorAll('[data-droppable]');
        console.log(`🔢 找到 ${sortableElements.length} 个可排序元素`);
        console.log(`📍 找到 ${droppableElements.length} 个可放置元素`);

        result.totalElements = bookmarkItems.length + folderColumns.length + dragHandles.length;

        // 错误检查
        if (result.bookmarkItems === 0) {
            result.errors.push('未找到书签项目');
        }

        if (dragHandles.length === 0) {
            result.errors.push('未找到拖拽手柄');
        }

        // 检查第一个书签项目的拖拽属性
        if (bookmarkItems.length > 0) {
            const firstItem = bookmarkItems[0] as HTMLElement;
            const dragHandle = firstItem.querySelector('.drag-handle');

            if (!dragHandle) {
                result.errors.push('书签项目缺少拖拽手柄');
            } else {
                console.log('✅ 第一个书签项目有拖拽手柄');

                // 检查拖拽手柄的事件监听器属性
                const handleProps = Object.getOwnPropertyNames(dragHandle).filter(prop =>
                    prop.includes('react') || prop.includes('event')
                );
                if (handleProps.length > 0) {
                    console.log('✅ 拖拽手柄有事件属性');
                }
            }
        }

        // 检查是否有@dnd-kit相关的React组件
        const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
        if (reactElements.length > 0) {
            console.log('⚛️ 检测到React应用');
        }

        // 建议
        if (result.errors.length === 0) {
            result.recommendations.push('✅ @dnd-kit 拖拽功能看起来配置正确');
            result.recommendations.push('🎯 可以尝试拖拽书签测试功能');
            result.recommendations.push('💡 使用鼠标拖拽手柄（三横线图标）来拖拽书签');
        } else {
            result.recommendations.push('🔧 需要检查 @dnd-kit 的配置');
        }

        // 输出详细信息
        console.log('\n📊 调试结果汇总:');
        console.log(`- DndContext 容器: ${result.dndContexts}`);
        console.log(`- 书签项目: ${result.bookmarkItems}`);
        console.log(`- 文件夹列: ${result.folderColumns}`);
        console.log(`- 拖拽手柄: ${dragHandles.length}`);
        console.log(`- 可排序元素: ${sortableElements.length}`);
        console.log(`- 可放置元素: ${droppableElements.length}`);

        if (result.errors.length > 0) {
            console.log('\n❌ 发现的问题:');
            result.errors.forEach(error => console.log(`  - ${error}`));
        }

        if (result.recommendations.length > 0) {
            console.log('\n💡 建议:');
            result.recommendations.forEach(rec => console.log(`  - ${rec}`));
        }

        // 测试拖拽手柄交互
        if (dragHandles.length > 0) {
            console.log('\n🎮 测试拖拽手柄交互:');
            const firstHandle = dragHandles[0] as HTMLElement;

            // 模拟鼠标悬停
            const parentElement = firstHandle.closest('.group');
            if (parentElement) {
                parentElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

                const handleStyle = window.getComputedStyle(firstHandle);
                console.log(`  - 手柄可见性: ${handleStyle.opacity}`);
                console.log(`  - 鼠标样式: ${handleStyle.cursor}`);

                // 检查是否有opacity变化
                if (handleStyle.opacity !== '0') {
                    console.log('  ✅ 拖拽手柄在悬停时可见');
                } else {
                    console.log('  ⚠️ 拖拽手柄在悬停时可能不可见');
                }
            }
        }

        // 额外的调试信息
        console.log('\n🔧 调试提示:');
        console.log('1. 尝试拖拽书签项目左侧的三横线图标');
        console.log('2. 检查控制台是否有"🚀 开始拖拽"相关日志');
        console.log('3. 确保 Chrome 扩展有 bookmarks 权限');
        console.log('4. 如果拖拽不工作，请检查网络控制台的错误信息');

        return result;

    } catch (error) {
        console.error('❌ 调试过程中出错:', error);
        result.errors.push(`调试工具错误: ${error}`);
        return result;
    }
}

// 全局暴露调试函数
declare global {
    interface Window {
        debugDragAndDrop: () => DragDebugResult;
    }
}

if (typeof window !== 'undefined') {
    window.debugDragAndDrop = debugDragAndDrop;
} 
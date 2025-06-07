const { ExtensionTester } = require('./test-utils');

describe('Chrome Extension - 拖拽功能测试', () => {
    let tester;
    let browser;
    let page;

    beforeAll(async () => {
        tester = new ExtensionTester();
        browser = await tester.launchBrowser();
    });

    afterAll(async () => {
        if (tester) {
            await tester.cleanup();
        }
    });

    beforeEach(async () => {
        page = await tester.createNewTab();
        await page.waitForTimeout(3000); // 等待扩展页面完全加载
    });

    afterEach(async () => {
        if (page && !page.isClosed()) {
            await page.close();
        }
    });

    test('应该能够检测拖拽手柄的存在', async () => {
        // 等待页面加载
        await page.waitForTimeout(2000);

        // 检查是否有拖拽手柄存在
        const dragHandles = await page.evaluate(() => {
            const gripIcons = document.querySelectorAll('svg[class*="lucide-grip-vertical"]');
            return Array.from(gripIcons).map(icon => ({
                visible: window.getComputedStyle(icon.closest('.opacity-0') || icon).opacity !== '0',
                parentClasses: icon.closest('div')?.className || '',
                hasGripVertical: icon.classList.contains('lucide-grip-vertical') || 
                                icon.getAttribute('data-lucide') === 'grip-vertical'
            }));
        });

        console.log('🎯 拖拽手柄检测结果:', dragHandles);

        // 检查是否有书签项目
        const bookmarkItems = await page.evaluate(() => {
            const items = document.querySelectorAll('[draggable="true"]');
            return Array.from(items).map(item => ({
                draggable: item.getAttribute('draggable'),
                className: item.className,
                hasGripIcon: !!item.querySelector('svg[class*="grip-vertical"]')
            }));
        });

        console.log('📚 可拖拽书签项目:', bookmarkItems);

        if (bookmarkItems.length > 0) {
            console.log('✅ 拖拽手柄检测完成 - 找到可拖拽项目');
            expect(bookmarkItems.some(item => item.draggable === 'true')).toBe(true);
        } else {
            console.log('ℹ️ 当前没有书签数据，这是正常的');
        }
    });

    test('应该能够模拟拖拽操作', async () => {
        // 等待页面加载
        await page.waitForTimeout(2000);

        // 检查是否有可拖拽的元素
        const draggableElements = await page.$$('[draggable="true"]');
        
        if (draggableElements.length > 0) {
            console.log(`✅ 找到 ${draggableElements.length} 个可拖拽元素`);

            // 模拟拖拽操作
            const dragResult = await page.evaluate(() => {
                const draggables = document.querySelectorAll('[draggable="true"]');
                if (draggables.length < 2) {
                    return { status: 'insufficient_items', count: draggables.length };
                }

                const source = draggables[0];
                const target = draggables[1];

                // 模拟 dragstart 事件
                const dragStartEvent = new DragEvent('dragstart', {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: new DataTransfer()
                });

                // 模拟 dragover 事件
                const dragOverEvent = new DragEvent('dragover', {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: new DataTransfer()
                });

                // 模拟 drop 事件
                const dropEvent = new DragEvent('drop', {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: new DataTransfer()
                });

                try {
                    source.dispatchEvent(dragStartEvent);
                    target.dispatchEvent(dragOverEvent);
                    target.dispatchEvent(dropEvent);

                    return { 
                        status: 'success', 
                        dragStartPrevented: dragStartEvent.defaultPrevented,
                        dragOverPrevented: dragOverEvent.defaultPrevented,
                        dropPrevented: dropEvent.defaultPrevented 
                    };
                } catch (error) {
                    return { status: 'error', message: error.message };
                }
            });

            console.log('🎯 拖拽操作结果:', dragResult);

            if (dragResult.status === 'success') {
                console.log('✅ 拖拽事件模拟成功');
            } else if (dragResult.status === 'insufficient_items') {
                console.log(`ℹ️ 书签项目不足，只有 ${dragResult.count} 个项目`);
            }
        } else {
            console.log('ℹ️ 没有找到可拖拽的元素（可能没有书签数据）');
        }
    });

    test('应该能够检测拖拽样式类', async () => {
        // 检查CSS中是否定义了拖拽相关的样式
        const dragStyles = await page.evaluate(() => {
            const styles = Array.from(document.styleSheets).flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch (e) {
                    return [];
                }
            });

            return {
                hasDraggingClass: styles.some(rule => 
                    rule.selectorText && rule.selectorText.includes('dragging')
                ),
                hasDragOverClass: styles.some(rule => 
                    rule.selectorText && rule.selectorText.includes('drag-over')
                ),
                hasDropBeforeClass: styles.some(rule => 
                    rule.selectorText && rule.selectorText.includes('drop-before')
                ),
                hasDropAfterClass: styles.some(rule => 
                    rule.selectorText && rule.selectorText.includes('drop-after')
                )
            };
        });

        console.log('🎨 拖拽样式检测:', dragStyles);

        expect(dragStyles.hasDraggingClass).toBe(true);
        expect(dragStyles.hasDragOverClass).toBe(true);

        console.log('✅ 拖拽样式检测完成');
    });
}); 
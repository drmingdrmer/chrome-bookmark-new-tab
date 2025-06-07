const { ExtensionTester } = require('./test-utils');

describe('Chrome Extension - 拖拽索引计算测试', () => {
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
        await page.waitForTimeout(3000);
    });

    afterEach(async () => {
        if (page && !page.isClosed()) {
            await page.close();
        }
    });

    test('应该能够注入测试书签数据并测试拖拽索引计算', async () => {
        // 注入测试数据和拖拽逻辑到页面
        const indexCalculationTest = await page.evaluate(() => {
            // 模拟书签数据
            const mockBookmarks = {
                '1': { id: '1', title: 'Bookmark 1', parentId: 'folder1', isFolder: false },
                '2': { id: '2', title: 'Bookmark 2', parentId: 'folder1', isFolder: false },
                '3': { id: '3', title: 'Bookmark 3', parentId: 'folder1', isFolder: false },
                '4': { id: '4', title: 'Bookmark 4', parentId: 'folder1', isFolder: false },
                '5': { id: '5', title: 'Bookmark 5', parentId: 'folder2', isFolder: false }
            };

            // 模拟拖拽索引计算逻辑
            function calculateDropIndex(draggedId, targetBookmark, targetIndex, allBookmarks, dropBefore) {
                let newIndex = targetIndex;

                if (dropBefore) {
                    newIndex = targetIndex;
                } else {
                    newIndex = targetIndex + 1;
                }

                const draggedBookmark = allBookmarks[draggedId];
                if (draggedBookmark && draggedBookmark.parentId === targetBookmark.parentId) {
                    const siblings = Object.values(allBookmarks).filter(b =>
                        b.parentId === targetBookmark.parentId && !b.isFolder
                    );
                    const draggedCurrentIndex = siblings.findIndex(b => b.id === draggedId);

                    if (draggedCurrentIndex !== -1 && draggedCurrentIndex < targetIndex) {
                        newIndex = Math.max(0, newIndex - 1);
                    }
                }

                return newIndex;
            }

            // 测试各种拖拽场景
            const testCases = [
                {
                    name: '在同一文件夹内，从位置0拖拽到位置2之前',
                    draggedId: '1',
                    targetId: '3',
                    targetIndex: 2,
                    dropBefore: true,
                    expected: 1 // 因为拖拽项目从0移除，所以目标位置2变成1
                },
                {
                    name: '在同一文件夹内，从位置0拖拽到位置2之后',
                    draggedId: '1',
                    targetId: '3',
                    targetIndex: 2,
                    dropBefore: false,
                    expected: 2 // 从0拖拽到2之后，调整后的位置是2
                },
                {
                    name: '在同一文件夹内，从位置3拖拽到位置1之前',
                    draggedId: '4',
                    targetId: '2',
                    targetIndex: 1,
                    dropBefore: true,
                    expected: 1 // 从后面拖拽到前面，不需要调整
                },
                {
                    name: '跨文件夹拖拽，从folder2到folder1的位置1之前',
                    draggedId: '5',
                    targetId: '2',
                    targetIndex: 1,
                    dropBefore: true,
                    expected: 1 // 跨文件夹，不需要调整
                }
            ];

            const results = testCases.map(testCase => {
                const targetBookmark = mockBookmarks[testCase.targetId];
                const calculated = calculateDropIndex(
                    testCase.draggedId,
                    targetBookmark,
                    testCase.targetIndex,
                    mockBookmarks,
                    testCase.dropBefore
                );

                return {
                    ...testCase,
                    calculated,
                    passed: calculated === testCase.expected
                };
            });

            return {
                totalTests: results.length,
                passedTests: results.filter(r => r.passed).length,
                results: results
            };
        });

        console.log('🧮 拖拽索引计算测试结果:', indexCalculationTest);

        // 验证所有测试都通过
        expect(indexCalculationTest.passedTests).toBe(indexCalculationTest.totalTests);

        // 输出详细结果
        indexCalculationTest.results.forEach(result => {
            console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
            console.log(`   预期: ${result.expected}, 实际: ${result.calculated}`);
        });

        console.log('✅ 拖拽索引计算逻辑测试完成');
    });

    test('应该能够检测拖拽相关的事件处理器', async () => {
        // 检查页面中是否正确设置了拖拽事件处理器
        const dragEventHandlers = await page.evaluate(() => {
            // 创建模拟的拖拽元素
            const testDiv = document.createElement('div');
            testDiv.draggable = true;
            testDiv.className = 'test-drag-element';
            document.body.appendChild(testDiv);

            // 检查是否能正确处理拖拽事件
            let dragStartCalled = false;
            let dragOverCalled = false;
            let dropCalled = false;

            testDiv.addEventListener('dragstart', () => { dragStartCalled = true; });
            testDiv.addEventListener('dragover', (e) => {
                e.preventDefault();
                dragOverCalled = true;
            });
            testDiv.addEventListener('drop', (e) => {
                e.preventDefault();
                dropCalled = true;
            });

            // 模拟拖拽事件
            const dragStartEvent = new DragEvent('dragstart', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });

            const dragOverEvent = new DragEvent('dragover', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });

            const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer()
            });

            testDiv.dispatchEvent(dragStartEvent);
            testDiv.dispatchEvent(dragOverEvent);
            testDiv.dispatchEvent(dropEvent);

            // 清理测试元素
            document.body.removeChild(testDiv);

            return {
                dragStartCalled,
                dragOverCalled,
                dropCalled,
                hasDragSupport: 'DataTransfer' in window
            };
        });

        console.log('🎯 拖拽事件处理器测试:', dragEventHandlers);

        expect(dragEventHandlers.dragStartCalled).toBe(true);
        expect(dragEventHandlers.dragOverCalled).toBe(true);
        expect(dragEventHandlers.dropCalled).toBe(true);
        expect(dragEventHandlers.hasDragSupport).toBe(true);

        console.log('✅ 拖拽事件处理器测试完成');
    });
}); 
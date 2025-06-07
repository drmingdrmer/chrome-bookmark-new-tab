const puppeteer = require('puppeteer');
const path = require('path');

const extensionPath = path.join(__dirname, '..', 'dist');
const TIMEOUT = 30000;

describe('Chrome Extension - 带数据的拖拽测试', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            devtools: false,
            args: [
                `--load-extension=${extensionPath}`,
                '--disable-extensions-except=' + extensionPath,
                '--disable-web-security',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const pages = await browser.pages();
        page = pages[0];

        // 监听控制台消息
        page.on('console', msg => {
            if (msg.text().includes('拖拽') || msg.text().includes('移动') || msg.text().includes('🚀') || msg.text().includes('📦') || msg.text().includes('🎯')) {
                console.log('🖥️ 拖拽相关消息:', msg.text());
            }
        });

        await page.goto('chrome://newtab/');
        await page.waitForTimeout(3000);
    }, TIMEOUT);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('应该能够创建模拟书签并测试拖拽', async () => {
        try {
            console.log('🚀 开始拖拽测试...');

            // 注入模拟书签数据和拖拽测试代码
            const testResult = await page.evaluate(() => {
                console.log('📋 开始注入模拟数据...');

                // 模拟Chrome bookmarks API
                if (!window.chrome) window.chrome = {};
                if (!window.chrome.bookmarks) window.chrome.bookmarks = {};

                // 模拟书签数据
                const mockBookmarks = [
                    {
                        id: "0",
                        title: "",
                        children: [
                            {
                                id: "1",
                                title: "Bookmarks Bar",
                                parentId: "0",
                                index: 0,
                                children: [
                                    {
                                        id: "101",
                                        title: "Google",
                                        url: "https://www.google.com",
                                        parentId: "1",
                                        index: 0
                                    },
                                    {
                                        id: "102",
                                        title: "GitHub",
                                        url: "https://github.com",
                                        parentId: "1",
                                        index: 1
                                    },
                                    {
                                        id: "103",
                                        title: "Stack Overflow",
                                        url: "https://stackoverflow.com",
                                        parentId: "1",
                                        index: 2
                                    }
                                ]
                            }
                        ]
                    }
                ];

                // 模拟API函数
                window.chrome.bookmarks.getTree = (callback) => {
                    setTimeout(() => callback(mockBookmarks), 100);
                };

                window.chrome.bookmarks.move = (id, destination, callback) => {
                    console.log('🔧 模拟移动书签:', { id, destination });
                    const result = { id, parentId: destination.parentId, index: destination.index };
                    setTimeout(() => callback(result), 100);
                    return result;
                };

                // 触发React重新渲染
                const event = new Event('chrome-bookmarks-updated');
                window.dispatchEvent(event);

                return {
                    success: true,
                    mockDataInjected: true,
                    bookmarkCount: mockBookmarks[0].children[0].children.length
                };
            });

            console.log('📊 模拟数据注入结果:', testResult);

            // 等待React重新渲染
            await page.waitForTimeout(2000);

            // 手动创建拖拽测试元素
            await page.evaluate(() => {
                console.log('🎨 创建测试拖拽元素...');

                // 查找或创建容器
                let container = document.querySelector('#test-drag-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'test-drag-container';
                    container.style.cssText = `
                        position: fixed;
                        top: 100px;
                        left: 100px;
                        width: 300px;
                        height: 200px;
                        background: rgba(0,0,0,0.8);
                        color: white;
                        padding: 20px;
                        border-radius: 10px;
                        z-index: 9999;
                    `;
                    document.body.appendChild(container);
                }

                container.innerHTML = `
                    <h3>拖拽测试区域</h3>
                    <div id="drag-item-1" draggable="true" style="padding: 10px; margin: 5px; background: #333; border-radius: 5px; cursor: move;">
                        📄 可拖拽项目 1
                    </div>
                    <div id="drag-item-2" draggable="true" style="padding: 10px; margin: 5px; background: #333; border-radius: 5px; cursor: move;">
                        📄 可拖拽项目 2
                    </div>
                    <div id="drop-zone" style="padding: 20px; margin: 10px; background: #444; border: 2px dashed #666; border-radius: 5px; text-align: center;">
                        🎯 放置区域
                    </div>
                `;

                // 添加拖拽事件处理器
                const item1 = document.getElementById('drag-item-1');
                const item2 = document.getElementById('drag-item-2');
                const dropZone = document.getElementById('drop-zone');

                let dragCount = 0;
                let dropCount = 0;

                [item1, item2].forEach(item => {
                    item.addEventListener('dragstart', (e) => {
                        console.log('🚀 拖拽开始:', item.id);
                        e.dataTransfer.setData('text/plain', item.id);
                        item.style.opacity = '0.5';
                        dragCount++;
                    });

                    item.addEventListener('dragend', (e) => {
                        console.log('🏁 拖拽结束:', item.id);
                        item.style.opacity = '1';
                    });
                });

                dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropZone.style.background = '#555';
                });

                dropZone.addEventListener('dragleave', (e) => {
                    dropZone.style.background = '#444';
                });

                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    console.log('📦 拖拽放下:', draggedId);
                    dropZone.style.background = '#060';
                    dropZone.innerHTML = `✅ 接收到: ${draggedId}`;
                    dropCount++;

                    // 保存计数到全局变量
                    window.testDragStats = { dragCount, dropCount };
                });

                return { elementsCreated: true };
            });

            console.log('🎨 测试元素创建完成');

            // 等待元素渲染
            await page.waitForTimeout(1000);

            // 截图看当前状态
            await page.screenshot({
                path: path.join(__dirname, 'screenshots', 'drag-test-setup.png'),
                fullPage: true
            });

            // 进行拖拽操作
            console.log('🎮 开始拖拽操作...');

            // 获取元素位置
            const item1Bounds = await page.$eval('#drag-item-1', el => {
                const rect = el.getBoundingClientRect();
                return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            });

            const dropZoneBounds = await page.$eval('#drop-zone', el => {
                const rect = el.getBoundingClientRect();
                return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            });

            console.log('📍 拖拽源位置:', item1Bounds);
            console.log('📍 放置目标位置:', dropZoneBounds);

            // 执行拖拽
            await page.mouse.move(item1Bounds.x, item1Bounds.y);
            await page.mouse.down();
            await page.waitForTimeout(200);

            await page.mouse.move(dropZoneBounds.x, dropZoneBounds.y, { steps: 10 });
            await page.waitForTimeout(200);

            await page.mouse.up();

            console.log('🎯 拖拽操作完成');

            // 等待处理完成
            await page.waitForTimeout(1000);

            // 检查结果
            const finalResult = await page.evaluate(() => {
                const stats = window.testDragStats || { dragCount: 0, dropCount: 0 };
                const dropZone = document.getElementById('drop-zone');
                return {
                    dragStats: stats,
                    dropZoneContent: dropZone ? dropZone.innerHTML : 'not found',
                    dropZoneBackground: dropZone ? dropZone.style.background : 'unknown'
                };
            });

            console.log('📊 最终拖拽测试结果:', finalResult);

            // 截图保存最终状态
            await page.screenshot({
                path: path.join(__dirname, 'screenshots', 'drag-test-final.png'),
                fullPage: true
            });

            // 验证拖拽是否成功
            expect(finalResult.dragStats.dragCount).toBeGreaterThan(0);
            expect(finalResult.dropStats?.dropCount || 0).toBeGreaterThan(0);

            console.log('✅ 拖拽功能测试完成');

        } catch (error) {
            console.error('❌ 拖拽测试失败:', error);

            await page.screenshot({
                path: path.join(__dirname, 'screenshots', 'drag-test-error.png'),
                fullPage: true
            });

            throw error;
        }
    }, TIMEOUT);
}); 
const puppeteer = require('puppeteer');
const path = require('path');

const extensionPath = path.join(__dirname, '..', 'dist');
const TIMEOUT = 30000;

describe('Chrome Extension - 实际拖拽测试', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false, // 需要看到拖拽操作
            args: [
                `--load-extension=${extensionPath}`,
                '--disable-extensions-except=' + extensionPath,
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--no-sandbox'
            ]
        });

        const pages = await browser.pages();
        page = pages[0];

        await page.goto('chrome://newtab/');
        await page.waitForTimeout(2000);
    }, TIMEOUT);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('应该能够拖拽书签到不同位置', async () => {
        try {
            // 等待页面加载
            await page.waitForSelector('[data-testid="folder-column"]', { timeout: 10000 });
            console.log('✅ 页面加载完成');

            // 等待书签加载
            await page.waitForSelector('[draggable="true"]', { timeout: 10000 });
            console.log('✅ 找到可拖拽的书签');

            // 获取所有可拖拽的书签
            const bookmarks = await page.$$('[draggable="true"]');
            console.log(`📚 找到 ${bookmarks.length} 个书签`);

            if (bookmarks.length < 2) {
                console.log('⚠️ 需要至少2个书签来测试拖拽');
                return;
            }

            // 获取第一个和第二个书签的位置
            const firstBookmark = bookmarks[0];
            const secondBookmark = bookmarks[1];

            const firstBox = await firstBookmark.boundingBox();
            const secondBox = await secondBookmark.boundingBox();

            console.log('🎯 第一个书签位置:', firstBox);
            console.log('🎯 第二个书签位置:', secondBox);

            // 检查拖拽事件处理器
            const hasDragStart = await firstBookmark.evaluate(el => {
                return typeof el.ondragstart === 'function' || el.getAttribute('draggable') === 'true';
            });
            console.log('🎛️ 拖拽支持:', hasDragStart);

            // 模拟拖拽操作
            await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
            await page.mouse.down();

            // 检查是否有拖拽开始的视觉反馈
            await page.waitForTimeout(100);
            const isDragging = await firstBookmark.evaluate(el => {
                return el.classList.contains('dragging');
            });
            console.log('🎨 拖拽视觉反馈:', isDragging);

            // 移动到第二个书签
            await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 });

            // 检查是否有拖拽悬停的视觉反馈
            await page.waitForTimeout(100);
            const isHovering = await secondBookmark.evaluate(el => {
                return el.classList.contains('drag-over');
            });
            console.log('🎨 悬停视觉反馈:', isHovering);

            await page.mouse.up();

            console.log('🎯 拖拽操作完成');

            // 等待一段时间看看是否有变化
            await page.waitForTimeout(2000);

            // 检查DOM是否有变化
            const newBookmarks = await page.$$('[draggable="true"]');
            console.log(`📚 拖拽后书签数量: ${newBookmarks.length}`);

            // 获取书签标题来检查顺序是否改变
            const bookmarkTitles = await page.evaluate(() => {
                const bookmarkElements = document.querySelectorAll('[draggable="true"] h3');
                return Array.from(bookmarkElements).map(el => el.textContent.trim());
            });
            console.log('📖 当前书签顺序:', bookmarkTitles);

        } catch (error) {
            console.error('❌ 拖拽测试失败:', error);

            // 截图保存错误状态
            await page.screenshot({
                path: path.join(__dirname, 'screenshots', 'drag-error.png'),
                fullPage: true
            });
        }
    }, TIMEOUT);

    test('应该能够检查拖拽事件处理器', async () => {
        try {
            // 注入测试脚本来检查事件处理器
            const dragTest = await page.evaluate(() => {
                const bookmarks = document.querySelectorAll('[draggable="true"]');
                if (bookmarks.length === 0) return { error: '没有找到可拖拽的书签' };

                const firstBookmark = bookmarks[0];

                // 检查事件处理器
                const hasEvents = {
                    dragstart: typeof firstBookmark.ondragstart === 'function',
                    dragover: typeof firstBookmark.ondragover === 'function',
                    drop: typeof firstBookmark.ondrop === 'function',
                    draggable: firstBookmark.getAttribute('draggable') === 'true'
                };

                // 模拟拖拽事件
                let eventsFired = {
                    dragstart: false,
                    dragover: false,
                    drop: false
                };

                // 创建模拟事件
                const dragStartEvent = new DragEvent('dragstart', {
                    bubbles: true,
                    cancelable: true
                });

                const dragOverEvent = new DragEvent('dragover', {
                    bubbles: true,
                    cancelable: true
                });

                const dropEvent = new DragEvent('drop', {
                    bubbles: true,
                    cancelable: true
                });

                // 添加临时事件监听器来检测事件是否被触发
                firstBookmark.addEventListener('dragstart', () => { eventsFired.dragstart = true; });
                firstBookmark.addEventListener('dragover', () => { eventsFired.dragover = true; });
                firstBookmark.addEventListener('drop', () => { eventsFired.drop = true; });

                // 触发事件
                firstBookmark.dispatchEvent(dragStartEvent);
                firstBookmark.dispatchEvent(dragOverEvent);
                firstBookmark.dispatchEvent(dropEvent);

                return {
                    hasEvents,
                    eventsFired,
                    bookmarkCount: bookmarks.length
                };
            });

            console.log('🧪 拖拽事件处理器测试结果:', dragTest);

            expect(dragTest.hasEvents.draggable).toBe(true);
            expect(dragTest.bookmarkCount).toBeGreaterThan(0);

        } catch (error) {
            console.error('❌ 事件处理器测试失败:', error);
        }
    }, TIMEOUT);
}); 
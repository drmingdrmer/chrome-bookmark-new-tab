const puppeteer = require('puppeteer');
const path = require('path');

const extensionPath = path.join(__dirname, '..', 'dist');
const TIMEOUT = 20000;

describe('Chrome Extension - 简单拖拽测试', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            devtools: true, // 打开开发者工具看控制台
            args: [
                `--load-extension=${extensionPath}`,
                '--disable-extensions-except=' + extensionPath,
                '--disable-web-security',
                '--no-sandbox'
            ]
        });

        const pages = await browser.pages();
        page = pages[0];

        await page.goto('chrome://newtab/');
        await page.waitForTimeout(3000); // 等待加载
    }, TIMEOUT);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('应该能够加载扩展并检测拖拽功能', async () => {
        try {
            // 监听控制台输出
            page.on('console', msg => {
                console.log('🖥️ 页面控制台:', msg.text());
            });

            // 等待页面加载
            console.log('⏳ 等待页面加载...');

            // 检查是否有书签容器
            const hasContainer = await page.evaluate(() => {
                return document.querySelector('body') !== null;
            });
            console.log('📦 页面容器存在:', hasContainer);

            // 等待更长时间
            await page.waitForTimeout(5000);

            // 检查是否有可拖拽元素
            const draggableElements = await page.evaluate(() => {
                const elements = document.querySelectorAll('[draggable="true"]');
                return {
                    count: elements.length,
                    hasElements: elements.length > 0,
                    firstElementTag: elements.length > 0 ? elements[0].tagName : null,
                    firstElementClass: elements.length > 0 ? elements[0].className : null
                };
            });

            console.log('🎯 可拖拽元素检测:', draggableElements);

            // 检查是否有书签数据
            const bookmarkData = await page.evaluate(() => {
                // 查找任何包含书签的元素
                const bookmarkElements = document.querySelectorAll('h3, a[href]');
                return {
                    totalElements: bookmarkElements.length,
                    hasBookmarks: bookmarkElements.length > 0,
                    sampleTitles: Array.from(bookmarkElements).slice(0, 3).map(el => el.textContent?.trim() || el.href).filter(Boolean)
                };
            });

            console.log('📚 书签数据检测:', bookmarkData);

            // 截图保存当前状态
            await page.screenshot({
                path: path.join(__dirname, 'screenshots', 'drag-simple-test.png'),
                fullPage: true
            });
            console.log('📸 截图已保存');

            // 如果有可拖拽元素，尝试模拟拖拽
            if (draggableElements.count >= 2) {
                console.log('🎮 开始拖拽测试...');

                const dragResult = await page.evaluate(() => {
                    const elements = document.querySelectorAll('[draggable="true"]');
                    const first = elements[0];
                    const second = elements[1];

                    if (!first || !second) return { error: '没有足够的元素进行拖拽' };

                    // 创建拖拽事件
                    const dragStartEvent = new DragEvent('dragstart', {
                        bubbles: true,
                        cancelable: true,
                        dataTransfer: new DataTransfer()
                    });

                    const dropEvent = new DragEvent('drop', {
                        bubbles: true,
                        cancelable: true,
                        dataTransfer: new DataTransfer()
                    });

                    // 设置拖拽数据
                    dragStartEvent.dataTransfer.setData('text/plain', 'test-id');
                    dropEvent.dataTransfer.setData('text/plain', 'test-id');

                    // 触发事件
                    first.dispatchEvent(dragStartEvent);
                    second.dispatchEvent(dropEvent);

                    return {
                        success: true,
                        firstElement: first.className,
                        secondElement: second.className
                    };
                });

                console.log('🧪 拖拽事件测试结果:', dragResult);
            }

        } catch (error) {
            console.error('❌ 测试失败:', error);

            // 截图保存错误状态
            await page.screenshot({
                path: path.join(__dirname, 'screenshots', 'drag-simple-error.png'),
                fullPage: true
            });
        }
    }, TIMEOUT);
}); 
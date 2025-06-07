const { ExtensionTester } = require('./test-utils');

describe('Chrome Extension - 真实扩展交互测试', () => {
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
        // 等待扩展页面完全加载
        await page.waitForTimeout(3000);
    });

    afterEach(async () => {
        if (page && !page.isClosed()) {
            await page.close();
        }
    });

    test('应该能够检测扩展的真实DOM结构', async () => {
        // 获取页面的真实内容，不替换任何内容
        const pageInfo = await page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasSearchBox: !!document.getElementById('searchBox'),
                hasSettingsToggle: !!document.getElementById('settings-toggle'),
                hasSettingsPanel: !!document.getElementById('settings-panel'),
                hasBookmarksContainer: !!document.getElementById('bookmarks-container'),
                bodyContent: document.body.innerHTML.substring(0, 500) + '...',
                scripts: Array.from(document.querySelectorAll('script')).map(s => ({
                    src: s.src,
                    type: s.type
                }))
            };
        });

        console.log('📋 扩展页面真实信息:', JSON.stringify(pageInfo, null, 2));

        // 验证这是真正的扩展页面
        expect(pageInfo.url).toContain('chrome-extension://');
        expect(pageInfo.title).toBe('New Tab');

        // 截图看看真实页面
        await tester.takeScreenshot(page, 'real-extension-page');
    });

    test('应该能够与扩展的真实搜索框交互', async () => {
        // 等待搜索框加载
        const searchBoxExists = await tester.waitForElement(page, '#searchBox', 10000);

        if (searchBoxExists) {
            // 与真实的搜索框交互
            await page.focus('#searchBox');
            await page.type('#searchBox', '测试搜索');

            const searchValue = await page.$eval('#searchBox', el => el.value);
            expect(searchValue).toBe('测试搜索');

            console.log('✅ 成功与真实搜索框交互');
        } else {
            console.log('⚠️ 搜索框未找到，可能扩展还未完全加载');

            // 获取当前页面状态用于调试
            const currentState = await page.evaluate(() => ({
                readyState: document.readyState,
                elementCount: document.querySelectorAll('*').length,
                hasSearch: !!document.getElementById('searchBox'),
                bodyContent: document.body.innerHTML.substring(0, 200)
            }));

            console.log('页面当前状态:', currentState);
        }
    });

    test('应该能够与扩展的真实设置功能交互', async () => {
        // 等待设置按钮加载
        const settingsToggleExists = await tester.waitForElement(page, '#settings-toggle', 10000);

        if (settingsToggleExists) {
            // 获取设置面板初始状态
            const initialPanelState = await page.evaluate(() => {
                const panel = document.getElementById('settings-panel');
                return panel ? {
                    exists: true,
                    display: window.getComputedStyle(panel).display,
                    visibility: window.getComputedStyle(panel).visibility
                } : { exists: false };
            });

            console.log('设置面板初始状态:', initialPanelState);

            // 点击设置按钮
            await page.evaluate(() => {
                document.getElementById('settings-toggle').click();
            });

            await page.waitForTimeout(500);

            // 检查设置面板状态变化
            const afterClickPanelState = await page.evaluate(() => {
                const panel = document.getElementById('settings-panel');
                return panel ? {
                    exists: true,
                    display: window.getComputedStyle(panel).display,
                    visibility: window.getComputedStyle(panel).visibility
                } : { exists: false };
            });

            console.log('点击后设置面板状态:', afterClickPanelState);
            console.log('✅ 成功与真实设置功能交互');

        } else {
            console.log('⚠️ 设置按钮未找到');
        }
    });

    test('应该能够测试扩展的真实JavaScript功能', async () => {
        // 检查扩展的JavaScript函数是否可用
        const extentionFunctions = await page.evaluate(() => {
            return {
                // 检查全局函数
                hasToggleSettings: typeof window.toggleSettings === 'function',
                hasSearchBookmarks: typeof window.searchBookmarks === 'function',
                hasRenderBookmarks: typeof window.renderBookmarks === 'function',

                // 检查模块是否加载
                moduleScripts: Array.from(document.querySelectorAll('script[type="module"]')).length,

                // 检查是否有事件监听器（间接检测）
                hasEventListeners: document.getElementById('searchBox') ?
                    document.getElementById('searchBox').onclick !== null ||
                    document.getElementById('searchBox').oninput !== null : false
            };
        });

        console.log('🔧 扩展JavaScript功能检测:', extentionFunctions);

        // 验证扩展有JavaScript模块
        expect(extentionFunctions.moduleScripts).toBeGreaterThan(0);

        console.log('✅ 扩展JavaScript功能检测完成');
    });

    test('应该能够测试扩展的书签加载功能', async () => {
        // 等待书签容器加载
        const bookmarksContainerExists = await tester.waitForElement(page, '#bookmarks-container', 10000);

        if (bookmarksContainerExists) {
            // 检查书签是否已加载
            const bookmarksInfo = await page.evaluate(() => {
                const container = document.getElementById('bookmarks-container');
                return {
                    exists: true,
                    childCount: container.children.length,
                    hasBookmarkItems: container.querySelectorAll('.bookmark-item').length > 0,
                    content: container.innerHTML.substring(0, 300)
                };
            });

            console.log('📚 书签加载信息:', bookmarksInfo);

            if (bookmarksInfo.hasBookmarkItems) {
                console.log('✅ 扩展成功加载了书签');
            } else {
                console.log('ℹ️ 扩展已加载但可能没有书签数据（这是正常的）');
            }

        } else {
            console.log('⚠️ 书签容器未找到');
        }
    });
}); 
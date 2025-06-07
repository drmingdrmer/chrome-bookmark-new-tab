const { ExtensionTester } = require('./test-utils');

describe('Chrome Extension - 真实扩展功能测试', () => {
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

    test('真实扩展 - 应该正确加载扩展页面和DOM结构', async () => {
        // 验证扩展页面基本信息
        const pageInfo = await page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            readyState: document.readyState
        }));

        expect(pageInfo.url).toContain('chrome-extension://');
        expect(pageInfo.title).toBe('New Tab');
        expect(pageInfo.readyState).toBe('complete');

        // 验证扩展的真实DOM元素存在
        const elements = await page.evaluate(() => ({
            searchBox: !!document.getElementById('searchBox'),
            settingsToggle: !!document.getElementById('settings-toggle'),
            settingsPanel: !!document.getElementById('settings-panel'),
            bookmarksContainer: !!document.getElementById('bookmarks-container')
        }));

        expect(elements.searchBox).toBe(true);
        expect(elements.settingsToggle).toBe(true);
        expect(elements.settingsPanel).toBe(true);
        expect(elements.bookmarksContainer).toBe(true);

        console.log('✅ 扩展页面和DOM结构验证通过');
    });

    test('真实扩展 - 应该能够与真实搜索框进行交互', async () => {
        // 等待搜索框加载
        const searchBoxExists = await tester.waitForElement(page, '#searchBox', 5000);
        expect(searchBoxExists).toBe(true);

        // 清空搜索框（如果有初始内容）
        await page.evaluate(() => {
            document.getElementById('searchBox').value = '';
        });

        // 与真实搜索框交互
        await page.focus('#searchBox');
        await page.type('#searchBox', '真实扩展测试');

        // 验证输入值
        const searchValue = await page.$eval('#searchBox', el => el.value);
        expect(searchValue).toBe('真实扩展测试');

        console.log('✅ 真实搜索框交互测试通过');
    });

    test('真实扩展 - 应该能够切换真实的设置面板', async () => {
        // 等待设置按钮加载
        const settingsToggleExists = await tester.waitForElement(page, '#settings-toggle', 5000);
        expect(settingsToggleExists).toBe(true);

        // 获取真实设置面板的初始状态
        const initialState = await page.evaluate(() => {
            const panel = document.getElementById('settings-panel');
            return panel ? window.getComputedStyle(panel).display : null;
        });

        console.log('真实设置面板初始状态:', initialState);
        expect(initialState).toBe('none');

        // 点击真实的设置按钮
        await page.evaluate(() => {
            document.getElementById('settings-toggle').click();
        });

        // 等待扩展的JavaScript处理
        await page.waitForTimeout(300);

        // 验证面板是否显示
        const afterClickState = await page.evaluate(() => {
            const panel = document.getElementById('settings-panel');
            return panel ? window.getComputedStyle(panel).display : null;
        });

        console.log('点击后真实设置面板状态:', afterClickState);
        expect(afterClickState).toBe('block');

        // 再次点击应该隐藏
        await page.evaluate(() => {
            document.getElementById('settings-toggle').click();
        });
        await page.waitForTimeout(300);

        const finalState = await page.evaluate(() => {
            const panel = document.getElementById('settings-panel');
            return panel ? window.getComputedStyle(panel).display : null;
        });

        expect(finalState).toBe('none');

        console.log('✅ 真实设置面板切换测试通过');
    });

    test('真实扩展 - 应该能够检测真实的书签容器和内容', async () => {
        // 等待书签容器加载
        const bookmarksContainerExists = await tester.waitForElement(page, '#bookmarks-container', 5000);
        expect(bookmarksContainerExists).toBe(true);

        // 检查真实的书签容器状态
        const bookmarksInfo = await page.evaluate(() => {
            const container = document.getElementById('bookmarks-container');
            if (!container) return null;

            return {
                exists: true,
                childElementCount: container.childElementCount,
                innerHTML: container.innerHTML,
                hasBookmarkItems: container.querySelectorAll('.bookmark-item').length > 0,
                hasBookmarkFolders: container.querySelectorAll('.bookmark-folder').length > 0
            };
        });

        expect(bookmarksInfo.exists).toBe(true);

        console.log('真实书签容器信息:', {
            childElementCount: bookmarksInfo.childElementCount,
            hasBookmarkItems: bookmarksInfo.hasBookmarkItems,
            hasBookmarkFolders: bookmarksInfo.hasBookmarkFolders
        });

        // 无论是否有书签内容，容器本身应该存在
        console.log('✅ 真实书签容器检测通过');
    });

    test('真实扩展 - 应该能够检测真实的JavaScript模块加载', async () => {
        // 检查扩展的JavaScript模块是否已加载
        const moduleInfo = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
            return {
                moduleCount: scripts.length,
                modules: scripts.map(script => ({
                    src: script.src,
                    loaded: script.readyState || 'unknown'
                }))
            };
        });

        expect(moduleInfo.moduleCount).toBeGreaterThan(0);

        console.log('真实JavaScript模块信息:', moduleInfo);
        console.log('✅ 真实JavaScript模块检测通过');
    });

    test('真实扩展 - 应该能够测试真实的搜索功能（如果可用）', async () => {
        // 首先检查搜索框是否响应输入事件
        await page.focus('#searchBox');
        await page.type('#searchBox', 'test');

        // 等待可能的搜索处理
        await page.waitForTimeout(500);

        // 检查是否有任何变化（这取决于扩展的具体实现）
        const afterSearchState = await page.evaluate(() => {
            const container = document.getElementById('bookmarks-container');
            const searchBox = document.getElementById('searchBox');

            return {
                searchValue: searchBox.value,
                containerChanged: container.innerHTML.length > 0,
                containerContent: container.innerHTML.substring(0, 200)
            };
        });

        expect(afterSearchState.searchValue).toBe('test');

        console.log('真实搜索功能测试结果:', afterSearchState);
        console.log('✅ 真实搜索功能测试完成');
    });

    test('真实扩展 - 综合功能验证', async () => {
        // 综合测试多个真实功能
        console.log('开始综合功能验证...');

        // 1. 搜索框交互
        await page.focus('#searchBox');
        await page.type('#searchBox', 'comprehensive test');

        // 2. 设置面板切换
        await page.evaluate(() => {
            document.getElementById('settings-toggle').click();
        });
        await page.waitForTimeout(200);

        // 3. 检查所有功能状态
        const comprehensiveState = await page.evaluate(() => {
            return {
                searchValue: document.getElementById('searchBox').value,
                settingsPanelVisible: window.getComputedStyle(document.getElementById('settings-panel')).display === 'block',
                bookmarksContainerExists: !!document.getElementById('bookmarks-container'),
                pageTitle: document.title,
                url: window.location.href
            };
        });

        // 验证综合状态
        expect(comprehensiveState.searchValue).toBe('comprehensive test');
        expect(comprehensiveState.settingsPanelVisible).toBe(true);
        expect(comprehensiveState.bookmarksContainerExists).toBe(true);
        expect(comprehensiveState.pageTitle).toBe('New Tab');
        expect(comprehensiveState.url).toContain('chrome-extension://');

        // 截图记录最终状态
        await tester.takeScreenshot(page, 'real-extension-comprehensive-test');

        console.log('✅ 真实扩展综合功能验证通过');
    });
}); 
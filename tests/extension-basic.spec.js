const { test, expect } = require('@playwright/test');
const path = require('path');
const { createExtensionContext } = require('./test-utils');

test.describe('Bookmark New Tab Extension - Basic Functionality', () => {
    let context;

    test.beforeAll(async ({ browser }) => {
        context = await createExtensionContext(browser);
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('Extension HTML file should exist and have correct structure', async () => {
        // 直接检查HTML文件结构，不依赖浏览器加载
        const fs = require('fs');
        const htmlPath = path.join(__dirname, '..', 'new-tab.html');

        // 检查文件是否存在
        expect(fs.existsSync(htmlPath)).toBe(true);

        // 读取并检查HTML内容
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // 检查必要的HTML元素
        expect(htmlContent).toContain('<title>New Tab</title>');
        expect(htmlContent).toContain('id="searchBox"');
        expect(htmlContent).toContain('id="settings-toggle"');
        expect(htmlContent).toContain('id="settings-panel"');
        expect(htmlContent).toContain('id="bookmarks-container"');
        expect(htmlContent).toContain('placeholder="Search bookmarks..."');

        // 检查脚本引用
        expect(htmlContent).toContain('src="ui.js"');
        expect(htmlContent).toContain('src="new-tab.js"');
        expect(htmlContent).toContain('type="module"');
    });

    test('JavaScript files should exist', async () => {
        const fs = require('fs');

        const jsFiles = [
            'new-tab.js',
            'ui.js',
            'drag.js',
            'folder_color.js'
        ];

        for (const jsFile of jsFiles) {
            const jsPath = path.join(__dirname, '..', jsFile);
            expect(fs.existsSync(jsPath)).toBe(true);

            // 检查文件不为空
            const content = fs.readFileSync(jsPath, 'utf8');
            expect(content.trim().length).toBeGreaterThan(0);
        }
    });

    test('CSS file should exist and contain expected styles', async () => {
        const fs = require('fs');
        const cssPath = path.join(__dirname, '..', 'new-tab.css');

        expect(fs.existsSync(cssPath)).toBe(true);

        const cssContent = fs.readFileSync(cssPath, 'utf8');

        // 检查重要的CSS规则
        expect(cssContent).toContain('.search-box');
        expect(cssContent).toContain('.settings-panel');
        expect(cssContent).toContain('.bookmarks-container');
        expect(cssContent).toContain('.bookmark-item');
    });

    test('Manifest file should be properly configured', async () => {
        const fs = require('fs');
        const manifestPath = path.join(__dirname, '..', 'manifest.json');

        expect(fs.existsSync(manifestPath)).toBe(true);

        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);

        // 检查基本配置
        expect(manifest.manifest_version).toBe(3);
        expect(manifest.name).toBe('Bookmark New Tab');
        expect(manifest.permissions).toContain('bookmarks');
        expect(manifest.permissions).toContain('storage');
        expect(manifest.chrome_url_overrides.newtab).toBe('new-tab.html');
    });

    test('Extension context should be properly configured', async () => {
        // 测试扩展上下文创建是否成功
        expect(context).toBeDefined();

        // 创建一个页面来验证扩展上下文工作
        const page = await context.newPage();
        expect(page).toBeDefined();

        // 检查用户代理是否包含Chrome
        const userAgent = await page.evaluate(() => navigator.userAgent);
        expect(userAgent).toContain('Chrome');

        await page.close();
    });
}); 
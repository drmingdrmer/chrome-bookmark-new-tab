const { test, expect } = require('@playwright/test');
const path = require('path');
const { createExtensionContext } = require('./test-utils');

test.describe('Bookmark New Tab Extension - Bookmarks Code Analysis', () => {
    let context;

    test.beforeAll(async ({ browser }) => {
        context = await createExtensionContext(browser);
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('should have bookmark-related functions in JavaScript files', async () => {
        const fs = require('fs');
        const newTabJsPath = path.join(__dirname, '..', 'new-tab.js');

        expect(fs.existsSync(newTabJsPath)).toBe(true);

        const content = fs.readFileSync(newTabJsPath, 'utf8');

        // 检查书签相关函数
        expect(content).toContain('collectAllBookmarks');
        expect(content).toContain('renderBookmarks');
        expect(content).toContain('filterBookmarks');
        expect(content).toContain('createBookmarkElement');
        expect(content).toContain('chrome.bookmarks');
    });

    test('should have search functionality code', async () => {
        const fs = require('fs');
        const newTabJsPath = path.join(__dirname, '..', 'new-tab.js');

        const content = fs.readFileSync(newTabJsPath, 'utf8');

        // 检查搜索相关代码
        expect(content).toContain('filterBookmarks');
        expect(content).toContain('searchBox');
        expect(content).toContain('addEventListener');
        expect(content).toContain('input');
    });

    test('should have drag and drop functionality', async () => {
        const fs = require('fs');
        const dragJsPath = path.join(__dirname, '..', 'drag.js');

        expect(fs.existsSync(dragJsPath)).toBe(true);

        const content = fs.readFileSync(dragJsPath, 'utf8');

        // 检查拖拽相关函数
        expect(content).toContain('handleDragStart');
        expect(content).toContain('handleDragOver');
        expect(content).toContain('handleDrop');
        expect(content).toContain('updateBookmarkOrder');
    });

    test('should have proper HTML structure for bookmarks', async () => {
        const fs = require('fs');
        const htmlPath = path.join(__dirname, '..', 'new-tab.html');

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // 检查书签相关的HTML结构
        expect(htmlContent).toContain('id="bookmarks-container"');
        expect(htmlContent).toContain('class="bookmarks-container"');
        expect(htmlContent).toContain('id="searchBox"');
        expect(htmlContent).toContain('placeholder="Search bookmarks..."');
    });

    test('should have CSS styles for bookmarks', async () => {
        const fs = require('fs');
        const cssPath = path.join(__dirname, '..', 'new-tab.css');

        const cssContent = fs.readFileSync(cssPath, 'utf8');

        // 检查书签相关的CSS
        expect(cssContent).toContain('.bookmarks-container');
        expect(cssContent).toContain('.bookmark-item');
        expect(cssContent).toContain('.bookmark-link');
        expect(cssContent).toContain('.bookmark-url');
        expect(cssContent).toContain('.search-box');
    });

    test('should have folder and drag-related CSS', async () => {
        const fs = require('fs');
        const cssPath = path.join(__dirname, '..', 'new-tab.css');

        const cssContent = fs.readFileSync(cssPath, 'utf8');

        // 检查文件夹和拖拽相关的CSS
        expect(cssContent).toContain('.folder');
        expect(cssContent).toContain('.drag-handle');
        expect(cssContent).toContain('.delete-button');
        expect(cssContent).toContain('drag');
    });

    test('Extension should be able to create basic pages', async () => {
        // 测试扩展上下文可以创建页面
        const page = await context.newPage();
        expect(page).toBeDefined();

        // 验证基本的页面功能
        const title = await page.evaluate(() => document.title);
        expect(typeof title).toBe('string');

        await page.close();
    });
}); 
const puppeteer = require('puppeteer');
const path = require('path');

/**
 * Puppeteer测试工具类
 */
class ExtensionTester {
    constructor() {
        this.browser = null;
        this.extensionPath = path.resolve(__dirname, '..');
    }

    /**
     * 启动带有扩展的Chrome浏览器
     */
    async launchBrowser(options = {}) {
        const defaultOptions = {
            headless: false, // Chrome扩展需要非headless模式
            devtools: false,
            args: [
                `--load-extension=${this.extensionPath}`,
                `--disable-extensions-except=${this.extensionPath}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                `--user-data-dir=/tmp/puppeteer-chrome-extension-${Date.now()}`
            ],
            ...options
        };

        this.browser = await puppeteer.launch(defaultOptions);
        return this.browser;
    }

    /**
     * 获取扩展ID
     */
    async getExtensionId() {
        if (!this.browser) {
            throw new Error('Browser not launched. Call launchBrowser() first.');
        }

        const page = await this.browser.newPage();
        await page.goto('chrome://extensions/');

        // 获取扩展ID
        const extensionId = await page.evaluate(() => {
            const extensions = document.querySelectorAll('extensions-item');
            for (const ext of extensions) {
                const name = ext.shadowRoot.querySelector('#name')?.textContent;
                if (name && name.includes('Bookmark New Tab')) {
                    return ext.getAttribute('id');
                }
            }
            return null;
        });

        await page.close();
        return extensionId;
    }

    /**
     * 创建新标签页并导航到扩展页面
     */
    async createNewTab() {
        if (!this.browser) {
            throw new Error('Browser not launched. Call launchBrowser() first.');
        }

        const page = await this.browser.newPage();

        // 直接导航到chrome://newtab/ 
        // 如果扩展正确加载，应该会显示我们的扩展页面
        await page.goto('chrome://newtab/');

        // 等待页面加载
        await page.waitForTimeout(2000);

        return page;
    }

    /**
     * 等待元素出现
     */
    async waitForElement(page, selector, timeout = 5000) {
        try {
            await page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 注入模拟的Chrome API
     */
    async injectMockChromeAPI(page) {
        await page.evaluateOnNewDocument(() => {
            // 模拟Chrome扩展API
            window.chrome = {
                bookmarks: {
                    getTree: (callback) => {
                        const mockBookmarks = [
                            {
                                id: '0',
                                title: '',
                                children: [
                                    {
                                        id: '1',
                                        title: 'Bookmarks Bar',
                                        children: [
                                            { id: '2', title: 'Google', url: 'https://google.com' },
                                            { id: '3', title: 'GitHub', url: 'https://github.com' },
                                            {
                                                id: '4',
                                                title: 'Dev Tools',
                                                children: [
                                                    { id: '5', title: 'MDN', url: 'https://developer.mozilla.org' },
                                                    { id: '6', title: 'Stack Overflow', url: 'https://stackoverflow.com' }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ];
                        if (callback) callback(mockBookmarks);
                    },

                    search: (query, callback) => {
                        const results = [
                            { id: '2', title: 'Google', url: 'https://google.com' }
                        ];
                        if (callback) callback(results);
                    }
                },

                storage: {
                    local: {
                        get: (keys, callback) => {
                            const mockData = {
                                'max-entries': 20,
                                'show-urls': true,
                                'theme': 'light'
                            };
                            if (callback) callback(mockData);
                        },

                        set: (items, callback) => {
                            if (callback) callback();
                        }
                    }
                },

                runtime: {
                    getURL: (path) => `chrome-extension://mock-extension-id/${path}`
                }
            };
        });
    }

    /**
     * 截取页面截图
     */
    async takeScreenshot(page, name) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${name}-${timestamp}.png`;
        const screenshotPath = path.join(__dirname, 'screenshots', filename);

        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });

        return screenshotPath;
    }

    /**
     * 获取页面诊断信息
     */
    async getPageDiagnostics(page) {
        return await page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                readyState: document.readyState,
                hasChrome: typeof chrome !== 'undefined',
                hasBookmarksAPI: typeof chrome !== 'undefined' && chrome.bookmarks !== undefined,
                hasStorageAPI: typeof chrome !== 'undefined' && chrome.storage !== undefined,
                elements: {
                    searchBox: !!document.getElementById('searchBox'),
                    settingsToggle: !!document.getElementById('settings-toggle'),
                    settingsPanel: !!document.getElementById('settings-panel'),
                    bookmarksContainer: !!document.getElementById('bookmarks-container')
                },
                scripts: Array.from(document.querySelectorAll('script')).map(s => ({
                    src: s.src,
                    type: s.type
                }))
            };
        });
    }

    /**
     * 清理资源
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

/**
 * 创建模拟书签数据
 */
function createMockBookmarks() {
    return [
        {
            id: '0',
            title: '',
            children: [
                {
                    id: '1',
                    title: 'Bookmarks Bar',
                    children: [
                        { id: '2', title: 'Google', url: 'https://google.com' },
                        { id: '3', title: 'GitHub', url: 'https://github.com' },
                        { id: '4', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
                        {
                            id: '5',
                            title: 'Development',
                            children: [
                                { id: '6', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
                                { id: '7', title: 'Can I Use', url: 'https://caniuse.com' }
                            ]
                        }
                    ]
                }
            ]
        }
    ];
}

module.exports = {
    ExtensionTester,
    createMockBookmarks
}; 
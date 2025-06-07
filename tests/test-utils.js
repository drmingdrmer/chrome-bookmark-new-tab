const path = require('path');

/**
 * 创建带有Chrome扩展的浏览器上下文
 */
async function createExtensionContext(browser) {
    const extensionPath = path.join(__dirname, '..');

    const context = await browser.newContext({
        args: [
            `--load-extension=${extensionPath}`,
            `--disable-extensions-except=${extensionPath}`,
            '--no-sandbox',
            '--disable-web-security'
        ]
    });

    return context;
}

/**
 * 等待元素可见
 */
async function waitForElement(page, selector, timeout = 5000) {
    try {
        await page.waitForSelector(selector, {
            state: 'visible',
            timeout
        });
        return true;
    } catch (error) {
        console.warn(`Element ${selector} not found within ${timeout}ms`);
        return false;
    }
}

/**
 * 等待页面加载完成
 */
async function waitForPageLoad(page, timeout = 10000) {
    try {
        await page.waitForLoadState('networkidle', { timeout });
        return true;
    } catch (error) {
        console.warn(`Page did not reach networkidle state within ${timeout}ms`);
        // 尝试至少等待domcontentloaded
        try {
            await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
            return true;
        } catch (domError) {
            console.warn('Page did not reach domcontentloaded state');
            return false;
        }
    }
}

/**
 * 检查JavaScript错误
 */
async function checkForJSErrors(page) {
    const errors = [];

    page.on('pageerror', (error) => {
        errors.push({
            type: 'pageerror',
            message: error.message,
            stack: error.stack
        });
    });

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push({
                type: 'console.error',
                message: msg.text()
            });
        }
    });

    return {
        getErrors: () => errors,
        hasErrors: () => errors.length > 0,
        clearErrors: () => errors.length = 0
    };
}

/**
 * 获取页面诊断信息
 */
async function getPageDiagnostics(page) {
    return await page.evaluate(() => {
        const diagnostics = {
            url: window.location.href,
            title: document.title,
            readyState: document.readyState,
            visibilityState: document.visibilityState,
            hasChromeGlobal: typeof chrome !== 'undefined',
            hasBookmarksAPI: typeof chrome !== 'undefined' && chrome.bookmarks !== undefined,
            hasStorageAPI: typeof chrome !== 'undefined' && chrome.storage !== undefined,
            scriptElements: Array.from(document.querySelectorAll('script')).map(script => ({
                src: script.src,
                type: script.type,
                loaded: script.readyState || 'unknown'
            })),
            moduleScripts: Array.from(document.querySelectorAll('script[type="module"]')).length,
            errors: []
        };

        // 检查关键DOM元素
        const keyElements = [
            'searchBox',
            'settings-toggle',
            'settings-panel',
            'bookmarks-container'
        ];

        diagnostics.elements = {};
        keyElements.forEach(id => {
            const element = document.getElementById(id);
            diagnostics.elements[id] = {
                exists: !!element,
                visible: element ? !element.hidden && window.getComputedStyle(element).display !== 'none' : false,
                className: element ? element.className : null
            };
        });

        // 检查关键函数是否存在
        diagnostics.functions = {
            hasToggleFunction: typeof toggleSettings !== 'undefined',
            hasRenderFunction: typeof renderBookmarks !== 'undefined',
            hasFilterFunction: typeof filterBookmarks !== 'undefined'
        };

        return diagnostics;
    });
}

/**
 * 模拟书签数据注入（用于测试环境）
 */
function createMockBookmarks() {
    return [
        {
            id: '1',
            title: 'Google',
            url: 'https://www.google.com',
            parentId: '0'
        },
        {
            id: '2',
            title: 'GitHub',
            url: 'https://github.com',
            parentId: '0'
        },
        {
            id: '3',
            title: 'Folder Example',
            parentId: '0',
            children: [
                {
                    id: '4',
                    title: 'Sub Item 1',
                    url: 'https://example1.com',
                    parentId: '3'
                },
                {
                    id: '5',
                    title: 'Sub Item 2',
                    url: 'https://example2.com',
                    parentId: '3'
                }
            ]
        }
    ];
}

module.exports = {
    createExtensionContext,
    waitForElement,
    waitForPageLoad,
    checkForJSErrors,
    getPageDiagnostics,
    createMockBookmarks
}; 
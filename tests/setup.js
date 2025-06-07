const fs = require('fs');
const path = require('path');

// 创建截图目录
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// 设置测试超时
jest.setTimeout(30000);

// 全局变量
global.testTimeout = 10000;

// 测试环境信息
console.log('🧪 Puppeteer Chrome Extension Test Environment');
console.log(`📁 Screenshots: ${screenshotsDir}`);
console.log(`⏱️  Test Timeout: 30000ms`); 
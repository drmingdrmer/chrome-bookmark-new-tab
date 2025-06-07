module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 30000, // 30秒超时，给Chrome扩展加载充足时间
    verbose: true,
    maxWorkers: 1, // 强制串行运行，避免Chrome实例冲突
    collectCoverageFrom: [
        '*.js',
        '!node_modules/**',
        '!tests/**',
        '!jest.config.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleFileExtensions: ['js', 'json'],
    transform: {},
    globals: {
        // 可以在这里定义全局变量
    }
}; 
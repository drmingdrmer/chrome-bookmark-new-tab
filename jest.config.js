// 两套测试相互独立：
//   unit - 纯逻辑，直接跑 TypeScript 源码，可并行、秒级完成
//   e2e  - Puppeteer 驱动真实 Chrome，必须串行，耗时较长
module.exports = {
    projects: [
        {
            displayName: 'unit',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
            moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
            transform: {
                '^.+\\.tsx?$': ['ts-jest', {
                    tsconfig: {
                        module: 'commonjs',
                        isolatedModules: false,
                    },
                }],
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/src/$1',
            },
        },
        {
            displayName: 'e2e',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/*.test.js'],
            testTimeout: 30000, // 30秒超时，给Chrome扩展加载充足时间
            maxWorkers: 1, // 强制串行运行，避免Chrome实例冲突
            setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
            moduleFileExtensions: ['js', 'json'],
            transform: {},
        },
    ],
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
    ],
};

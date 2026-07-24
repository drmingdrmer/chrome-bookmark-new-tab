import { extractJsonArray, responseTokenBudget } from '@/services/aiService';

// 真实响应片段：模型把结果包在 markdown 代码块里
const FENCED_RESPONSE = '```json\n[\n  {\n    "index": 1,\n    "score": 8,\n    "dimension": "learn",\n    "reason": "雅思阅读模拟真题。"\n  }\n]\n```';

// 真实响应片段：finish_reason 为 length，数组在第 4 个对象中间被切断
const TRUNCATED_RESPONSE = '[\n  {\n    "index": 1,\n    "score": 8,\n    "dimension": "learn",\n    "reason": "分布式系统核心理论。"\n  },\n  {\n    "index": 4';

describe('responseTokenBudget', () => {
    // 之前按正文长度估算，6 个书签只给 720，推理模型光思考就用掉 370-620，
    // 正文被挤掉导致 JSON 截断
    it('leaves room for reasoning tokens on top of the answer', () => {
        expect(responseTokenBudget(6)).toBeGreaterThan(720);
    });

    it('grows with the batch size', () => {
        expect(responseTokenBudget(1)).toBe(3100);
        expect(responseTokenBudget(6)).toBe(6100);
    });

    // 实测 6 个书签真实消耗约 700-1120 tokens
    it('keeps at least a fivefold margin over measured usage', () => {
        expect(responseTokenBudget(6)).toBeGreaterThanOrEqual(1120 * 5);
    });

    it('stops at the cap so the request is not rejected outright', () => {
        expect(responseTokenBudget(10)).toBe(8000);
        expect(responseTokenBudget(100)).toBe(8000);
    });
});

describe('extractJsonArray', () => {
    it('returns a bare array unchanged', () => {
        expect(extractJsonArray('[{"index":1}]')).toBe('[{"index":1}]');
    });

    it('unwraps a markdown code fence', () => {
        const extracted = extractJsonArray(FENCED_RESPONSE);

        expect(extracted.startsWith('[')).toBe(true);
        expect(extracted.endsWith(']')).toBe(true);
        expect(JSON.parse(extracted)).toEqual([
            { index: 1, score: 8, dimension: 'learn', reason: '雅思阅读模拟真题。' },
        ]);
    });

    it('ignores prose surrounding the array', () => {
        expect(extractJsonArray('好的，结果如下：\n[{"index":1}]\n希望有帮助。')).toBe('[{"index":1}]');
    });

    it('rejects a truncated array rather than returning a fragment', () => {
        expect(() => extractJsonArray(TRUNCATED_RESPONSE)).toThrow('未找到有效的JSON数组响应');
    });

    it('rejects a response with no array at all', () => {
        expect(() => extractJsonArray('抱歉，我无法完成该请求。')).toThrow('未找到有效的JSON数组响应');
    });
});

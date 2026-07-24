import { BookmarkAnalysis, BookmarkRecommendation, BookmarkDimension, Bookmark } from '../types/bookmark';
import { chunkArray } from '../utils/bookmark-helpers';
import { getAIConfig, migrateAIConfigToLocal, setAIConfig } from '../utils/chrome-api';

// AI API 配置
interface APIConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
}

// 有效的维度
const VALID_DIMENSIONS: BookmarkDimension[] = ['work', 'learn', 'fun', 'tool', 'other'];

// 每次请求分析的书签数量，过大会让响应超出 token 上限而被截断
const BATCH_SIZE = 10;

// 推理模型会先输出一段思考内容，这部分同样计入 completion_tokens，
// 且长度无法预估：实测同样 6 个书签，思考量在 370-620 tokens 之间波动。
//
// 实测 6 个书签一批的真实消耗约 700-1120 tokens（思考 + 正文），
// 即每个书签的边际成本约 150-190。下面按每个书签 600、固定开销 2500
// 计算，留出 5 倍以上余量吸收思考量的波动。
// max_tokens 只是上限，没用满不会计费，余量给大不会带来额外成本。
const RESPONSE_TOKENS_BASE = 2500;
const RESPONSE_TOKENS_PER_BOOKMARK = 600;

// 服务端对单次输出普遍有 8192 的硬上限，超过会被直接拒绝，
// 因此上限压在其下方。若接口允许更大输出，这里可以再调高。
const RESPONSE_TOKENS_CAP = 8000;

export function responseTokenBudget(itemCount: number): number {
    return Math.min(
        RESPONSE_TOKENS_CAP,
        RESPONSE_TOKENS_BASE + itemCount * RESPONSE_TOKENS_PER_BOOKMARK
    );
}

// 响应因为达到 token 上限而被截断，与"模型没按格式回复"是不同的失败
class TruncatedResponseError extends Error {
    constructor(maxTokens: number) {
        super(`响应在 ${maxTokens} tokens 处被截断`);
        this.name = 'TruncatedResponseError';
    }
}

/**
 * 从响应中取出 JSON 数组
 *
 * 模型经常把结果包在 markdown 代码块里，也可能在数组前后附带说明文字。
 */
export function extractJsonArray(response: string): string {
    const start = response.indexOf('[');
    const end = response.lastIndexOf(']');

    if (start === -1 || end <= start) {
        throw new Error('未找到有效的JSON数组响应');
    }

    return response.slice(start, end + 1);
}

export class AIService {
    private config: Partial<APIConfig> = {};
    private listeners = new Set<() => void>();
    private loadPromise: Promise<Partial<APIConfig>> | null = null;

    // 订阅配置变化，让所有使用方共享同一份配置状态
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    // 加载配置：并发调用共享同一次存储读取
    async loadConfig(): Promise<Partial<APIConfig>> {
        if (!this.loadPromise) {
            this.loadPromise = this.readConfig();
        }
        return this.loadPromise;
    }

    // 保存配置并刷新，使所有订阅者立即看到新配置
    async saveConfig(config: APIConfig): Promise<Partial<APIConfig>> {
        await setAIConfig(config);
        this.loadPromise = null;
        return this.loadConfig();
    }

    // 验证配置是否有效
    isConfigValid = (): boolean => {
        return !!(this.config.apiKey && this.config.apiUrl && this.config.model);
    };

    private async readConfig(): Promise<Partial<APIConfig>> {
        try {
            this.config = await getAIConfig();
            await migrateAIConfigToLocal();

            console.log('🔧 AI配置加载', 'API配置已加载');
            this.listeners.forEach(listener => listener());
            return this.config;
        } catch (error) {
            console.error('AI配置加载失败:', error);
            throw error;
        }
    }



    // 批量分析书签，按 BATCH_SIZE 分批请求
    async analyzeBatch(
        bookmarks: Bookmark[],
        onProgress?: (step: string) => void
    ): Promise<BookmarkAnalysis[]> {
        if (!this.isConfigValid()) {
            throw new Error('AI配置无效，请先配置API设置');
        }

        const batches = chunkArray(bookmarks, BATCH_SIZE);
        const results: BookmarkAnalysis[] = [];

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];

            try {
                onProgress?.(`🚀 正在分析第 ${batchIndex + 1}/${batches.length} 批（${batch.length} 个书签）...`);
                results.push(...await this.analyzeChunk(batch, onProgress));
            } catch (error) {
                onProgress?.('❌ 分析失败');
                throw new Error(`批次 ${batchIndex + 1} 分析失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        onProgress?.('✅ 分析完成');
        return results;
    }

    /**
     * 分析一批书签，被截断时二分后重试
     *
     * 推理模型的思考长度无法预估，偶尔会长到挤掉正文。拆小后每次请求的
     * 书签更少、思考更短，通常一次就能拿到完整结果。
     */
    private async analyzeChunk(
        bookmarks: Bookmark[],
        onProgress?: (step: string) => void
    ): Promise<BookmarkAnalysis[]> {
        try {
            const prompt = this.buildBatchAnalysisPrompt(bookmarks);
            const response = await this.callAPI(prompt, responseTokenBudget(bookmarks.length));

            return this.parseBatchAnalysisResponse(response, bookmarks);
        } catch (error) {
            // 单个书签仍被截断说明不是批量大小的问题，继续拆下去也没有意义
            if (!(error instanceof TruncatedResponseError) || bookmarks.length < 2) {
                throw error;
            }

            const half = Math.ceil(bookmarks.length / 2);
            onProgress?.(`⚠️ 响应被截断，拆成 ${half} 个一组重试...`);

            return [
                ...await this.analyzeChunk(bookmarks.slice(0, half), onProgress),
                ...await this.analyzeChunk(bookmarks.slice(half), onProgress)
            ];
        }
    }

    // 获取维度推荐
    async getTopRecommendationsForDimension(
        dimension: BookmarkDimension,
        bookmarks: BookmarkAnalysis[],
        topCount = 5
    ): Promise<BookmarkRecommendation[]> {
        if (!this.isConfigValid()) {
            throw new Error('AI配置无效，请先配置API设置');
        }

        // 取前topCount个最高分的书签
        const topBookmarks = bookmarks
            .sort((a, b) => b.score - a.score)
            .slice(0, topCount);

        const prompt = this.buildRecommendationPrompt(dimension, topBookmarks);

        try {
            const response = await this.callAPI(prompt, responseTokenBudget(topBookmarks.length));
            return this.parseRecommendationResponse(response, topBookmarks, dimension);
        } catch (error) {
            throw new Error(`${dimension}维度推荐失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }



    // 构建批量分析提示词
    private buildBatchAnalysisPrompt(bookmarks: Bookmark[]): string {
        const bookmarkList = bookmarks.map((bookmark, index) =>
            `${index + 1}. 标题：${bookmark.title}\n   URL：${bookmark.url}`
        ).join('\n\n');

        return `请批量分析以下书签的重要性：

${bookmarkList}

请按照以下JSON数组格式返回分析结果：
[
  {
    "index": 1,
    "score": <1-10的重要性评分>,
    "dimension": "<${VALID_DIMENSIONS.join('|')}>",
    "reason": "<50字以内的分析理由>"
  },
  ...
]

评分标准：
- 高分项目(7-10分)：能够提升读者知识、技能或带来价值体验的内容
  * 学习类：教程、深度文章、技术分享等能直接提升能力的内容
  * 娱乐类：高质量的视频、游戏、文章等能带来良好体验的内容
  * 工作类：能解决当前问题或提升工作效率的实用内容
- 中等分数(4-6分)：有一定价值但不急需消费的内容
- 低分项目(1-3分)：工具类网站和纯信息类内容
  * 在线工具、API文档、参考手册等按需使用的资源
  * 这类内容虽然有用，但不需要主动阅读学习

维度说明：
- work: 工作相关（技术文档、工具、项目）
- learn: 学习相关（教程、课程、知识）
- fun: 娱乐相关（游戏、视频、社交）
- tool: 工具相关（在线工具、服务）
- other: 其他未分类内容

请直接输出JSON数组本身，不要包裹markdown代码块，也不要附加说明文字。`;
    }

    // 构建推荐提示词
    private buildRecommendationPrompt(dimension: BookmarkDimension, bookmarks: BookmarkAnalysis[]): string {
        const bookmarkList = bookmarks.map((bookmark, index) =>
            `${index + 1}. [${bookmark.score}分] ${bookmark.bookmark.title}\n   ${bookmark.bookmark.url}\n   ${bookmark.reason || ''}`
        ).join('\n\n');

        const dimensionNames = {
            work: '工作',
            learn: '学习',
            fun: '娱乐',
            tool: '工具',
            other: '其他'
        };

        return `从以下${dimensionNames[dimension]}类别的高分书签中，推荐最值得立刻阅读的内容：

${bookmarkList}

请按照以下JSON数组格式返回推荐结果（保持原始顺序）：
[
  {
    "index": <原始序号>,
    "priority": <推荐优先级1-5，5最高>,
    "reason": "<为什么推荐立刻阅读，30字以内>"
  },
  ...
]

推荐原则：
- 优先推荐实用性强、能立即应用的内容
- 考虑时效性，优先推荐可能过期的内容
- 优先推荐学习成本低、见效快的内容
- 综合考虑重要性评分和当前实用价值`;
    }

    // 调用API
    private async callAPI(prompt: string, maxTokens: number): Promise<string> {
        if (!this.config.apiUrl || !this.config.apiKey || !this.config.model) {
            throw new Error('API配置不完整');
        }

        const requestBody = {
            model: this.config.model,
            messages: [{
                role: "user" as const,
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: maxTokens
        };

        const response = await fetch(this.config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败 (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        // 先判断截断：被截断的正文往往看起来只是格式不对，报"没有JSON"会指错方向
        if (choice?.finish_reason === 'length') {
            throw new TruncatedResponseError(maxTokens);
        }

        const content = choice?.message?.content;

        if (!content) {
            throw new Error('API返回数据格式错误，未找到内容');
        }

        return content.trim();
    }



    // 解析批量分析响应
    private parseBatchAnalysisResponse(response: string, bookmarks: Bookmark[]): BookmarkAnalysis[] {
        const results = JSON.parse(extractJsonArray(response));

        return results.map((result: any, index: number) => {
            const bookmarkIndex = (result.index || (index + 1)) - 1;
            const bookmark = bookmarks[bookmarkIndex] || bookmarks[index];

            if (!bookmark) {
                throw new Error(`无法找到索引 ${bookmarkIndex} 对应的书签`);
            }

            const score = Number(result.score);
            if (!Number.isFinite(score) || score < 1 || score > 10) {
                throw new Error(`书签「${bookmark.title}」的评分无效: ${result.score}`);
            }

            if (!VALID_DIMENSIONS.includes(result.dimension)) {
                throw new Error(`书签「${bookmark.title}」的维度无效: ${result.dimension}`);
            }

            return {
                bookmark: bookmark,
                score: score,
                dimension: result.dimension,
                reason: result.reason || '无分析理由'
            };
        });
    }

    // 解析推荐响应
    private parseRecommendationResponse(
        response: string,
        bookmarks: BookmarkAnalysis[],
        dimension: BookmarkDimension
    ): BookmarkRecommendation[] {
        const results = JSON.parse(extractJsonArray(response));

        return results.map((result: any) => {
            const bookmarkIndex = (result.index || 1) - 1;
            const bookmarkAnalysis = bookmarks[bookmarkIndex];

            if (!bookmarkAnalysis) {
                throw new Error(`无法找到索引 ${result.index} 对应的书签`);
            }

            return {
                bookmark: bookmarkAnalysis.bookmark,
                score: bookmarkAnalysis.score,
                dimension: dimension,
                reason: bookmarkAnalysis.reason,
                priority: Number(result.priority) || 1,
                recommendReason: result.reason || '推荐理由未知'
            };
        });
    }

    // 测试API连接
    async testConnection(): Promise<{ success: boolean; response: string; requestInfo?: any; responseInfo?: any }> {
        if (!this.isConfigValid()) {
            throw new Error('AI配置无效，请先配置API设置');
        }

        try {
            const testPrompt = "请回复'连接测试成功'";

            const requestBody = {
                model: this.config.model,
                messages: [{
                    role: "user" as const,
                    content: testPrompt
                }],
                temperature: 0.7,
                max_tokens: 100
            };

            console.log('🚀 发送请求:', {
                url: this.config.apiUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey?.substring(0, 10)}...`
                },
                body: requestBody
            });

            const startTime = Date.now();
            const response = await fetch(this.config.apiUrl!, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API响应错误:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`API请求失败 (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('API返回数据格式错误，未找到内容');
            }

            console.log('✅ API测试成功', {
                responseTime: `${responseTime}ms`,
                response: content.substring(0, 100)
            });

            return {
                success: true,
                response: content.trim(),
                requestInfo: {
                    url: this.config.apiUrl,
                    model: this.config.model,
                    prompt: testPrompt,
                    timestamp: new Date().toISOString()
                },
                responseInfo: {
                    status: response.status,
                    responseTime: `${responseTime}ms`,
                    contentLength: content.length,
                    usage: data.usage
                }
            };
        } catch (error) {
            console.error('❌ API连接测试失败:', error);
            throw error;
        }
    }
}

// 创建全局实例
export const aiService = new AIService(); 
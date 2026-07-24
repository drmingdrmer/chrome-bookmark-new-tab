import { BookmarkAnalysis, BookmarkRecommendation, BookmarkDimension, Bookmark } from '../types/bookmark';

// AI API 配置
interface APIConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
}

// 有效的维度
const VALID_DIMENSIONS: BookmarkDimension[] = ['work', 'learn', 'fun', 'tool', 'other'];

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
        await chrome.storage.sync.set(config);
        this.loadPromise = null;
        return this.loadConfig();
    }

    // 验证配置是否有效
    isConfigValid = (): boolean => {
        return !!(this.config.apiKey && this.config.apiUrl && this.config.model);
    };

    private async readConfig(): Promise<Partial<APIConfig>> {
        try {
            const result = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'model']);
            this.config = result;

            console.log('🔧 AI配置加载', 'API配置已加载');
            this.listeners.forEach(listener => listener());
            return this.config;
        } catch (error) {
            console.error('AI配置加载失败:', error);
            throw error;
        }
    }



    // 批量分析书签
    async analyzeBatch(
        bookmarks: Bookmark[],
        batchIndex = 1,
        onProgress?: (step: string) => void
    ): Promise<BookmarkAnalysis[]> {
        if (!this.isConfigValid()) {
            throw new Error('AI配置无效，请先配置API设置');
        }

        try {
            onProgress?.('🔍 正在准备分析请求...');
            const prompt = this.buildBatchAnalysisPrompt(bookmarks);

            onProgress?.('🚀 正在发送请求到AI服务，请等待响应...');
            const response = await this.callAPI(prompt);

            onProgress?.('⚙️ 正在解析AI分析结果...');
            const results = this.parseBatchAnalysisResponse(response, bookmarks);

            onProgress?.('✅ 分析完成');
            return results;
        } catch (error) {
            onProgress?.('❌ 分析失败');
            throw new Error(`批次 ${batchIndex} 分析失败: ${error instanceof Error ? error.message : String(error)}`);
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
            const response = await this.callAPI(prompt);
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
- other: 其他未分类内容`;
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
    private async callAPI(prompt: string): Promise<string> {
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
            max_tokens: 2000
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
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('API返回数据格式错误，未找到内容');
        }

        return content.trim();
    }



    // 解析批量分析响应
    private parseBatchAnalysisResponse(response: string, bookmarks: Bookmark[]): BookmarkAnalysis[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('未找到有效的JSON数组响应');
            }

            const results = JSON.parse(jsonMatch[0]);

            return results.map((result: any, index: number) => {
                const bookmarkIndex = (result.index || (index + 1)) - 1;
                const bookmark = bookmarks[bookmarkIndex] || bookmarks[index];

                if (!bookmark) {
                    throw new Error(`无法找到索引 ${bookmarkIndex} 对应的书签`);
                }

                return {
                    bookmark: bookmark,
                    score: Number(result.score) || 1,
                    dimension: result.dimension || 'other',
                    reason: result.reason || '无分析理由'
                };
            });
        } catch (error) {
            // 解析失败时返回默认结果
            return bookmarks.map(bookmark => ({
                bookmark: bookmark,
                score: 1,
                dimension: 'other' as BookmarkDimension,
                reason: '批量解析失败，使用默认值'
            }));
        }
    }

    // 解析推荐响应
    private parseRecommendationResponse(
        response: string,
        bookmarks: BookmarkAnalysis[],
        dimension: BookmarkDimension
    ): BookmarkRecommendation[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('未找到有效的JSON数组响应');
            }

            const results = JSON.parse(jsonMatch[0]);

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
        } catch (error) {
            // 解析失败时按分数排序返回
            return bookmarks.map((bookmarkAnalysis, index) => ({
                bookmark: bookmarkAnalysis.bookmark,
                score: bookmarkAnalysis.score,
                dimension: dimension,
                reason: bookmarkAnalysis.reason,
                priority: 5 - index,
                recommendReason: '基于评分推荐'
            }));
        }
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
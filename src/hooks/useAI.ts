import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { aiService } from '../services/aiService';
import { BookmarkAnalysis, BookmarkRecommendation, BookmarkDimension, Bookmark } from '../types/bookmark';

interface AIState {
    isLoading: boolean;
    error: string | null;
    recommendations: BookmarkRecommendation[];
}

interface AIConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
}

export function useAI() {
    const [state, setState] = useState<AIState>({
        isLoading: false,
        error: null,
        recommendations: []
    });

    // 配置是共享的单例状态，任何一处保存后所有使用方立即生效
    const isConfigValid = useSyncExternalStore(aiService.subscribe, aiService.isConfigValid);

    // 加载配置
    const loadConfig = useCallback(async () => {
        try {
            await aiService.loadConfig();
            setState(prev => ({ ...prev, error: null }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : '配置加载失败'
            }));
        }
    }, []);

    // 保存配置
    const saveConfig = useCallback(async (config: AIConfig) => {
        try {
            await aiService.saveConfig(config);
            setState(prev => ({ ...prev, error: null }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : '配置保存失败'
            }));
        }
    }, []);

    // 测试连接
    const testConnection = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await aiService.testConnection();
            setState(prev => ({ ...prev, isLoading: false }));
            return result;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : '连接测试失败'
            }));
            throw error;
        }
    }, []);



    // 批量分析书签，交由服务层按批请求；调用方（各栏目评分）各自管理进度与状态
    const analyzeBatch = useCallback((
        bookmarks: Bookmark[],
        onProgress?: (step: string) => void
    ) => aiService.analyzeBatch(bookmarks, onProgress), []);

    // 获取维度推荐
    const getRecommendations = useCallback(async (
        dimension: BookmarkDimension,
        bookmarks: BookmarkAnalysis[],
        topCount = 5
    ) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const recommendations = await aiService.getTopRecommendationsForDimension(
                dimension,
                bookmarks,
                topCount
            );
            setState(prev => ({
                ...prev,
                isLoading: false,
                recommendations: [
                    ...prev.recommendations.filter(r => r.dimension !== dimension),
                    ...recommendations
                ]
            }));
            return recommendations;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : '推荐获取失败'
            }));
            throw error;
        }
    }, []);

    // 清除错误
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // 初始化时加载配置
    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return {
        ...state,
        isConfigValid,
        loadConfig,
        saveConfig,
        testConnection,
        analyzeBatch,
        getRecommendations,
        clearError
    };
} 
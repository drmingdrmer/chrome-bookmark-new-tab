import { useState, useEffect, useCallback } from 'react';
import { aiService } from '../services/aiService';
import { BookmarkAnalysis, BookmarkRecommendation, BookmarkDimension, Bookmark } from '../types/bookmark';

interface AIState {
    isConfigValid: boolean;
    isLoading: boolean;
    error: string | null;
    analyses: BookmarkAnalysis[];
    recommendations: BookmarkRecommendation[];
}

interface AIConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
}

export function useAI() {
    const [state, setState] = useState<AIState>({
        isConfigValid: false,
        isLoading: false,
        error: null,
        analyses: [],
        recommendations: []
    });

    // 加载配置
    const loadConfig = useCallback(async () => {
        try {
            await aiService.loadConfig();
            setState(prev => ({
                ...prev,
                isConfigValid: aiService.isConfigValid(),
                error: null
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : '配置加载失败',
                isConfigValid: false
            }));
        }
    }, []);

    // 保存配置
    const saveConfig = useCallback(async (config: AIConfig) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.sync.set(config);
                await aiService.loadConfig();
                setState(prev => ({
                    ...prev,
                    isConfigValid: aiService.isConfigValid(),
                    error: null
                }));
            }
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



    // 批量分析书签
    const analyzeBatch = useCallback(async (
        bookmarks: Bookmark[],
        onProgress?: (step: string) => void
    ) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const analyses = await aiService.analyzeBatch(bookmarks, 1, onProgress);
            setState(prev => ({
                ...prev,
                isLoading: false,
                analyses: [
                    ...prev.analyses.filter(a => !bookmarks.some(b => b.id === a.bookmark.id)),
                    ...analyses
                ]
            }));
            return analyses;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : '批量分析失败'
            }));
            throw error;
        }
    }, []);

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

    // 获取分析结果
    const getAnalysisForBookmark = useCallback((bookmarkId: string) => {
        return state.analyses.find(a => a.bookmark.id === bookmarkId);
    }, [state.analyses]);

    // 获取维度推荐
    const getRecommendationsForDimension = useCallback((dimension: BookmarkDimension) => {
        return state.recommendations.filter(r => r.dimension === dimension);
    }, [state.recommendations]);

    // 初始化时加载配置
    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return {
        ...state,
        loadConfig,
        saveConfig,
        testConnection,
        analyzeBatch,
        getRecommendations,
        clearError,
        getAnalysisForBookmark,
        getRecommendationsForDimension
    };
} 
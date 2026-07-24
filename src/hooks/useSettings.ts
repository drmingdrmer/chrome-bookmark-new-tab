import { useState, useEffect, useCallback } from 'react';
import { Config } from '@/types/bookmark';
import { getStorageData, setStorageData } from '@/utils/chrome-api';

export const DEFAULT_CONFIG: Config = {
    maxEntriesPerColumn: 20,
    showDebugInfo: false,
};

export const MIN_ENTRIES_PER_COLUMN = 5;
export const MAX_ENTRIES_PER_COLUMN = 100;

export function useSettings(storageData?: any) {
    const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load settings from storage data or fallback to individual loading
    const loadSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            let finalConfig: Config;

            if (storageData) {
                // Use pre-loaded storage data
                finalConfig = {
                    ...DEFAULT_CONFIG,
                    ...storageData.config,
                    aiApiUrl: storageData.aiConfig.apiUrl || '',
                    aiApiKey: storageData.aiConfig.apiKey || '',
                    aiModel: storageData.aiConfig.model || ''
                };
            } else {
                // Fallback to individual loading
                const savedConfig = await getStorageData<Config>('config');
                let aiConfig = {};
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    try {
                        const aiResult = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'model']);
                        aiConfig = {
                            aiApiUrl: aiResult.apiUrl || '',
                            aiApiKey: aiResult.apiKey || '',
                            aiModel: aiResult.model || ''
                        };
                    } catch (aiError) {

                    }
                }

                finalConfig = {
                    ...DEFAULT_CONFIG,
                    ...savedConfig,
                    ...aiConfig
                };
            }

            setConfig(finalConfig);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    }, [storageData]);

    // Save settings to storage
    const saveSettings = useCallback(async (newConfig: Partial<Config>) => {
        try {


            // 先读取最新的配置，而不是依赖闭包中的config
            const currentConfig = await getStorageData<Config>('config') || DEFAULT_CONFIG;


            const updatedConfig = { ...currentConfig, ...newConfig };


            await setStorageData('config', updatedConfig);


            setConfig(updatedConfig);

        } catch (err) {

            setError(err instanceof Error ? err.message : 'Failed to save settings');
        }
    }, []); // 移除config依赖，避免闭包问题

    // Toggle settings panel
    const toggleSettings = useCallback(() => {
        setIsSettingsOpen(prev => !prev);
    }, []);

    // Close settings panel
    const closeSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    // Update max entries per column
    const updateMaxEntries = useCallback(async (maxEntries: number) => {
        if (maxEntries < MIN_ENTRIES_PER_COLUMN || maxEntries > MAX_ENTRIES_PER_COLUMN) {
            throw new Error(
                `每列条目数需在 ${MIN_ENTRIES_PER_COLUMN}-${MAX_ENTRIES_PER_COLUMN} 之间，当前为 ${maxEntries}`
            );
        }

        await saveSettings({ maxEntriesPerColumn: maxEntries });
    }, [saveSettings]);

    // Update show debug info
    const updateShowDebugInfo = useCallback(async (showDebugInfo: boolean) => {
        await saveSettings({ showDebugInfo });
    }, [saveSettings]);

    // Initialize settings on mount
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    return {
        config,
        isSettingsOpen,
        isLoading,
        error,
        toggleSettings,
        closeSettings,
        updateMaxEntries,
        updateShowDebugInfo,
        saveSettings,
    };
} 
import { useState, useEffect, useCallback } from 'react';
import { Config } from '@/types/bookmark';
import { getStorageData, setStorageData } from '@/utils/chrome-api';

const DEFAULT_CONFIG: Config = {
    maxEntriesPerColumn: 20,
};

export function useSettings() {
    const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load settings from storage
    const loadSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const savedConfig = await getStorageData<Config>('config');
            if (savedConfig) {
                setConfig({ ...DEFAULT_CONFIG, ...savedConfig });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save settings to storage
    const saveSettings = useCallback(async (newConfig: Partial<Config>) => {
        try {
            const updatedConfig = { ...config, ...newConfig };
            await setStorageData('config', updatedConfig);
            setConfig(updatedConfig);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        }
    }, [config]);

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
        if (maxEntries >= 5 && maxEntries <= 100) {
            await saveSettings({ maxEntriesPerColumn: maxEntries });
        }
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
        saveSettings,
    };
} 
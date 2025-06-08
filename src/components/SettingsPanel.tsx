import React, { useState } from 'react';
import { Settings, X, Save, Brain, TestTube } from 'lucide-react';
import { Config } from '@/types/bookmark';
import { useAI } from '@/hooks/useAI';

interface SettingsPanelProps {
    isOpen: boolean;
    config: Config;
    onClose: () => void;
    onUpdateMaxEntries: (maxEntries: number) => void;
    onUpdateShowDebugInfo: (showDebugInfo: boolean) => void;
}

export function SettingsPanel({
    isOpen,
    config,
    onClose,
    onUpdateMaxEntries,
    onUpdateShowDebugInfo
}: SettingsPanelProps) {
    const [maxEntries, setMaxEntries] = useState(config.maxEntriesPerColumn);
    const [showDebugInfo, setShowDebugInfo] = useState(config.showDebugInfo);

    // AI相关状态
    const [aiApiUrl, setAiApiUrl] = useState(config.aiApiUrl || '');
    const [aiApiKey, setAiApiKey] = useState(config.aiApiKey || '');
    const [aiModel, setAiModel] = useState(config.aiModel || '');
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);

    const { saveConfig, testConnection, isConfigValid, error, clearError } = useAI();

    const handleSave = async () => {
        // 保存基本设置
        onUpdateMaxEntries(maxEntries);
        onUpdateShowDebugInfo(showDebugInfo);

        // 保存AI配置
        if (aiApiUrl || aiApiKey || aiModel) {
            await saveConfig({
                apiUrl: aiApiUrl,
                apiKey: aiApiKey,
                model: aiModel
            });
        }

        onClose();
    };

    const handleReset = () => {
        setMaxEntries(20);
        setShowDebugInfo(false);
        setAiApiUrl('');
        setAiApiKey('');
        setAiModel('');
        setTestResult(null);
        clearError();
    };

    const handleTestConnection = async () => {
        if (!aiApiUrl || !aiApiKey || !aiModel) {
            setTestResult('请先填写完整的AI配置');
            return;
        }

        setIsTestingConnection(true);
        setTestResult(null);
        clearError();

        try {
            // 先保存配置
            await saveConfig({
                apiUrl: aiApiUrl,
                apiKey: aiApiKey,
                model: aiModel
            });

            // 然后测试连接
            const result = await testConnection();
            setTestResult('✅ 连接成功！');
        } catch (error) {
            setTestResult(`❌ 连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsTestingConnection(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div id="settings-panel" className="fixed top-20 right-6 w-80 max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl z-50 animate-slide-down">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                        <Settings className="w-5 h-5 text-blue-300" />
                        <h3 className="text-lg font-semibold text-white">Settings</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-1 hover:bg-white/10 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Max Entries Setting */}
                    <div>
                        <label
                            htmlFor="max-entries"
                            className="block text-sm font-medium text-white mb-3"
                        >
                            Maximum entries per column
                        </label>
                        <div className="space-y-3">
                            <input
                                id="max-entries"
                                type="number"
                                min="5"
                                max="100"
                                value={maxEntries}
                                onChange={(e) => setMaxEntries(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                            <div className="flex items-center space-x-2">
                                <input
                                    type="range"
                                    min="5"
                                    max="100"
                                    value={maxEntries}
                                    onChange={(e) => setMaxEntries(Number(e.target.value))}
                                    className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm text-gray-400 w-8 text-right">
                                    {maxEntries}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">
                                Controls how many bookmarks appear in each column before splitting into multiple columns.
                            </p>
                        </div>
                    </div>

                    {/* Show Debug Info Setting */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-3">
                            Debug Information
                        </label>
                        <div className="flex items-center space-x-3">
                            <input
                                id="show-debug-info"
                                type="checkbox"
                                checked={showDebugInfo}
                                onChange={(e) => setShowDebugInfo(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <label
                                htmlFor="show-debug-info"
                                className="text-sm text-gray-300 cursor-pointer"
                            >
                                Show bookmark ID and Index
                            </label>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Display debugging information (ID and Index) below each bookmark title.
                        </p>
                    </div>

                    {/* AI Configuration */}
                    <div className="border-t border-white/10 pt-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <Brain className="w-5 h-5 text-purple-300" />
                            <h4 className="text-sm font-medium text-white">AI Configuration</h4>
                        </div>

                        <div className="space-y-4">
                            {/* API URL */}
                            <div>
                                <label htmlFor="ai-api-url" className="block text-sm text-gray-300 mb-2">
                                    API URL
                                </label>
                                <input
                                    id="ai-api-url"
                                    type="url"
                                    value={aiApiUrl}
                                    onChange={(e) => setAiApiUrl(e.target.value)}
                                    placeholder="https://api.openai.com/v1/chat/completions"
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                                />
                            </div>

                            {/* API Key */}
                            <div>
                                <label htmlFor="ai-api-key" className="block text-sm text-gray-300 mb-2">
                                    API Key
                                </label>
                                <input
                                    id="ai-api-key"
                                    type="password"
                                    value={aiApiKey}
                                    onChange={(e) => setAiApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                                />
                            </div>

                            {/* Model */}
                            <div>
                                <label htmlFor="ai-model" className="block text-sm text-gray-300 mb-2">
                                    Model
                                </label>
                                <input
                                    id="ai-model"
                                    type="text"
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    placeholder="gpt-3.5-turbo"
                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                                />
                            </div>

                            {/* Test Connection */}
                            <div>
                                <button
                                    onClick={handleTestConnection}
                                    disabled={isTestingConnection || !aiApiUrl || !aiApiKey || !aiModel}
                                    className="flex items-center space-x-2 px-3 py-2 text-sm text-purple-300 border border-purple-300/50 hover:bg-purple-300/10 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <TestTube className="w-4 h-4" />
                                    <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
                                </button>

                                {/* Test Result */}
                                {testResult && (
                                    <p className={`text-sm mt-2 ${testResult.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                                        {testResult}
                                    </p>
                                )}

                                {/* Error Display */}
                                {error && (
                                    <p className="text-sm text-red-400 mt-2">
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4 border-t border-white/10">
                        <button
                            onClick={handleReset}
                            className="flex-1 px-4 py-2 text-sm text-gray-300 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
} 
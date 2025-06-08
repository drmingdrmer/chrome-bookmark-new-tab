import React, { useState, useEffect } from 'react';
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
    const [testDetails, setTestDetails] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { saveConfig, testConnection, isConfigValid, error, clearError } = useAI();

    // 当配置变化时更新状态
    useEffect(() => {
        setMaxEntries(config.maxEntriesPerColumn);
        setShowDebugInfo(config.showDebugInfo);
        setAiApiUrl(config.aiApiUrl || '');
        setAiApiKey(config.aiApiKey || '');
        setAiModel(config.aiModel || '');
    }, [config]);

    const handleSave = async () => {
        setIsSaving(true);
        setTestResult(null);
        clearError();

        try {
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

            setTestResult('✅ 设置保存成功！');

            // 延迟关闭面板，让用户看到成功提示
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (error) {
            setTestResult(`❌ 保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setMaxEntries(20);
        setShowDebugInfo(false);
        setAiApiUrl('');
        setAiApiKey('');
        setAiModel('');
        setTestResult(null);
        setTestDetails(null);
        clearError();
    };

    const handleTestConnection = async () => {
        if (!aiApiUrl || !aiApiKey || !aiModel) {
            setTestResult('请先填写完整的AI配置');
            setTestDetails(null);
            return;
        }

        setIsTestingConnection(true);
        setTestResult(null);
        setTestDetails(null);
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
            setTestDetails({
                request: result.requestInfo,
                response: result.responseInfo,
                content: result.response
            });
        } catch (error) {
            setTestResult(`❌ 连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
            setTestDetails(null);
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
            <div id="settings-panel" className="fixed top-20 right-6 w-[880px] max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl z-50 animate-slide-down">
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
                    <div className="flex items-center space-x-3">
                        <label
                            htmlFor="max-entries"
                            className="text-sm font-medium text-white whitespace-nowrap"
                        >
                            Maximum entries per column:
                        </label>
                        <input
                            id="max-entries"
                            type="number"
                            min="5"
                            max="100"
                            value={maxEntries}
                            onChange={(e) => setMaxEntries(Number(e.target.value))}
                            className="w-20 px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
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

                        <div className="space-y-3">
                            {/* API URL */}
                            <div className="flex items-center space-x-3">
                                <label htmlFor="ai-api-url" className="text-sm text-gray-300 whitespace-nowrap w-20">
                                    API URL:
                                </label>
                                <input
                                    id="ai-api-url"
                                    type="url"
                                    value={aiApiUrl}
                                    onChange={(e) => setAiApiUrl(e.target.value)}
                                    placeholder="https://api.openai.com/v1/chat/completions"
                                    className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                                />
                            </div>

                            {/* API Key */}
                            <div className="flex items-center space-x-3">
                                <label htmlFor="ai-api-key" className="text-sm text-gray-300 whitespace-nowrap w-20">
                                    API Key:
                                </label>
                                <input
                                    id="ai-api-key"
                                    type="password"
                                    value={aiApiKey}
                                    onChange={(e) => setAiApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                                />
                            </div>

                            {/* Model */}
                            <div className="flex items-center space-x-3">
                                <label htmlFor="ai-model" className="text-sm text-gray-300 whitespace-nowrap w-20">
                                    Model:
                                </label>
                                <input
                                    id="ai-model"
                                    type="text"
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    placeholder="gpt-3.5-turbo"
                                    className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
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
                                    <div className="mt-3">
                                        <p className={`text-sm ${testResult.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                                            {testResult}
                                        </p>

                                        {/* Test Details */}
                                        {testDetails && (
                                            <div className="mt-3 p-3 bg-black/30 rounded-lg text-xs space-y-2">
                                                {/* Request Info */}
                                                <div>
                                                    <p className="text-blue-300 font-medium mb-1">📤 请求信息:</p>
                                                    <div className="text-gray-300 space-y-1">
                                                        <p>• URL: {testDetails.request?.url}</p>
                                                        <p>• 模型: {testDetails.request?.model}</p>
                                                        <p>• 提示词: "{testDetails.request?.prompt}"</p>
                                                        <p>• 时间: {testDetails.request?.timestamp}</p>
                                                    </div>
                                                </div>

                                                {/* Response Info */}
                                                <div>
                                                    <p className="text-green-300 font-medium mb-1">📥 响应信息:</p>
                                                    <div className="text-gray-300 space-y-1">
                                                        <p>• 状态: {testDetails.response?.status}</p>
                                                        <p>• 响应时间: {testDetails.response?.responseTime}</p>
                                                        <p>• 内容长度: {testDetails.response?.contentLength} 字符</p>
                                                        {testDetails.response?.usage && (
                                                            <p>• Token使用: {JSON.stringify(testDetails.response.usage)}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Response Content */}
                                                <div>
                                                    <p className="text-purple-300 font-medium mb-1">💬 回复内容:</p>
                                                    <p className="text-gray-300 italic">"{testDetails.content}"</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                            disabled={isSaving}
                            className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
} 
import { motion } from 'framer-motion';
import { Server, Crown, Cube } from '../icons';
import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../components/StoreProvider';
import { showSuccess, showError } from '../utils/toast';
import { log, logError } from '../utils/log';
import DropdownMenu from '../components/DropdownMenu';

const DEFAULT_PROVIDER = {
    id: 'provider-default',
    name: '自定义服务商',
    auth: '',
    api_base_url: '',
    request_mode: 'responses',
    model_name: ''
};

const REQUEST_MODE_OPTIONS = [
    { id: 'responses', label: 'Responses' },
    { id: 'chat', label: 'Chat' }
];

const normalizeProviderApiInput = (value = '', ensureVersion = false) => {
    const trimmed = value.trim().replace(/\/+$/, '');
    if (!trimmed) {
        return { apiBaseUrl: '', requestMode: null };
    }

    const lower = trimmed.toLowerCase();
    if (lower.endsWith('/responses')) {
        return {
            apiBaseUrl: trimmed.slice(0, -'/responses'.length),
            requestMode: 'responses'
        };
    }

    if (lower.endsWith('/chat/completions')) {
        return {
            apiBaseUrl: trimmed.slice(0, -'/chat/completions'.length),
            requestMode: 'chat'
        };
    }

    if (!ensureVersion || lower.endsWith('/v1')) {
        return {
            apiBaseUrl: trimmed,
            requestMode: null
        };
    }

    return {
        apiBaseUrl: `${trimmed}/v1`,
        requestMode: null
    };
};

const resolveApiRequestUrl = (apiBaseUrl = '', requestMode = 'responses') => {
    const normalized = apiBaseUrl.trim().replace(/\/+$/, '');
    if (!normalized) {
        return '';
    }

    const base = normalized.toLowerCase().endsWith('/v1') ? normalized : `${normalized}/v1`;
    return `${base}/${requestMode === 'chat' ? 'chat/completions' : 'responses'}`;
};

const extractResponseText = (data) => {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) {
        return data.output_text.trim();
    }

    const outputText = data?.output?.find((item) => Array.isArray(item?.content))
        ?.content?.find((contentItem) => ['output_text', 'text'].includes(contentItem?.type))
        ?.text;

    if (typeof outputText === 'string' && outputText.trim()) {
        return outputText.trim();
    }

    if (typeof data?.choices?.[0]?.message?.content === 'string') {
        return data.choices[0].message.content.trim();
    }

    const chatArrayText = data?.choices?.[0]?.message?.content?.find?.(
        (item) => typeof item?.text === 'string'
    )?.text;

    if (typeof chatArrayText === 'string' && chatArrayText.trim()) {
        return chatArrayText.trim();
    }

    return '';
};

const createProviderId = () =>
    `provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const testOpenAIConnection = async (provider) => {
    try {
        const requestUrl = resolveApiRequestUrl(provider.api_base_url, provider.request_mode);
        const isResponses = provider.request_mode !== 'chat';
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.auth}`
        };

        const body = isResponses
            ? {
                model: provider.model_name,
                instructions: 'You are testing API connectivity. Reply with OK only.',
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: 'Reply with OK only.'
                            }
                        ]
                    }
                ],
                max_output_tokens: 16
            }
            : {
                model: provider.model_name,
                messages: [
                    {
                        role: provider.model_name.startsWith('gpt-5') ? 'developer' : 'system',
                        content: 'You are testing API connectivity. Reply with OK only.'
                    },
                    {
                        role: 'user',
                        content: 'Reply with OK only.'
                    }
                ],
                ...(provider.model_name.startsWith('gpt-5') || provider.model_name.startsWith('gpt-4.1')
                    ? { max_completion_tokens: 16, reasoning_effort: 'low' }
                    : { max_tokens: 16 })
            };

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (data?.error?.message) {
            throw new Error(data.error.message);
        }

        if (data?.error_msg) {
            throw new Error(data.error_msg);
        }

        const text = extractResponseText(data);
        if (!text) {
            throw new Error('响应格式不正确');
        }

        return true;
    } catch (error) {
        throw new Error(`API测试失败: ${error.message}`);
    }
};

const providerToLegacyModel = (provider) => ({
    auth: provider.auth,
    api_url: resolveApiRequestUrl(provider.api_base_url, provider.request_mode),
    model_name: provider.model_name
});

export default function Settings() {
    const { settings, updateSettings } = useStore();
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [customProviderModels, setCustomProviderModels] = useState([]);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const providers = useMemo(() => {
        if (settings?.custom_providers?.length) {
            return settings.custom_providers;
        }

        return [DEFAULT_PROVIDER];
    }, [settings?.custom_providers]);

    const selectedProviderId = settings?.selected_provider_id || providers[0]?.id || DEFAULT_PROVIDER.id;
    const selectedProvider = useMemo(
        () => providers.find((provider) => provider.id === selectedProviderId) || providers[0] || DEFAULT_PROVIDER,
        [providers, selectedProviderId]
    );

    useEffect(() => {
        setShowModelMenu(false);
        setCustomProviderModels([]);
        setShowApiKey(false);
    }, [selectedProvider.id, selectedProvider.api_base_url, selectedProvider.auth]);

    const resolvedRequestUrl = useMemo(
        () => resolveApiRequestUrl(selectedProvider.api_base_url, selectedProvider.request_mode),
        [selectedProvider.api_base_url, selectedProvider.request_mode]
    );

    const customModelOptions = useMemo(
        () => Object.fromEntries(customProviderModels.map((item) => [item.id, item.id])),
        [customProviderModels]
    );

    const customModelLabel = useMemo(
        () => selectedProvider.model_name || '请选择模型',
        [selectedProvider.model_name]
    );

    const persistProviders = async (nextProviders, nextSelectedProviderId = selectedProvider.id) => {
        const effectiveSelectedProvider =
            nextProviders.find((provider) => provider.id === nextSelectedProviderId) || nextProviders[0];

        await updateSettings({
            model_type: 'custom',
            custom_providers: nextProviders,
            selected_provider_id: effectiveSelectedProvider.id,
            custom_model: providerToLegacyModel(effectiveSelectedProvider)
        });
    };

    const updateSelectedProvider = async (patch) => {
        const nextProviders = providers.map((provider) =>
            provider.id === selectedProvider.id
                ? {
                    ...provider,
                    ...patch
                }
                : provider
        );

        await persistProviders(nextProviders, selectedProvider.id);
    };

    const handleProviderNameChange = async (value) => {
        await updateSelectedProvider({ name: value });
    };

    const handleProviderApiUrlChange = async (value, ensureVersion = false) => {
        const normalized = normalizeProviderApiInput(value, ensureVersion);
        await updateSelectedProvider({
            api_base_url: normalized.apiBaseUrl,
            ...(normalized.requestMode ? { request_mode: normalized.requestMode } : {})
        });
    };

    const handleSelectRequestMode = async (requestMode) => {
        await updateSelectedProvider({ request_mode: requestMode });
    };

    const handleAddProvider = async () => {
        const providerCount = providers.length + 1;
        const nextProvider = {
            ...DEFAULT_PROVIDER,
            id: createProviderId(),
            name: `服务商 ${providerCount}`
        };

        await persistProviders([...providers, nextProvider], nextProvider.id);
        showSuccess('已添加新的自定义服务商');
    };

    const handleDeleteProvider = async (providerId) => {
        if (providers.length <= 1) {
            showError('至少保留一个服务商配置');
            return;
        }

        const nextProviders = providers.filter((provider) => provider.id !== providerId);
        const nextSelectedProviderId =
            selectedProvider.id === providerId ? nextProviders[0].id : selectedProvider.id;

        await persistProviders(nextProviders, nextSelectedProviderId);
        showSuccess('服务商已删除');
    };

    const handleSelectProvider = async (providerId) => {
        if (providerId === selectedProvider.id) {
            return;
        }

        await persistProviders(providers, providerId);
    };

    const handleFetchCustomModels = async () => {
        if (!selectedProvider.auth) {
            showError('请先填写 API Key');
            return;
        }

        if (!selectedProvider.api_base_url) {
            showError('请先填写请求地址');
            return;
        }

        setIsFetchingModels(true);
        try {
            await log('开始拉取服务商模型列表', {
                providerName: selectedProvider.name,
                apiBaseUrl: selectedProvider.api_base_url
            });

            const models = await invoke('fetch_custom_models', {
                apiUrl: selectedProvider.api_base_url,
                auth: selectedProvider.auth
            });

            setCustomProviderModels(models);
            setShowModelMenu(true);
            showSuccess(`成功获取 ${models.length} 个模型`);
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('拉取服务商模型列表失败', message);
            showError(message);
        } finally {
            setIsFetchingModels(false);
        }
    };

    const handleSelectCustomModel = async (modelName) => {
        await updateSelectedProvider({ model_name: modelName });
        setShowModelMenu(false);
        showSuccess(`已选择模型 ${modelName}`);
    };

    const handleTestConnection = async () => {
        if (!selectedProvider.auth) {
            showError('请输入 API Key');
            return;
        }

        if (!selectedProvider.api_base_url) {
            showError('请输入请求地址');
            return;
        }

        if (!selectedProvider.model_name) {
            showError('请输入模型名称');
            return;
        }

        setIsTestingConnection(true);
        try {
            await log('开始测试自定义服务商连接', {
                providerName: selectedProvider.name,
                requestUrl: resolvedRequestUrl,
                modelName: selectedProvider.model_name
            });
            const result = await testOpenAIConnection(selectedProvider);
            if (result) {
                showSuccess('API 连接测试成功！');
            }
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('自定义服务商连接测试失败', message);
            showError(message);
        } finally {
            setIsTestingConnection(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">AI模型设置</h1>
                <p className="text-zinc-600 dark:text-zinc-400">
                    支持多个自定义服务商配置，请求地址输入到 <span className="font-mono">/v1</span> 即可。
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)] gap-6">
                <motion.div
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                            <Crown className="w-5 h-5 stroke-zinc-500" />
                            服务商列表
                        </div>
                        <button
                            type="button"
                            onClick={handleAddProvider}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                        >
                            添加服务商
                        </button>
                    </div>

                    <div className="space-y-3">
                        {providers.map((provider) => {
                            const isActive = provider.id === selectedProvider.id;
                            return (
                                <div
                                    key={provider.id}
                                    className={`rounded-xl border transition-colors ${
                                        isActive
                                            ? 'border-zinc-900 bg-zinc-50'
                                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSelectProvider(provider.id)}
                                        className="w-full text-left p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                    {provider.name || '未命名服务商'}
                                                </div>
                                                <div className="mt-1 text-xs text-zinc-400 font-mono truncate">
                                                    {provider.api_base_url || '等待填写 /v1 地址'}
                                                </div>
                                                <div className="mt-2 flex items-center gap-1 px-2 py-0.5 w-fit bg-zinc-100 dark:bg-zinc-800 rounded-md">
                                                    <Cube className="w-3.5 h-3.5 stroke-zinc-500" />
                                                    <span className="text-xs text-zinc-500">
                                                        {provider.model_name || '未设置模型'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleDeleteProvider(provider.id);
                                                }}
                                                className={`shrink-0 px-2 py-1 rounded-md text-xs transition-colors ${
                                                    providers.length <= 1
                                                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                }`}
                                                disabled={providers.length <= 1}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
                        <Server className="w-5 h-5 stroke-zinc-500" />
                        自定义API配置
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">服务商名称</label>
                            <input
                                type="text"
                                value={selectedProvider.name || ''}
                                onChange={(event) => handleProviderNameChange(event.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                placeholder="例如：我的中转服务 / 自定义服务商"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm text-zinc-500">API Key</label>
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey((visible) => !visible)}
                                    className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
                                >
                                    {showApiKey ? '隐藏' : '显示'}
                                </button>
                            </div>
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={selectedProvider.auth || ''}
                                onChange={(event) => updateSelectedProvider({ auth: event.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                placeholder="输入你的 API Key"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm text-zinc-500">请求类型</label>
                                <div className="flex gap-2">
                                    {REQUEST_MODE_OPTIONS.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => handleSelectRequestMode(option.id)}
                                            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                                                selectedProvider.request_mode === option.id
                                                    ? 'bg-zinc-900 text-white'
                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="text"
                                value={selectedProvider.api_base_url || ''}
                                onChange={(event) => handleProviderApiUrlChange(event.target.value)}
                                onBlur={(event) => handleProviderApiUrlChange(event.target.value, true)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                placeholder="例如：https://your-provider.example.com/v1"
                            />
                            <p className="mt-2 text-xs text-zinc-400">
                                这里只保留到 <span className="font-mono">/v1</span>。当前实际请求地址：
                                <span className="font-mono ml-1 break-all">{resolvedRequestUrl || '等待填写'}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">Model Name</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (customProviderModels.length > 0) {
                                                setShowModelMenu(true);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                    >
                                        {customModelLabel}
                                    </button>
                                    <DropdownMenu
                                        show={showModelMenu && customProviderModels.length > 0}
                                        onClose={() => setShowModelMenu(false)}
                                        options={customModelOptions}
                                        currentValue={selectedProvider.model_name || ''}
                                        onSelect={handleSelectCustomModel}
                                        className="top-full bottom-auto mt-2 mb-0 max-h-[280px] overflow-y-auto min-w-full"
                                        renderOption={(value) => {
                                            const currentModel = customProviderModels.find((item) => item.id === value);
                                            return (
                                                <div className="flex flex-col items-start">
                                                    <span>{value}</span>
                                                    {currentModel?.owned_by && (
                                                        <span className="text-xs text-zinc-400 mt-0.5">
                                                            {currentModel.owned_by}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={isFetchingModels}
                                    onClick={handleFetchCustomModels}
                                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        isFetchingModels
                                            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                            : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                    }`}
                                >
                                    {isFetchingModels ? '拉取中...' : '拉取模型'}
                                </button>
                            </div>
                            <input
                                type="text"
                                value={selectedProvider.model_name || ''}
                                onChange={(event) => updateSelectedProvider({ model_name: event.target.value })}
                                className="w-full mt-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                placeholder="也可以手动输入模型名，例如：服务商返回的模型名"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-4">
                            <p className="text-xs text-zinc-400">
                                模型列表会从 <span className="font-mono">{selectedProvider.api_base_url || '/v1'}/models</span> 拉取。
                            </p>
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTestingConnection}
                                className={`px-3 py-1.5 text-xs text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg transition-all flex items-center gap-2 ${
                                    isTestingConnection
                                        ? 'opacity-70 cursor-not-allowed'
                                        : 'hover:bg-zinc-800 dark:hover:bg-zinc-200'
                                }`}
                            >
                                {isTestingConnection ? '测试中...' : '测试连接'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

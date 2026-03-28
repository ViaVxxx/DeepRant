import { motion } from 'framer-motion';
import { Translate, Repeat01, ArrowRight } from '../../../icons';
import { useState } from 'react';
import { useStore } from '../../../components/StoreProvider';
import DropdownMenu from '../../../components/DropdownMenu';
import * as FlagIcons from 'country-flag-icons/react/3x2';

const LANGUAGES = {
    zh: {
        name: '中文',
        code: 'CN'
    },
    'en-SEA': {
        name: '东南亚英语',
        code: 'SG'  // 使用新加坡国旗代码
    },
    ko: {
        name: '韩文',
        code: 'KR'
    },
    en: {
        name: '英文',
        code: 'US'
    },
    fr: {
        name: '法文',
        code: 'FR'
    },
    ru: {
        name: '俄文',
        code: 'RU'
    },
    es: {
        name: '西班牙文',
        code: 'ES'
    },
    ja: {
        name: '日文',
        code: 'JP'
    },
    de: {
        name: '德文',
        code: 'DE'
    }
};

const resolveProviderRequestUrl = (apiBaseUrl = '', requestMode = 'responses') => {
    const normalized = apiBaseUrl.trim().replace(/\/+$/, '');
    if (!normalized) {
        return '';
    }

    const versionedBase = normalized.toLowerCase().endsWith('/v1')
        ? normalized
        : `${normalized}/v1`;

    return `${versionedBase}/${requestMode === 'chat' ? 'chat/completions' : 'responses'}`;
};

export default function TranslationDirectionCard() {
    const [showFromMenu, setShowFromMenu] = useState(false);
    const [showToMenu, setShowToMenu] = useState(false);
    const [showProviderMenu, setShowProviderMenu] = useState(false);
    const { settings, updateSettings } = useStore();

    const from = settings?.translation_from || 'zh';
    const to = settings?.translation_to || 'en';
    const providers = settings?.custom_providers?.length
        ? settings.custom_providers
        : settings?.custom_model
            ? [{
                id: 'provider-legacy',
                name: 'Legacy',
                auth: settings.custom_model.auth,
                api_base_url: settings.custom_model.api_url,
                request_mode: 'responses',
                model_name: settings.custom_model.model_name
            }]
            : [];
    const currentProvider = providers.find(
        (provider) => provider.id === settings?.selected_provider_id
    ) || providers[0];
    const currentModelName =
        currentProvider?.model_name ||
        settings?.custom_model?.model_name ||
        '未设置';

    const handleProviderSelect = async (providerId) => {
        const nextProvider = providers.find((provider) => provider.id === providerId);
        if (!nextProvider) {
            return;
        }

        setShowProviderMenu(false);
        await updateSettings({
            selected_provider_id: nextProvider.id,
            custom_model: {
                auth: nextProvider.auth || '',
                api_url: resolveProviderRequestUrl(
                    nextProvider.api_base_url || '',
                    nextProvider.request_mode || 'responses'
                ),
                model_name: nextProvider.model_name || ''
            }
        });
    };

    const handleLanguageSelect = async (lang, isFrom) => {
        if (isFrom) {
            setShowFromMenu(false);
            await updateSettings({ translation_from: lang });
        } else {
            setShowToMenu(false);
            await updateSettings({ translation_to: lang });
        }
    };

    const handleSwapDirection = async () => {
        await updateSettings({
            translation_from: to,
            translation_to: from
        });
    };

    const renderLanguageButton = (lang, onClick) => {
        const FlagIcon = FlagIcons[LANGUAGES[lang].code];
        return (
            <button
                onClick={onClick}
                className="px-4 py-1.5 rounded-lg bg-zinc-50 hover:bg-[#EAEAEA] transition-colors flex items-center gap-2 shadow-sm"
            >
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                    <FlagIcon className="w-7 h-7 scale-[1.8]" />
                </div>
                {LANGUAGES[lang].name}
            </button>
        );
    };

    return (
        <motion.div
            className="relative h-full flex flex-col bg-white rounded-2xl p-5 border border-zinc-200 hover:border-zinc-300 transition-all duration-200 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <Translate className="w-6 h-6" />
                    翻译模式
                </div>
                <button onClick={handleSwapDirection}>
                    <Repeat01 className="w-6 h-6 text-zinc-400 hover:text-zinc-600 transition-colors" />
                </button>
            </div>
            <div className="flex-1 flex flex-col justify-between mt-3">
                <div>
                    <div className="text-sm text-zinc-400">
                        设置你的翻译方向
                    </div>
                    <div className="text-sm text-zinc-400 mt-2">
                        如果前后方向相同，也可以增强语气和语言战斗力。
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => providers.length > 0 && setShowProviderMenu(true)}
                            className="w-full px-4 py-2.5 rounded-2xl border border-zinc-200 bg-zinc-50/90 hover:bg-zinc-100 transition-all duration-200 text-left text-base font-semibold text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="truncate">{currentModelName}</span>
                                <span className="shrink-0 text-xs font-medium text-zinc-400">
                                    切换
                                </span>
                            </div>
                        </button>
                        <DropdownMenu
                            show={showProviderMenu && providers.length > 0}
                            onClose={() => setShowProviderMenu(false)}
                            options={Object.fromEntries(
                                providers.map((provider) => [provider.id, provider.model_name || '未设置模型'])
                            )}
                            currentValue={currentProvider?.id || ''}
                            onSelect={handleProviderSelect}
                            className="bottom-full top-auto mb-2 mt-0 min-w-[260px] max-w-[280px]"
                            renderOption={(providerId, label) => {
                                const provider = providers.find((item) => item.id === providerId);
                                return (
                                    <div className="flex flex-col items-start pr-6">
                                        <span className="truncate">{label}</span>
                                        <span className="text-xs text-zinc-400 mt-0.5 truncate">
                                            {provider?.name || '未命名服务商'}
                                        </span>
                                    </div>
                                );
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-3 text-[28px] font-semibold text-zinc-900">
                        <div className="relative">
                            {renderLanguageButton(from, () => setShowFromMenu(true))}
                            <DropdownMenu
                                options={Object.fromEntries(
                                    Object.entries(LANGUAGES).map(([key, value]) => [key, value.name])
                                )}
                                onSelect={(lang) => handleLanguageSelect(lang, true)}
                                show={showFromMenu}
                                onClose={() => setShowFromMenu(false)}
                                currentValue={from}
                                renderOption={(key, value) => {
                                    const FlagIcon = FlagIcons[LANGUAGES[key].code];
                                    return (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                                                <FlagIcon className="w-6 h-6 scale-[1.8]" />
                                            </div>
                                            {value}
                                        </div>
                                    );
                                }}
                            />
                        </div>
                        <ArrowRight />
                        <div className="relative">
                            {renderLanguageButton(to, () => setShowToMenu(true))}
                            <DropdownMenu
                                options={Object.fromEntries(
                                    Object.entries(LANGUAGES).map(([key, value]) => [key, value.name])
                                )}
                                onSelect={(lang) => handleLanguageSelect(lang, false)}
                                show={showToMenu}
                                onClose={() => setShowToMenu(false)}
                                currentValue={to}
                                anchorPosition="right-0"
                                renderOption={(key, value) => {
                                    const FlagIcon = FlagIcons[LANGUAGES[key].code];
                                    return (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                                                <FlagIcon className="w-6 h-6 scale-[1.8]" />
                                            </div>
                                            {value}
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
} 

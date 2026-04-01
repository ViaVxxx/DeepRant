import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { Server, Dock } from '../icons';
import { useStore } from '../components/StoreProvider';
import { showError, showSuccess } from '../utils/toast';
import { log, logError } from '../utils/log';
import { cardVariants } from '../utils/motion';

const LOG_LEVEL_OPTIONS = [
    {
        id: 'concise',
        name: '简洁',
        description: '仅记录告警和错误'
    },
    {
        id: 'standard',
        name: '标准',
        description: '记录常规运行信息'
    },
    {
        id: 'detailed',
        name: '详细',
        description: '记录调试细节和完整过程'
    }
];

export default function Logs() {
    const { settings, updateSettings } = useStore();
    const [draftDirectory, setDraftDirectory] = useState('');
    const [logConfig, setLogConfig] = useState({
        current_dir: '',
        default_dir: '',
        file_path: ''
    });
    const [recentLogs, setRecentLogs] = useState('');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasLoadedLogs, setHasLoadedLogs] = useState(false);

    const configuredDirectory = settings?.log_directory || '';
    const configuredLogLevel = settings?.log_level || 'standard';
    const hasCustomDirectory = configuredDirectory.trim().length > 0;
    const effectiveDirectory = useMemo(
        () => logConfig.current_dir || logConfig.default_dir || '',
        [logConfig.current_dir, logConfig.default_dir]
    );

    useEffect(() => {
        setDraftDirectory(configuredDirectory);
    }, [configuredDirectory]);

    const loadLogConfig = async () => {
        try {
            const config = await invoke('get_log_config');
            setLogConfig(config);
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('加载日志配置失败', message);
            showError(`加载日志配置失败: ${message}`);
        }
    };

    useEffect(() => {
        loadLogConfig();
    }, []);

    const loadRecentLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const logs = await invoke('read_recent_logs', { maxLines: 120 });
            setRecentLogs(logs || '');
            setHasLoadedLogs(true);
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('加载最新日志失败', message);
            showError(`加载日志失败: ${message}`);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleSaveDirectory = async () => {
        setIsSaving(true);
        try {
            await updateSettings({
                log_directory: draftDirectory.trim()
            });
            await log('日志目录已更新', draftDirectory.trim() || '[默认目录]');
            showSuccess('日志目录已更新');
            setRecentLogs('');
            setHasLoadedLogs(false);
            await loadLogConfig();
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('更新日志目录失败', message);
            showError(`保存失败: ${message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangeLogLevel = async (logLevel) => {
        try {
            await updateSettings({ log_level: logLevel });
            await log('日志内容级别已更新', logLevel);
            showSuccess('日志内容级别已更新');
            if (hasLoadedLogs) {
                await loadRecentLogs();
            }
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('更新日志内容级别失败', message);
            showError(`更新失败: ${message}`);
        }
    };

    const handleResetDirectory = async () => {
        setDraftDirectory('');
        setIsSaving(true);
        try {
            await updateSettings({ log_directory: '' });
            await log('日志目录已恢复默认值');
            showSuccess('已恢复默认日志目录');
            setRecentLogs('');
            setHasLoadedLogs(false);
            await loadLogConfig();
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('恢复默认日志目录失败', message);
            showError(`恢复默认失败: ${message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenDirectory = async () => {
        if (!effectiveDirectory) {
            showError('日志目录尚未初始化');
            return;
        }

        try {
            await openPath(effectiveDirectory);
            await log('打开日志目录', effectiveDirectory);
        } catch (error) {
            const message = typeof error === 'string' ? error : error.message;
            await logError('打开日志目录失败', message);
            showError(`打开目录失败: ${message}`);
        }
    };

    return (
        <div className="h-full min-h-0 flex flex-col gap-6">
            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                custom={0}
            >
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">日志</h1>
            </motion.div>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    custom={1}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
                        <Server className="w-5 h-5 stroke-zinc-500" />
                        日志设置
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">当前生效目录</label>
                            <div className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 font-mono break-all">
                                {effectiveDirectory || '加载中...'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">默认目录</label>
                            <div className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 font-mono break-all">
                                {logConfig.default_dir || '加载中...'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">自定义日志目录</label>
                            <input
                                type="text"
                                value={draftDirectory}
                                onChange={(event) => setDraftDirectory(event.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300"
                                placeholder={logConfig.default_dir || '例如：D:/DeepRant/logs'}
                            />
                            <p className="mt-2 text-xs text-zinc-400">
                                留空表示使用默认目录：应用安装目录下的 <span className="font-mono">logs</span> 文件夹。
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">日志内容</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {LOG_LEVEL_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleChangeLogLevel(option.id)}
                                        className={`text-left px-3 py-3 rounded-xl border transition-colors ${
                                            configuredLogLevel === option.id
                                                ? 'border-zinc-900 bg-zinc-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-white dark:bg-white dark:text-zinc-900'
                                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <div className="text-sm font-medium">{option.name}</div>
                                        <div className={`mt-1 text-xs ${
                                            configuredLogLevel === option.id ? 'text-zinc-200 dark:text-zinc-500' : 'text-zinc-400'
                                        }`}>
                                            {option.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-500 mb-2">日志文件</label>
                            <div className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 font-mono break-all">
                                {logConfig.file_path || '加载中...'}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleSaveDirectory}
                                disabled={isSaving}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isSaving
                                        ? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                                        : 'bg-zinc-900 dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-800 text-white dark:text-zinc-100 hover:bg-zinc-800 dark:hover:bg-black'
                                }`}
                            >
                                保存目录
                            </button>
                            <button
                                type="button"
                                onClick={handleResetDirectory}
                                disabled={isSaving || !hasCustomDirectory}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isSaving || !hasCustomDirectory
                                        ? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                                        : 'bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-black'
                                }`}
                            >
                                恢复默认
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenDirectory}
                                className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-black transition-colors"
                            >
                                打开目录
                            </button>
                            <button
                                type="button"
                                onClick={loadRecentLogs}
                                disabled={isLoadingLogs}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isLoadingLogs
                                        ? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                                        : 'bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-black'
                                }`}
                            >
                                {isLoadingLogs ? '加载中...' : hasLoadedLogs ? '刷新日志' : '加载日志'}
                            </button>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    className="flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm overflow-hidden"
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    custom={2}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
                        <Dock className="w-5 h-5 stroke-zinc-500" />
                        最近日志
                    </div>

                    <div className="flex-1 min-h-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-950 text-zinc-100 p-4 overflow-y-auto overflow-x-hidden">
                        <pre className="text-xs leading-6 whitespace-pre-wrap break-all">
                            {hasLoadedLogs
                                ? (recentLogs || '暂无日志内容')
                                : '点击“加载日志”后读取最近日志内容'}
                        </pre>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

import { motion } from 'framer-motion';
import { GamingPad, Server, AT } from '../icons';
import DeveloperNote from '../components/DeveloperNote';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { performUpdateCheck } from '../utils/updater';

export default function About() {
    const [updateStatus, setUpdateStatus] = useState('idle');
    const [currentVersion, setCurrentVersion] = useState('');

    useEffect(() => {
        invoke('get_version')
            .then(version => {
                setCurrentVersion(version);
            })
            .catch(error => {
                console.error('获取版本号失败:', error);
            });
    }, []);

    const checkUpdate = async () => {
        try {
            await performUpdateCheck({
                onStatusChange: setUpdateStatus,
            });
        } catch (error) {
            console.error('Update error:', error);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">关于 DeepRant - Via 二开版</h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <AT className="w-4 h-4 stroke-zinc-500" />
                        <span className="text-sm text-zinc-500">版本 {currentVersion}</span>
                        <button
                            onClick={checkUpdate}
                            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                            className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${updateStatus === 'checking' || updateStatus === 'downloading'
                                ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                        >
                            {updateStatus === 'checking' && '检查更新中...'}
                            {updateStatus === 'downloading' && '下载更新中...'}
                            {updateStatus === 'idle' && '检查更新'}
                            {updateStatus === 'error' && '重试更新'}
                        </button>
                    </div>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">
                    当前程序为 ViaVxxx 基于 DeepRant 维护的二开版本，聚焦国际服游戏场景下的快捷翻译、常用语和自定义 API 能力。
                </p>
            </motion.div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <DeveloperNote />
                </motion.div>

                <motion.div
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                        <GamingPad className="w-6 h-6 stroke-zinc-500" />
                        游戏场景优化
                    </div>
                    <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                        保留原项目对 MOBA / FPS 等场景的翻译优化，继续服务游戏内的高频短句沟通。
                    </div>
                </motion.div>

                <motion.div
                    className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                        <Server className="w-6 h-6 stroke-zinc-500" />
                        二开增强能力
                    </div>
                    <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                        新增常用语增删改、自定义服务商模型拉取与日志排查能力，方便继续维护和定位问题。
                    </div>
                </motion.div>
            </div>

            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
            >
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">版本说明</h2>
                <div className="mt-4 space-y-2 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
                    <p>• 已将原独立的“说明”页面内容合并到“关于”页面，减少导航层级。</p>
                    <p>• 已移除使用额度展示，当前版本聚焦翻译、常用语、自定义服务商和日志能力。</p>
                    <p>• 当前版本继续保留游戏场景优化，并增强了二开维护与问题定位体验。</p>
                </div>
            </motion.div>
        </div>
    );
}

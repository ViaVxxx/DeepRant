import { motion } from 'framer-motion';
import { GamingPad, Server, AT, Github, Globe } from '../icons';
import DeveloperNote from '../components/DeveloperNote';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { performUpdateCheck } from '../utils/updater';
import { cardVariants } from '../utils/motion';

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

    const handleOpenExternal = async (url) => {
        try {
            await openUrl(url);
        } catch (error) {
            console.error('打开外部链接失败:', error);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                custom={0}
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
                                ? 'bg-zinc-200 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-600 cursor-not-allowed'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-zinc-950 dark:border dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-black'
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

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-6 items-stretch">
                <motion.div
                    className="md:row-span-2 h-full"
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    custom={1}
                >
                    <DeveloperNote />
                </motion.div>

                <motion.div
                    className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    custom={2}
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
                    className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    custom={3}
                >
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                        <Server className="w-6 h-6 stroke-zinc-500" />
                        二开增强能力
                    </div>
                    <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                        新增常用语增删改、自定义服务商模型拉取与日志排查能力，方便继续维护和定位问题。
                    </div>
                </motion.div>
                <motion.div
                    className="h-full flex flex-col md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-sm"
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    custom={4}
                >
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">请支持原作者</h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                        当前版本基于原项目继续维护，欢迎前往原仓库与官网了解项目背景并支持原作者。
                    </p>
                    <div className="mt-5 grid max-w-[560px] grid-cols-1 gap-4">
                        <button
                            type="button"
                            onClick={() => handleOpenExternal('https://github.com/liseami/DeepRant.git')}
                            className="flex w-full items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            <Github className="w-4 h-4 mt-1 shrink-0 stroke-current" />
                            <div className="min-w-0">
                                <div className="font-medium text-zinc-900 dark:text-white">原仓库</div>
                                <div className="mt-1 font-mono break-all">https://github.com/liseami/DeepRant.git</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenExternal('https://chunxiang.space/deeprant')}
                            className="flex w-full items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            <Globe className="w-4 h-4 mt-1 shrink-0 stroke-current" />
                            <div className="min-w-0">
                                <div className="font-medium text-zinc-900 dark:text-white">官网</div>
                                <div className="mt-1 font-mono break-all">https://chunxiang.space/deeprant</div>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

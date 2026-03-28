import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GamingPad, Repeat01, SwitchArrowHorizontal, IMac } from '../../../icons';
import { useStore } from '../../../components/StoreProvider';
import DropdownMenu from '../../../components/DropdownMenu';

const GAMES = {
    lol: '英雄联盟',
    dota2: 'Dota 2',
    csgo: 'CS:GO',
    pubg: 'PUBG',
    apex: 'Apex Legends',
    overwatch: '守望先锋',
    valorant: 'Valorant',
    fortnite: 'Fortnite',
    minecraft: 'Minecraft',
    warzone: 'Warzone',
    wow: '魔兽世界'
};

export default function GameSceneCard() {
    const [showMenu, setShowMenu] = useState(false);
    const [gameName, setGameName] = useState('');
    const { settings, updateSettings } = useStore();

    const gameId = settings?.game_scene || 'lol';
    const isDaily = settings?.daily_mode || false;

    useEffect(() => {
        setGameName(GAMES[gameId]);
    }, [gameId]);

    const handleGameSelect = async (gameId) => {
        setShowMenu(false);
        await updateSettings({ game_scene: gameId });
    };

    const toggleDailyMode = async () => {
        await updateSettings({ daily_mode: !isDaily });
    };

    return (
        <motion.div
            className="relative flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                    {isDaily ? (
                        <IMac className="w-6 h-6 stroke-zinc-500" />
                    ) : (
                        <GamingPad className="w-6 h-6 stroke-zinc-500" />
                    )}
                    {isDaily ? '日常模式' : '游戏模式'}
                </div>
                <div className="flex flex-col items-end">
                    <button
                        onClick={toggleDailyMode}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${isDaily
                            ? 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                            }`}
                    >
                        <span> {isDaily ? '游戏模式' : '日常模式'}</span>
                        <Repeat01 className="w-4 h-4 text-zinc-600 hover:text-zinc-600 transition-colors" />
                    </button>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-between mt-4">
                <div className="text-sm leading-6 text-zinc-400">
                    {isDaily
                        ? '当前为日常划词翻译场景，适合浏览、聊天和通用文本理解。'
                        : '选择游戏场景后，翻译会更贴近当前语境，例如推塔、gank、rush 等常见术语。'}
                </div>
                {!isDaily && (
                    <div className="relative mt-4">
                        <button
                            onClick={() => setShowMenu(true)}
                            className="w-fit px-5 py-2 rounded-2xl border border-zinc-200 bg-zinc-50 hover:bg-[#EAEAEA] transition-colors text-[18px] font-semibold text-zinc-900 dark:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                        >
                            {gameName}
                        </button>
                        <DropdownMenu
                            show={showMenu}
                            onClose={() => setShowMenu(false)}
                            options={GAMES}
                            currentValue={gameId}
                            onSelect={handleGameSelect}
                        />
                    </div>
                )}
                {isDaily && (
                    <div className="mt-4">
                        <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-2 text-[18px] font-semibold text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                            划词翻译
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

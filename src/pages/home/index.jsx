import { motion } from 'framer-motion';
import TranslationDirectionCard from './components/TranslationDirectionCard';
import GameSceneCard from './components/GameSceneCard';
import HotkeyCard from './components/HotkeyCard';
import TranslationModeCard from './components/TranslationModeCard';
import { cardVariants } from '../../utils/motion';

export default function Home() {
    return (
        <div className="h-full flex flex-col gap-4">
            <motion.div
                className="w-full min-h-[148px] md:min-h-[164px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-7 py-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-colors duration-300"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                custom={0}
            >
                <div className="flex h-full min-h-[100px] flex-col justify-center">
                    <div className="text-xs font-medium tracking-[0.32em] text-zinc-400">
                        主页
                    </div>
                    <h1 className="mt-3 text-[48px] font-semibold leading-none tracking-[-0.04em] text-zinc-900 dark:text-white md:text-[72px]">
                        DeepRant
                    </h1>
                    <p className="mt-3 max-w-[560px] text-sm leading-6 text-zinc-500 dark:text-zinc-400 md:text-base">
                        快捷翻译、常用语与自定义服务商配置，面向国际服游戏沟通场景。
                    </p>
                </div>
            </motion.div>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1.14fr)_minmax(0,0.93fr)_minmax(0,0.93fr)] md:grid-rows-[minmax(210px,0.78fr)_minmax(0,1.12fr)] gap-4 items-stretch">
                <div className="md:row-span-2 min-h-0 h-full">
                    <TranslationDirectionCard />
                </div>
                <GameSceneCard />
                <HotkeyCard />
                <div className="md:col-span-2 min-h-0 h-full">
                    <TranslationModeCard />
                </div>
            </div>
        </div>
    );
}

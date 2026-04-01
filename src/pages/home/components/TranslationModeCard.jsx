import { motion } from 'framer-motion';
import { GamingPad, FaceOldFace, Whistle } from '../../../icons';
import { useStore } from '../../../components/StoreProvider';
import { cardVariants, subtleHover, subtleTap } from '../../../utils/motion';

const MODE_OPTIONS = [
    {
        id: 'auto',
        label: '自动',
        icon: FaceOldFace,
        description: '智能识别当前场景，自动选择更合适的翻译表达方式。'
    },
    {
        id: 'toxic',
        label: '嘴臭',
        icon: Whistle,
        description: '将语气强化为更有攻击性的对抗表达，适合高强度竞技场景。'
    },
    {
        id: 'pro',
        label: '职业玩家',
        icon: GamingPad,
        description: '使用更专业的游戏术语和短指令，强调沟通效率与战术感。'
    }
];

export default function TranslationModeCard() {
    const { settings, updateSettings } = useStore();
    const activeMode = settings?.translation_mode || 'auto';

    const handleModeChange = async (mode) => {
        const nextMode = activeMode === mode ? 'auto' : mode;
        await updateSettings({ translation_mode: nextMode });
    };

    return (
        <motion.div
            className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-sm"
            variants={cardVariants}
            initial="initial"
            animate="animate"
            custom={4}
            whileHover={subtleHover}
            whileTap={subtleTap}
        >
            <div className="text-[24px] font-semibold text-zinc-900 dark:text-white">
                模式
            </div>
            <div className="mt-4 space-y-3">
                {MODE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = activeMode === option.id;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handleModeChange(option.id)}
                            className={`w-full grid grid-cols-1 md:grid-cols-[170px_minmax(0,1fr)] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                                isActive
                                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-[0_8px_20px_rgba(24,24,27,0.12)] dark:border-white dark:bg-white dark:text-zinc-900'
                                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'stroke-white dark:stroke-zinc-900' : 'stroke-zinc-500'}`} />
                                <span className="text-[16px] font-semibold">{option.label}</span>
                            </div>
                            <div className={`text-xs leading-5 md:text-sm ${
                                isActive ? 'text-zinc-200 dark:text-zinc-500' : 'text-zinc-500'
                            }`}>
                                {option.description}
                            </div>
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
}

import { AnimatePresence, motion } from 'framer-motion';
import { CheckTick } from '../icons';
import { twMerge } from 'tailwind-merge';
import { dropdownVariants } from '../utils/motion';

export default function DropdownMenu({
    show,
    onClose,
    options,
    currentValue,
    onSelect,
    anchorPosition = 'left-0',
    className = '',
    renderOption
}) {
    return (
        <AnimatePresence>
            {show && (
                <>
                    <motion.div
                        className="fixed inset-0 z-10"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                    />
                    <motion.div
                        variants={dropdownVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={twMerge(
                            `absolute z-20 bottom-full mb-2 min-w-[160px] p-2 rounded-xl bg-[#F9F9F9] dark:bg-zinc-900 border-2 border-zinc-100/80 dark:border-zinc-800 shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_24px_rgba(0,0,0,0.28)] ${anchorPosition}`,
                            className
                        )}
                    >
                        {Object.entries(options).map(([value, label]) => {
                            const isActive = value === currentValue;
                            return (
                                <button
                                    key={value}
                                    className={twMerge(
                                        'w-full flex items-center px-3.5 py-2.5 text-[14px] relative rounded-lg transition-colors',
                                        isActive
                                            ? 'bg-zinc-900 text-white font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:bg-white dark:text-zinc-900'
                                            : 'text-[#1a1a1a] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    )}
                                    onClick={() => onSelect(value)}
                                >
                                    {renderOption ? renderOption(value, label, isActive) : label}
                                    {isActive && (
                                        <CheckTick className="w-6 h-6 ml-auto stroke-white dark:stroke-zinc-900" />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
} 

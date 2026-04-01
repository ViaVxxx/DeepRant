export const MOTION_EASE = [0.22, 1, 0.36, 1];
export const MOTION_EASE_FAST = [0.4, 0, 0.2, 1];

export const pageVariants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.26,
            ease: MOTION_EASE,
        },
    },
    exit: {
        opacity: 0,
        y: -8,
        transition: {
            duration: 0.18,
            ease: MOTION_EASE_FAST,
        },
    },
};

export const cardVariants = {
    initial: {
        opacity: 0,
        y: 14,
        scale: 0.995,
    },
    animate: (index = 0) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.32,
            delay: index * 0.05,
            ease: MOTION_EASE,
        },
    }),
};

export const dropdownVariants = {
    initial: {
        opacity: 0,
        y: 6,
        scale: 0.98,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.18,
            ease: MOTION_EASE,
        },
    },
    exit: {
        opacity: 0,
        y: 4,
        scale: 0.985,
        transition: {
            duration: 0.12,
            ease: MOTION_EASE_FAST,
        },
    },
};

export const subtleHover = {
    y: -2,
    transition: {
        duration: 0.18,
        ease: MOTION_EASE,
    },
};

export const subtleTap = {
    scale: 0.995,
    transition: {
        duration: 0.12,
        ease: MOTION_EASE_FAST,
    },
};

export const sidebarHighlightTransition = {
    type: 'spring',
    stiffness: 460,
    damping: 36,
    mass: 0.8,
};

export const continuousSpin = {
    repeat: Infinity,
    duration: 0.9,
    ease: 'linear',
};

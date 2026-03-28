import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import TranslationDirectionCard from './components/TranslationDirectionCard';
import GameSceneCard from './components/GameSceneCard';
import HotkeyCard from './components/HotkeyCard';
import TranslationModeCard from './components/TranslationModeCard';
import demoVideo from '../../assets/demovideo-lite.mp4';

export default function Home() {
    const [isSettingHotkey, setIsSettingHotkey] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!videoRef.current) {
            return;
        }

        const currentVideo = videoRef.current;
        currentVideo.playbackRate = 1.0;
        currentVideo.defaultPlaybackRate = 1.0;

        const syncPlaybackWithVisibility = () => {
            if (!currentVideo) {
                return;
            }

            if (document.hidden) {
                currentVideo.pause();
                return;
            }

            currentVideo.play().catch(() => undefined);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        currentVideo.play().catch(() => undefined);
                    } else {
                        currentVideo.pause();
                    }
                });
            },
            { threshold: 0.5 }
        );

        observer.observe(currentVideo);
        document.addEventListener('visibilitychange', syncPlaybackWithVisibility);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', syncPlaybackWithVisibility);
            currentVideo.pause();
        };
    }, []);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* 演示视频区域 */}
            <motion.div
                className="w-full bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="relative w-full" style={{ paddingTop: 'calc(100% / 7.5)' }}>
                    <video
                        ref={videoRef}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                    >
                        <source src={demoVideo} type="video/mp4" />
                    </video>
                </div>
            </motion.div>

            {/* 卡片网格 */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 md:grid-rows-[auto_1fr] gap-4">
                <div className="md:row-span-2">
                    <TranslationDirectionCard />
                </div>
                <GameSceneCard />
                <HotkeyCard
                    isSettingHotkey={isSettingHotkey}
                    onSetHotkey={() => setIsSettingHotkey(true)}
                />
                <div className="md:col-span-2 h-full">
                    <TranslationModeCard />
                </div>
            </div>
        </div>
    );
}

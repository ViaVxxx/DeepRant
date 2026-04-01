import Sidebar from './Sidebar';
import { StoreProvider } from './StoreProvider';
import { Toaster } from 'react-hot-toast';

export default function Layout({ children, activeItem, setActiveItem, theme, onToggleTheme }) {
    return (
        <StoreProvider>
            <div className="flex h-screen bg-[#F9F9F9] dark:bg-zinc-950 overflow-hidden transition-colors duration-300">
                {/* Toast 容器 */}
                <Toaster
                    toastOptions={{
                        className: 'dark:bg-zinc-800 dark:text-white',
                        style: {
                            borderRadius: '12px',
                            background: '#fff',
                            color: '#363636',
                        },
                    }}
                />

                {/* 左侧固定宽度的侧边栏 */}
                <div className="w-[190px] h-screen">
                    <Sidebar
                        activeItem={activeItem}
                        setActiveItem={setActiveItem}
                        theme={theme}
                        onToggleTheme={onToggleTheme}
                    />
                </div>

                {/* 右侧内容区域 */}
                <div className="flex-1 p-3">
                    <div className="max-w-[1240px] mx-auto h-[calc(100vh-24px)] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.28)] p-4 overflow-auto transition-colors duration-300">
                        {children}
                    </div>
                </div>
            </div>
        </StoreProvider>
    );
} 

import { createContext, useContext, useState, useEffect } from 'react';
import { load } from '@tauri-apps/plugin-store';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
    const [store, setStore] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initStore = async () => {
            try {
                const storeInstance = await load('store.json');
                setStore(storeInstance);
                // 获取存储的设置，如果没有则使用默认值
                const storedSettings = await storeInstance.get('settings');
                if (storedSettings) {
                    setSettings(storedSettings);
                }
            } catch (error) {
                console.error('初始化 store 失败:', error);
            } finally {
                setLoading(false);
            }
        };
        initStore();
    }, []);

    const updateSettings = async (newSettings) => {
        if (!store) return;
        // 合并设置
        const updatedSettings = { ...settings, ...newSettings };
        try {
            await store.set('settings', updatedSettings);
            await store.save();
            setSettings(updatedSettings);
        } catch (error) {
            console.error('更新设置失败:', error);
        }
    };

    const replaceSettings = (nextSettings) => {
        setSettings(nextSettings);
    };

    return (
        <StoreContext.Provider value={{ store, settings, updateSettings, replaceSettings, loading }}>
            {children}
        </StoreContext.Provider>
    );
}

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore 必须在 StoreProvider 内部使用');
    }
    return context;
}; 

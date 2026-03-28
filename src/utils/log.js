import { invoke } from '@tauri-apps/api/core';

/**
 * 统一的日志工具函数
 * 将日志同时输出到浏览器控制台和后端
 * @param {...any} args - 要记录的参数
 */
export const log = async (...args) => {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    console.log(...args);
    try {
        await invoke('log_to_backend', { message, level: 'debug' });
    } catch (error) {
        console.error('写入后端日志失败:', error);
    }
};

/**
 * 错误日志工具函数
 * @param {...any} args - 要记录的参数
 */
export const logError = async (...args) => {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    console.error(...args);
    try {
        await invoke('log_to_backend', { message, level: 'error' });
    } catch (error) {
        console.error('写入后端错误日志失败:', error);
    }
}; 

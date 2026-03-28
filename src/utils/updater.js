import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { showError, showSuccess } from './toast';

export async function performUpdateCheck({
    onStatusChange,
    onNoUpdate,
    onInstalled,
    onError,
} = {}) {
    const setStatus = (status) => {
        if (typeof onStatusChange === 'function') {
            onStatusChange(status);
        }
    };

    try {
        setStatus('checking');
        const update = await check();

        if (!update) {
            showSuccess('当前已是最新版本');
            setStatus('idle');
            onNoUpdate?.();
            return { hasUpdate: false };
        }

        setStatus('downloading');
        let downloaded = 0;
        let contentLength = 0;

        await update.downloadAndInstall((progress) => {
            if (progress.event === 'Started') {
                contentLength = progress.data.contentLength;
                showSuccess(`开始下载更新包 ${(contentLength / 1024 / 1024).toFixed(2)}MB`);
                return;
            }

            if (progress.event === 'Progress') {
                downloaded += progress.data.chunkLength;
                const percent = contentLength > 0
                    ? ((downloaded / contentLength) * 100).toFixed(1)
                    : '0.0';
                showSuccess(`下载进度: ${percent}%`);
                return;
            }

            if (progress.event === 'Finished') {
                showSuccess('下载完成，准备安装');
            }
        });

        setStatus('installed');
        showSuccess('更新已完成，即将重启应用');
        onInstalled?.();
        await relaunch();
        return { hasUpdate: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(`更新失败: ${message}`);
        setStatus('error');
        onError?.(error);
        throw error;
    }
}

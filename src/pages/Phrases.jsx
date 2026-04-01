import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../components/StoreProvider';
import { showError, showSuccess } from '../utils/toast';
import {
    formatPressedKeys,
    getHotkeySignatureFromConfig,
    getHotkeySignatureFromKeys,
    getKeyName,
} from '../utils/hotkeys';
import { cardVariants } from '../utils/motion';

const getKeysFromPhrase = (item) => [...item.hotkey.modifiers, item.hotkey.key].filter(Boolean);

const createSavedRow = (item) => {
    const keys = getKeysFromPhrase(item);

    return {
        id: item.id,
        phrase: item.phrase,
        keys,
        hotkeyText: item.hotkey.shortcut,
        savedPhrase: item.phrase,
        savedKeys: keys,
        savedHotkeyText: item.hotkey.shortcut,
        isNew: false,
        isEditing: false,
    };
};

const createEmptyRow = () => ({
    id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    phrase: '',
    keys: [],
    hotkeyText: '',
    savedPhrase: '',
    savedKeys: [],
    savedHotkeyText: '',
    isNew: true,
    isEditing: true,
});

const getErrorMessage = (error) => {
    if (typeof error === 'string') {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return '操作失败，请稍后重试';
};

const arraysEqual = (left, right) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const reorderList = (items, sourceId, targetId) => {
    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return items;
    }

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);

    return nextItems;
};

const syncRowsWithSavedPhrases = (rows, savedPhrases) => {
    const savedMap = new Map(savedPhrases.map((item) => [item.id, item]));

    return rows.flatMap((row) => {
        if (row.isNew) {
            return [row];
        }

        const savedItem = savedMap.get(row.id);
        if (!savedItem) {
            return [];
        }

        if (row.isEditing) {
            const keys = getKeysFromPhrase(savedItem);
            return [{
                ...row,
                savedPhrase: savedItem.phrase,
                savedKeys: keys,
                savedHotkeyText: savedItem.hotkey.shortcut,
            }];
        }

        return [createSavedRow(savedItem)];
    });
};

export default function Phrases() {
    const { settings, replaceSettings } = useStore();
    const [rows, setRows] = useState([]);
    const [recordingId, setRecordingId] = useState(null);
    const [pressedKeys, setPressedKeys] = useState([]);
    const [savingId, setSavingId] = useState(null);
    const [draggingId, setDraggingId] = useState(null);
    const initializedRef = useRef(false);
    const pressedKeysRef = useRef([]);

    const phrases = useMemo(() => settings?.phrases || [], [settings?.phrases]);
    const translatorHotkeySignature = useMemo(
        () => getHotkeySignatureFromConfig(settings?.trans_hotkey),
        [settings?.trans_hotkey]
    );

    useEffect(() => {
        if (!initializedRef.current && settings?.phrases) {
            setRows(settings.phrases.map(createSavedRow));
            initializedRef.current = true;
        }
    }, [settings]);

    useEffect(() => {
        if (!recordingId) {
            return undefined;
        }

        const stopRecording = () => {
            setRecordingId(null);
            setPressedKeys([]);
            pressedKeysRef.current = [];
        };

        const handleKeyDown = (event) => {
            event.preventDefault();
            const keyName = getKeyName(event);

            setPressedKeys((currentKeys) => {
                const nextKeys = currentKeys.includes(keyName)
                    ? currentKeys
                    : [...currentKeys, keyName];
                pressedKeysRef.current = nextKeys;
                return nextKeys;
            });
        };

        const handleKeyUp = (event) => {
            event.preventDefault();
            const nextKeys = [...pressedKeysRef.current];

            if (nextKeys.length > 0) {
                setRows((currentRows) =>
                    currentRows.map((item) =>
                        item.id === recordingId
                            ? {
                                ...item,
                                keys: nextKeys,
                                hotkeyText: formatPressedKeys(nextKeys),
                            }
                            : item
                    )
                );
            }

            stopRecording();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [recordingId]);

    const getConflictMessage = (row) => {
        const currentSignature = getHotkeySignatureFromKeys(row.keys);

        if (!currentSignature) {
            return '';
        }

        if (currentSignature === translatorHotkeySignature) {
            return '与翻译快捷键冲突';
        }

        const conflictRow = rows.find(
            (item) =>
                item.id !== row.id &&
                getHotkeySignatureFromKeys(item.keys) === currentSignature
        );

        if (conflictRow) {
            return `与“${conflictRow.phrase || '未命名常用语'}”冲突`;
        }

        return '';
    };

    const addDraft = () => {
        setRows((currentRows) => [...currentRows, createEmptyRow()]);
    };

    const updateRow = (id, updater) => {
        setRows((currentRows) =>
            currentRows.map((item) => (item.id === id ? updater(item) : item))
        );
    };

    const startEditing = (id) => {
        updateRow(id, (item) => ({
            ...item,
            isEditing: true,
        }));
    };

    const cancelEditing = (item) => {
        if (recordingId === item.id) {
            setRecordingId(null);
            setPressedKeys([]);
            pressedKeysRef.current = [];
        }

        if (item.isNew) {
            setRows((currentRows) => currentRows.filter((row) => row.id !== item.id));
            return;
        }

        updateRow(item.id, (row) => ({
            ...row,
            phrase: row.savedPhrase,
            keys: row.savedKeys,
            hotkeyText: row.savedHotkeyText,
            isEditing: false,
        }));
    };

    const startRecording = (id) => {
        setRecordingId(id);
        setPressedKeys([]);
        pressedKeysRef.current = [];
    };

    const buildSavedOrder = (items) =>
        items.filter((item) => !item.isNew).map((item) => item.id);

    const persistPhraseOrder = async (nextRows, fallbackRows) => {
        const phraseIds = buildSavedOrder(nextRows);
        const currentSavedOrder = phrases.map((item) => item.id);

        if (arraysEqual(phraseIds, currentSavedOrder)) {
            return;
        }

        try {
            const updatedSettings = await invoke('reorder_phrases', { phraseIds });
            replaceSettings(updatedSettings);
            setRows((currentRows) => syncRowsWithSavedPhrases(currentRows, updatedSettings.phrases));
            showSuccess('常用语顺序已更新');
        } catch (error) {
            setRows(fallbackRows);
            showError(getErrorMessage(error));
        }
    };

    const savePhrase = async (item) => {
        const phrase = item.phrase.trim();
        const conflictMessage = getConflictMessage(item);

        if (!phrase) {
            showError('常用语内容不能为空');
            return;
        }

        if (item.keys.length < 2) {
            showError('请先录制一个包含修饰键的快捷键');
            return;
        }

        if (conflictMessage) {
            showError(conflictMessage);
            return;
        }

        setSavingId(item.id);
        try {
            const previousRows = rows;
            const previousSavedIds = new Set(
                previousRows.filter((row) => !row.isNew).map((row) => row.id)
            );

            const updatedSettings = item.isNew
                ? await invoke('add_phrase', { phrase, keys: item.keys })
                : await invoke('update_phrase', {
                    phraseId: item.id,
                    phrase,
                    keys: item.keys,
                });

            replaceSettings(updatedSettings);

            if (item.isNew) {
                const createdPhrase =
                    updatedSettings.phrases.find((phraseItem) => !previousSavedIds.has(phraseItem.id)) ||
                    updatedSettings.phrases[updatedSettings.phrases.length - 1];

                const nextRows = previousRows.map((row) =>
                    row.id === item.id ? createSavedRow(createdPhrase) : row
                );
                const syncedRows = syncRowsWithSavedPhrases(nextRows, updatedSettings.phrases);
                setRows(syncedRows);
                showSuccess('常用语添加成功');

                const reorderedRows = nextRows;
                const desiredOrder = buildSavedOrder(reorderedRows);
                const currentOrder = updatedSettings.phrases.map((phraseItem) => phraseItem.id);

                if (!arraysEqual(desiredOrder, currentOrder)) {
                    await persistPhraseOrder(reorderedRows, syncedRows);
                }
            } else {
                setRows((currentRows) =>
                    syncRowsWithSavedPhrases(
                        currentRows.map((row) =>
                            row.id === item.id
                                ? {
                                    ...row,
                                    isEditing: false,
                                }
                                : row
                        ),
                        updatedSettings.phrases
                    )
                );
                showSuccess('常用语更新成功');
            }
        } catch (error) {
            showError(getErrorMessage(error));
        } finally {
            setSavingId(null);
        }
    };

    const deletePhrase = async (item) => {
        if (recordingId === item.id) {
            setRecordingId(null);
            setPressedKeys([]);
            pressedKeysRef.current = [];
        }

        if (item.isNew) {
            setRows((currentRows) => currentRows.filter((row) => row.id !== item.id));
            return;
        }

        try {
            const updatedSettings = await invoke('delete_phrase', {
                phraseId: item.id,
            });
            replaceSettings(updatedSettings);
            setRows((currentRows) =>
                syncRowsWithSavedPhrases(
                    currentRows.filter((row) => row.id !== item.id),
                    updatedSettings.phrases
                )
            );
            showSuccess('常用语已删除');
        } catch (error) {
            showError(getErrorMessage(error));
        }
    };

    const handleDrop = async (targetId) => {
        if (!draggingId || draggingId === targetId) {
            setDraggingId(null);
            return;
        }

        const previousRows = rows;
        const nextRows = reorderList(previousRows, draggingId, targetId);
        setDraggingId(null);
        setRows(nextRows);
        await persistPhraseOrder(nextRows, previousRows);
    };

    const renderHotkeyButton = (item) => {
        if (recordingId !== item.id) {
            return item.hotkeyText || '点击录制';
        }

        if (pressedKeys.length === 0) {
            return '请按下快捷键';
        }

        return formatPressedKeys(pressedKeys);
    };

    return (
        <div className="h-full flex flex-col gap-6 p-6">
            <motion.div
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition-colors duration-300"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                custom={0}
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">常用语</h1>
                    </div>
                    <button
                        onClick={addDraft}
                        className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-800 text-white dark:text-zinc-100 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-black transition-colors"
                    >
                        新增常用语
                    </button>
                </div>

                <div className="grid grid-cols-[32px_minmax(0,1fr)_180px_230px] gap-4 px-1 pb-3 border-b border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <div />
                    <div>文字</div>
                    <div className="text-right">快捷键</div>
                    <div className="text-right">操作</div>
                </div>

                <div className="mt-1">
                    {rows.length === 0 && (
                        <div className="py-12 text-center text-sm text-zinc-400">
                            还没有常用语，点击右上角按钮开始添加。
                        </div>
                    )}

                    {rows.map((item) => {
                        const conflictMessage = getConflictMessage(item);
                        const isSaving = savingId === item.id;
                        const isDragging = draggingId === item.id;

                        return (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={() => setDraggingId(item.id)}
                                onDragEnd={() => setDraggingId(null)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => handleDrop(item.id)}
                                className={`grid grid-cols-[32px_minmax(0,1fr)_180px_230px] gap-4 items-center py-4 border-b border-zinc-100 last:border-b-0 transition-colors ${
                                    isDragging ? 'opacity-50' : ''
                                }`}
                            >
                                <button
                                    type="button"
                                    className="text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing text-lg"
                                    title="拖拽排序"
                                >
                                    ⋮⋮
                                </button>

                                <div className="min-w-0">
                                    {item.isEditing ? (
                                        <textarea
                                            rows={2}
                                            value={item.phrase}
                                            onChange={(event) =>
                                                updateRow(item.id, (row) => ({
                                                    ...row,
                                                    phrase: event.target.value,
                                                }))
                                            }
                                            placeholder="输入常用语内容"
                                            className="w-full resize-none px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700"
                                        />
                                    ) : (
                                        <div className="text-zinc-900 dark:text-zinc-100 leading-7 break-words pr-4">
                                            {item.phrase}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => item.isEditing && startRecording(item.id)}
                                        disabled={!item.isEditing}
                                        className={`min-w-[120px] px-4 py-2 rounded-xl text-base font-bold border transition-colors ${
                                            item.isEditing
                                                ? recordingId === item.id
                                                    ? 'border-zinc-700 bg-zinc-950 text-zinc-100'
                                                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-500 cursor-default'
                                        }`}
                                    >
                                        {renderHotkeyButton(item)}
                                    </button>
                                    {conflictMessage && item.isEditing && (
                                        <div className="text-xs text-red-500">{conflictMessage}</div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2">
                                    {item.isEditing ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => savePhrase(item)}
                                                disabled={isSaving || Boolean(conflictMessage)}
                                                className={`px-4 h-10 rounded-xl text-sm font-medium transition-colors ${
                                                    isSaving || conflictMessage
                                                        ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                                                        : 'bg-zinc-900 dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-800 text-white dark:text-zinc-100 hover:bg-zinc-800 dark:hover:bg-black'
                                                }`}
                                            >
                                                {isSaving ? '保存中...' : item.isNew ? '添加' : '保存'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => cancelEditing(item)}
                                                className="px-4 h-10 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                            >
                                                取消
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => startEditing(item.id)}
                                            className="px-4 h-10 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                        >
                                            编辑
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => deletePhrase(item)}
                                        className="px-4 h-10 rounded-xl text-sm font-medium border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-black transition-colors"
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}

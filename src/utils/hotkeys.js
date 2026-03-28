const isMac = () => navigator.userAgent.toLowerCase().includes('mac');

export const normalizeModifier = (key) =>
    key.replace('Left', '').replace('Right', '');

export const isModifierKey = (key) =>
    key.includes('Control') ||
    key.includes('Alt') ||
    key.includes('Shift') ||
    key.includes('Meta');

export const formatModifier = (key) => {
    const modifierMap = {
        Control: isMac() ? '⌃' : 'Ctrl',
        Alt: isMac() ? '⌥' : 'Alt',
        Shift: '⇧',
        Meta: isMac() ? '⌘' : 'Win',
    };

    return modifierMap[normalizeModifier(key)] || key;
};

export const getKeyName = (event) => event.code;

export const formatMainKey = (key) => {
    const keyMap = {
        Space: '空格',
        Enter: '↵',
        Tab: 'Tab',
        Escape: 'Esc',
        Backspace: '⌫',
        Delete: 'Del',
    };

    if (keyMap[key]) {
        return keyMap[key];
    }

    return key.replace('Key', '').replace('Digit', '');
};

export const formatPressedKeys = (keys) =>
    keys
        .map((key) =>
            isModifierKey(key) ? formatModifier(normalizeModifier(key)) : formatMainKey(key)
        )
        .join(' + ');

export const getHotkeySignatureFromKeys = (keys) => {
    if (!keys || keys.length === 0) {
        return '';
    }

    const mainKey = keys[keys.length - 1];
    const modifiers = keys
        .slice(0, -1)
        .map(normalizeModifier)
        .sort();

    return `${modifiers.join('+')}|${mainKey}`;
};

export const getHotkeySignatureFromConfig = (hotkey) => {
    if (!hotkey?.key) {
        return '';
    }

    return `${(hotkey.modifiers || []).map(normalizeModifier).sort().join('+')}|${hotkey.key}`;
};

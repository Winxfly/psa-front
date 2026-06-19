const THEME_STORAGE_KEY = 'psa_theme';
const SYSTEM_THEME = 'system';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
const VALID_THEMES = new Set([SYSTEM_THEME, DARK_THEME, LIGHT_THEME]);

const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
let isSystemListenerAttached = false;

function getStoredThemeMode() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return VALID_THEMES.has(storedTheme) ? storedTheme : SYSTEM_THEME;
}

function resolveTheme(mode) {
    if (mode === DARK_THEME || mode === LIGHT_THEME) {
        return mode;
    }

    return colorSchemeQuery.matches ? DARK_THEME : LIGHT_THEME;
}

function handleSystemThemeChange() {
    if (getCurrentThemeMode() === SYSTEM_THEME) {
        applyTheme(SYSTEM_THEME);
    }
}

export function applyTheme(mode) {
    const nextMode = VALID_THEMES.has(mode) ? mode : SYSTEM_THEME;
    const resolvedTheme = resolveTheme(nextMode);

    document.documentElement.dataset.themeMode = nextMode;
    document.documentElement.dataset.theme = resolvedTheme;
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    window.dispatchEvent(new CustomEvent('psa:themechange', {
        detail: { mode: nextMode, theme: resolvedTheme },
    }));

    return resolvedTheme;
}

export function initTheme() {
    if (!isSystemListenerAttached) {
        colorSchemeQuery.addEventListener('change', handleSystemThemeChange);
        isSystemListenerAttached = true;
    }

    return applyTheme(getStoredThemeMode());
}

export function getCurrentTheme() {
    return document.documentElement.dataset.theme || resolveTheme(getCurrentThemeMode());
}

export function getCurrentThemeMode() {
    return document.documentElement.dataset.themeMode || getStoredThemeMode();
}

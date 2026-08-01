// 应用深色主题
export function applyDarkTheme() {
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    const root = document.documentElement;
    root.classList.add('dark');
    root.dataset.theme = 'dark';
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
}

// 应用浅色主题
export function applyLightTheme() {
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    const root = document.documentElement;
    root.classList.remove('dark');
    root.dataset.theme = 'light';
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
}

// 应用主题模式：light 浅色 / auto 跟随系统 / dark 深色
export function applyThemeMode(mode) {
    if (mode === 'dark') {
        applyDarkTheme();
    } else if (mode === 'light') {
        applyLightTheme();
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            applyDarkTheme();
        } else {
            applyLightTheme();
        }
    }
}

// 切换深色/浅色主题（仅当前页面生效，不写入设置）
export function toggleTheme() {
    const dark = document.documentElement.classList.contains('dark');
    if (dark) {
        applyLightTheme();
    } else {
        applyDarkTheme();
    }
}

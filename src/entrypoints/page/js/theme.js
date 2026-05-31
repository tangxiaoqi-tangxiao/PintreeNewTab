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

// 切换深色/浅色主题
export function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        applyLightTheme();
    } else {
        applyDarkTheme();
    }
}

// 首帧主题预应用脚本：在页面渲染前同步读取本地缓存的主题，避免深色用户先看到浅色白屏闪烁。
// 同步读取 localStorage 保证首帧即时应用；异步读取 storage.sync 纠偏（处理首次加载/缓存过期）。
(function () {
    var root = document.documentElement;

    function apply(mode) {
        var prefersDark = false;
        if (mode === 'dark') {
            prefersDark = true;
        } else if (mode === 'light') {
            prefersDark = false;
        } else {
            prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        if (prefersDark) {
            root.classList.add('dark');
            root.dataset.theme = 'dark';
        } else {
            root.classList.remove('dark');
            root.dataset.theme = 'light';
        }
    }

    // 1) 同步：先按 localStorage 缓存应用（无闪烁）
    var cached = null;
    try {
        var stored = localStorage.getItem('ThemeMode');
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
            cached = stored;
        }
    } catch (e) { /* 忽略 localStorage 异常 */ }
    apply(cached || 'auto');

    // 2) 异步：以 storage.sync 为准纠偏，并回写 localStorage 缓存
    var s = (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) ? browser.storage.sync
        : (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) ? chrome.storage.sync : null;
    if (s && s.get) {
        try {
            s.get('ThemeMode', function (data) {
                var mode = data && data.ThemeMode ? data.ThemeMode : 'auto';
                if (mode !== cached) {
                    apply(mode);
                    try { localStorage.setItem('ThemeMode', mode); } catch (e) {}
                }
            });
        } catch (e) { /* 忽略 */ }
    }
})();

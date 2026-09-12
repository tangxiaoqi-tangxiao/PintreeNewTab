import { setFolderIconMode } from "./state.js";
import { reRenderCurrentFolder } from "./bookmarkRender.js";

// 设置右键菜单开关
export function SetCloseContextMenu() {
    const checkbox = document.getElementById('ContextMenuCheckbox');
    browser.storage.sync.get('ContextMenu', (data) => {
        if (data.ContextMenu) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    checkbox.onclick = () => {
        if (checkbox.checked) {
            browser.storage.sync.set({ 'ContextMenu': true }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        } else {
            browser.storage.sync.set({ 'ContextMenu': false }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        }
    }
}

// 设置是否允许书签/文件夹拖拽到侧边栏（默认关闭）
export function SetDragToSidebar() {
    const checkbox = document.getElementById('dragToSidebar');
    browser.storage.sync.get('DragToSidebar', (data) => {
        checkbox.checked = data.DragToSidebar === true;
    });
    checkbox.onclick = () => {
        browser.storage.sync.set({ 'DragToSidebar': checkbox.checked }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
    };
}

// 设置书签是否在新标签页打开
export function SetBookmarkNewTab() {
    const checkbox = document.getElementById('bookmarkNewTab');
    browser.storage.sync.get('BookmarkNewTab', (data) => {
        if (data.BookmarkNewTab) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    checkbox.onclick = () => {
        if (checkbox.checked) {
            browser.storage.sync.set({ 'BookmarkNewTab': true }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        } else {
            browser.storage.sync.set({ 'BookmarkNewTab': false }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        }
    }
}

// 设置文件夹图标显示模式开关
export function SetFolderIconMode() {
    const checkbox = document.getElementById('folderIconMode');
    browser.storage.sync.get('FolderIconMode', (data) => {
        const on = !!data.FolderIconMode;
        setFolderIconMode(on);
        checkbox.checked = on;
        if (on) reRenderCurrentFolder();
    });
    checkbox.onclick = () => {
        const on = checkbox.checked;
        setFolderIconMode(on);
        if (on) {
            browser.storage.sync.set({ 'FolderIconMode': true }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        } else {
            browser.storage.sync.set({ 'FolderIconMode': false }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        }
        reRenderCurrentFolder();
    }
}

// 设置是否缓存图标
export function SetCacheIcon() {
    const checkbox = document.getElementById('CacheIcon');
    browser.storage.sync.get('CacheIcon', (data) => {
        if (data.CacheIcon) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    checkbox.onclick = () => {
        if (checkbox.checked) {
            browser.storage.sync.set({ 'CacheIcon': true }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        } else {
            browser.storage.sync.set({ 'CacheIcon': false }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
        }
    }
}

// 设置文件夹是否默认排在所有书签最前面
export function SetMoveFolderToFront() {
    const checkbox = document.getElementById('moveFolderToFront');
    browser.storage.sync.get('MoveFolderToFront', (data) => {
        checkbox.checked = !!data.MoveFolderToFront;
    });
    checkbox.onclick = () => {
        browser.storage.sync.set({ 'MoveFolderToFront': checkbox.checked }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
    };
}

// 同步主题模式单选按钮选中状态
export function syncThemeModeRadio(mode) {
    document.querySelectorAll('input[name="themeMode"]').forEach((radio) => {
        radio.checked = radio.value === mode;
    });
}

// 写入主题模式（同时写入 storage.sync 与 localStorage 供首帧脚本使用）
function saveThemeMode(mode) {
    browser.storage.sync.set({ ThemeMode: mode }).catch((error) => console.error(`[settings] 保存设置失败:`, error));
    try {
        localStorage.setItem('ThemeMode', mode);
    } catch (e) { /* 忽略 localStorage 异常 */ }
}

// 设置主题模式（浅色 / 自动 / 深色）
export function SetThemeMode(applyThemeMode) {
    const radios = document.querySelectorAll('input[name="themeMode"]');
    browser.storage.sync.get('ThemeMode', (data) => {
        const mode = data.ThemeMode || 'auto';
        syncThemeModeRadio(mode);
        applyThemeMode(mode);
        try {
            localStorage.setItem('ThemeMode', mode);
        } catch (e) { /* 忽略 localStorage 异常 */ }
    });
    radios.forEach((radio) => {
        radio.onclick = () => {
            if (radio.checked) {
                saveThemeMode(radio.value);
                applyThemeMode(radio.value);
            }
        };
    });
}

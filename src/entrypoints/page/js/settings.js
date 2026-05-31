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
            browser.storage.sync.set({ 'ContextMenu': true });
        } else {
            browser.storage.sync.set({ 'ContextMenu': false });
        }
    }
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
            browser.storage.sync.set({ 'BookmarkNewTab': true });
        } else {
            browser.storage.sync.set({ 'BookmarkNewTab': false });
        }
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
            browser.storage.sync.set({ 'CacheIcon': true });
        } else {
            browser.storage.sync.set({ 'CacheIcon': false });
        }
    }
}

import db from "@/entrypoints/page/utils/IndexedDB.js";
import { SetUpStr, IconsStr } from "@/entrypoints/page/config/index.js";
import { firstLayer, setFirstLayer } from "./state.js";
import { GetParentIdElement } from "./sidebar.js";
import { preloadFaviconDefaultData } from "@/entrypoints/page/utils/utils.js";
import { loadIconCache } from "./iconCache.js";

// 将浏览器书签节点转换为结构化数据格式
export function bookmarkToStructuredData(bookmarkNode) {
    const { id, title, dateAdded, children, parentId, index } = bookmarkNode;
    const structuredNode = {
        type: children ? "folder" : "link",
        addDate: dateAdded,
        title: title,
        id: id,
        parentId: parentId,
        index
    };

    if (children) {
        structuredNode.children = children.map(bookmarkToStructuredData);
    } else {
        structuredNode.url = bookmarkNode.url;
    }

    return structuredNode;
}

// 获取浏览器书签树并转换为结构化数据
export async function fetchBookmarks() {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((bookmarks) => {
            const structuredBookmarks = bookmarks[0].children.map(bookmarkToStructuredData);
            resolve(structuredBookmarks);
        });
    });
}

// 删除已不存在的书签对应的缓存图标（每天最多清理一次，避免每次刷新都全量扫描）
export async function DelIconsCache() {
    const LAST_RUN_KEY = 'DelIconsCacheLastRun';
    const INTERVAL = 24 * 60 * 60 * 1000;
    try {
        const last = Number(localStorage.getItem(LAST_RUN_KEY) || 0);
        if (last && Date.now() - last < INTERVAL) {
            return;
        }
    } catch { /* localStorage 不可用时继续执行 */ }

    let datas = await fetchBookmarks();
    let ArrId = [];
    let DelArrId = [];
    const GetArrId = (node) => {
        if (Array.isArray(node)) {
            for (let item of node) {
                GetArrId(item);
            }
        } else {
            ArrId.push(node.id);
            if (node.children && node.children.length > 0) {
                for (let child of node.children) {
                    GetArrId(child);
                }
            }
        }
    }
    GetArrId(datas);
    db.getCursor(IconsStr, (data) => {
        if (!ArrId.includes(data.id)) {
            DelArrId.push(data.id);
        }
    }, () => {
        db.deleteMultipleData(IconsStr, DelArrId).then(() => {
            try {
                localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
            } catch { /* 忽略 localStorage 异常 */ }
        });
    });
}

// 展开默认文件夹（恢复上次活跃文件夹或展开第一个文件夹），返回 Promise 便于调用方等待展开完成后展示页面
export function ExpandDefaultFolder() {
    return db.getData(SetUpStr, "ActiveId").then((value) => {
        if (value) {
            let item = GetParentIdElement(value.data);
            item?.click();
        } else {
            const firstItem = firstLayer[0];
            let item = GetParentIdElement(firstItem.id);
            item?.click();
        }
    });
}

// 移动单个书签到指定索引
function moveBookmarkToIndex(id, parentId, index) {
    return new Promise((resolve) => {
        chrome.bookmarks.move(id, { parentId, index }, () => resolve());
    });
}

// 将某个文件夹内的子文件夹移动到最前面（保持文件夹之间的相对顺序不变，仅在需要时移动）
async function reorderFoldersToFront(node) {
    const children = node.children || [];
    const order = children.map(child => ({ id: child.id, isFolder: child.type === 'folder' }));
    let folderIndex = 0;
    for (let i = 0; i < order.length; i++) {
        if (!order[i].isFolder) continue;
        if (i !== folderIndex) {
            await moveBookmarkToIndex(order[i].id, node.id, folderIndex);
            const [moved] = order.splice(i, 1);
            order.splice(folderIndex, 0, moved);
        }
        folderIndex++;
    }
}

// 递归遍历所有文件夹执行前置排序
async function sortFolderNode(node) {
    if (!node || node.type !== 'folder') return;
    await reorderFoldersToFront(node);
    for (const child of node.children || []) {
        await sortFolderNode(child);
    }
}

// 设置开启时，将浏览器文件夹默认移动到所有书签最前面
export async function MoveFolderToFront() {
    return new Promise((resolve) => {
        browser.storage.sync.get('MoveFolderToFront', (data) => {
            if (!data.MoveFolderToFront) {
                resolve();
                return;
            }
            fetchBookmarks().then(async (roots) => {
                for (const root of roots) {
                    await sortFolderNode(root);
                }
                resolve();
            });
        });
    });
}

// 书签初始化：获取书签数据并渲染导航
export async function BookmarkInitialize(renderNavigation, closeMenuFn) {
    // 一并完成文件夹前置排序与图标缓存预加载（渲染时同步取用图标，避免逐卡片查询 IndexedDB）
    await Promise.all([MoveFolderToFront(), loadIconCache()]);
    // 预加载浏览器默认图标像素数据，加速 favicon 判断，减少加载时的图标闪烁
    preloadFaviconDefaultData();
    fetchBookmarks()
        .then(async data => {
            setFirstLayer(data);
            if (firstLayer.length > 0) {
                renderNavigation(firstLayer, document.getElementById('navigation'), false, [], closeMenuFn);
                // 初始化期间禁用箭头过渡（内联样式优先级最高，展开瞬间到位）
                disableSidebarTransitions();
                // 等待侧边栏默认文件夹展开完成后再隐藏遮罩，避免用户看到展开过程
                await ExpandDefaultFolder();
            }
            hideLoadingOverlay();
            // 首次用户进入/点击侧边栏时才恢复箭头过渡，避免"恢复时播放"产生可见动画
            enableSidebarTransitionsOnInteraction();
        })
        .catch(error => {
            console.error(`${browser.i18n.getMessage("errorLoadingBookmarks")}`, error);
            hideLoadingOverlay();
        });
}

// 初始化期间禁用侧边栏箭头过渡：内联样式 transition:none 优先级高于任何 class，保证生效
function disableSidebarTransitions() {
    document.querySelectorAll('#navigation [class*="transition"]').forEach(el => {
        el.style.transition = 'none';
    });
}

// 首次用户进入/点击侧边栏时清除内联过渡样式，恢复点击时的箭头旋转动画
function enableSidebarTransitionsOnInteraction() {
    const nav = document.getElementById('navigation');
    if (!nav) return;
    const enable = () => {
        document.querySelectorAll('#navigation [class*="transition"]').forEach(el => {
            el.style.transition = '';
        });
        nav.removeEventListener('pointerover', enable);
        nav.removeEventListener('click', enable);
    };
    nav.addEventListener('pointerover', enable);
    nav.addEventListener('click', enable);
}

// 隐藏全屏加载遮罩，让整页内容一次性呈现
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

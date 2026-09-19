import Sortable from 'sortablejs';
import { BookmarkFolderActiveId, firstLayer, BreadcrumbsList } from "./state.js";
import { getFolderLength, reRenderCurrentFolder } from "./bookmarkRender.js";
import { findInTree, deleteFromTree } from "@/entrypoints/page/utils/utils.js";
import { renderNavigation, ExpandSidebarFolder, collectExpandedFolderIds, updateSidebarActiveState } from "./sidebar.js";
import { closeMenu } from "./contextMenu.js";

// 拖拽状态：记录拖拽期间鼠标位置与被拖拽项，用于检测是否悬浮在侧边栏文件夹上
let dragActive = false;
let lastClientX = 0;
let lastClientY = 0;
let currentDragId = null;            // 当前被拖拽书签/文件夹的 id
let currentDragParentId = null;      // 当前被拖拽项所在文件夹 id
let currentDragDescendantIds = [];   // 拖拽文件夹时其所有后代 id（用于防止循环）
let dragIsFolder = false;            // 当前拖拽的是否为文件夹
let highlightedNavItem = null;
let sidebarDragEnabled = false;      // 设置：是否允许拖拽到侧边栏（默认关闭）

// 获取指定坐标下命中的侧边栏文件夹（返回 li 元素，未命中返回 null）
function getSidebarFolderAtPoint(clientX, clientY) {
    if (!dragActive) return null;
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
        // 跳过拖拽克隆体/幽灵元素
        if (el.classList && (el.classList.contains('sortable-ghost') || el.classList.contains('sortable-drag'))) {
            continue;
        }
        const navItem = el.closest('#navigation li');
        if (navItem) {
            return navItem;
        }
    }
    return null;
}

// 在树中查找目标节点的父节点 id（基于 children 归属结构判断，
// 不依赖可能过期的 parentId 字段；顶层节点返回 null）
function findParentIdInTree(node, targetId) {
    const children = Array.isArray(node) ? node : (node.children || []);
    for (const child of children) {
        if (child.id === targetId) {
            return Array.isArray(node) ? null : node.id;
        }
        const found = findParentIdInTree(child, targetId);
        if (found) {
            return found;
        }
    }
    return null;
}

// 收集文件夹节点的所有后代 id（用于防止把文件夹拖进自己的子文件夹）
function collectDescendantIds(node, ids) {
    for (const child of node.children || []) {
        ids.push(child.id);
        if (child.type === 'folder') {
            collectDescendantIds(child, ids);
        }
    }
}

// 判断目标文件夹是否为无效移动目标：
// 书签：其当前所在文件夹不可作为目标；
// 文件夹：自身、所在文件夹（父级）、自身所有后代均不可作为目标；
// 祖父级及以上（向上移动）和其他无关文件夹均允许
function isInvalidTarget(navItem) {
    const link = navItem.querySelector('a');
    if (!link || !currentDragId) return true;
    const targetId = link.dataset.id;
    if (targetId === currentDragParentId) return true;
    if (dragIsFolder && (targetId === currentDragId || currentDragDescendantIds.includes(targetId))) {
        return true;
    }
    return false;
}

// 更新侧边栏文件夹的淡绿色高亮遮罩
function updateSidebarDropHighlight(navItem) {
    if (highlightedNavItem === navItem) return;
    if (highlightedNavItem) {
        highlightedNavItem.classList.remove('sidebar-drop-target');
    }
    highlightedNavItem = navItem;
    if (navItem) {
        navItem.classList.add('sidebar-drop-target');
    }
}

// 拖拽过程中跟踪鼠标位置并更新侧边栏高亮
// 注意：Chrome 等浏览器原生 HTML5 拖拽期间不会派发 mousemove，
// 只会派发 dragover/dragstart/dragend，因此必须监听 dragover 来跟踪位置
function onDragMove(e) {
    if (!dragActive) return;
    const point = e.touches ? e.touches[0] : e;
    if (!point) return;
    lastClientX = point.clientX;
    lastClientY = point.clientY;
    // 设置关闭时不高亮侧边栏文件夹
    if (!sidebarDragEnabled) return;
    const navItem = getSidebarFolderAtPoint(lastClientX, lastClientY);
    updateSidebarDropHighlight(navItem && !isInvalidTarget(navItem) ? navItem : null);
}

// 原生拖拽模式：dragover 跟随鼠标持续触发（mousemove 不会触发）
document.addEventListener('dragover', onDragMove, { passive: true });
// 回退模式（SortableJS 非原生拖拽/触摸）：用 mousemove/touchmove 跟踪
document.addEventListener('mousemove', onDragMove);
document.addEventListener('touchmove', onDragMove, { passive: true });

// 为书签/文件夹列表启用拖拽功能（支持拖拽到侧边栏文件夹实现移动）
// options.folder = true 时：拖拽的是文件夹（网格内可排序，也可拖到侧边栏文件夹，带防循环检查）
export function BookmarkDrag(grid_id, options = {}) {
    const isFolder = !!options.folder;
    const element = document.getElementById(grid_id);
    if (element) {
        new Sortable(element, {
            animation: 150,
            // 书签与文件夹网格均支持网格内排序
            sort: true,
            onStart: function (evt) {
                dragActive = true;
                dragIsFolder = isFolder;
                currentDragId = evt.item.dataset.id || null;
                currentDragParentId = null;
                currentDragDescendantIds = [];
                // 每次拖拽开始时读取"允许拖拽到侧边栏"设置（默认关闭）
                browser.storage.sync.get('DragToSidebar', (data) => {
                    sidebarDragEnabled = data.DragToSidebar === true;
                });
                if (currentDragId) {
                    const node = findInTree(firstLayer, (node) => node.id === currentDragId);
                    if (node) {
                        // 基于树结构推导父文件夹，避免节点上过期的 parentId 字段导致校验失效
                        currentDragParentId = findParentIdInTree(firstLayer, currentDragId) || evt.item.dataset.parentId || null;
                        if (dragIsFolder) {
                            collectDescendantIds(node, currentDragDescendantIds);
                        }
                    } else {
                        currentDragParentId = evt.item.dataset.parentId || null;
                    }
                }
                updateSidebarDropHighlight(null);
            },
            onEnd: function (evt) {
                const draggedId = evt.item.dataset.id;
                // 优先使用原生 drop/dragend 事件自带的落点坐标，否则回退到最后一次跟踪的位置
                const oe = evt.originalEvent;
                const dropX = oe && oe.clientX != null ? oe.clientX : lastClientX;
                const dropY = oe && oe.clientY != null ? oe.clientY : lastClientY;
                // 先检测拖放位置是否命中侧边栏文件夹，再结束拖拽状态
                const targetNavItem = getSidebarFolderAtPoint(dropX, dropY);
                dragActive = false;
                updateSidebarDropHighlight(null);
                highlightedNavItem = null;

                // 拖放到侧边栏文件夹上：将书签/文件夹移动到该文件夹（需设置开启）
                if (sidebarDragEnabled && targetNavItem && !isInvalidTarget(targetNavItem) && draggedId) {
                    const targetFolderId = targetNavItem.querySelector('a').dataset.id;
                    const draggedNode = findInTree(firstLayer, (node) => node.id === draggedId);

                    chrome.bookmarks.move(draggedId, { parentId: targetFolderId }, () => {
                        // 同步更新本地书签树
                        if (draggedNode) {
                            deleteFromTree(firstLayer, (node) => node.id === draggedId);
                            const targetFolder = findInTree(firstLayer, (node) => node.id === targetFolderId);
                            if (targetFolder) {
                                if (!targetFolder.children) {
                                    targetFolder.children = [];
                                }
                                targetFolder.children.push(draggedNode);
                                draggedNode.parentId = targetFolderId;
                            }
                        }
                        // 文件夹移动会改变侧边栏树结构，需要重建导航
                        if (dragIsFolder) {
                            // 重建前记录当前展开状态，重建后恢复，避免展开的文件夹被收起
                            const expandedIds = collectExpandedFolderIds();
                            renderNavigation(firstLayer, document.getElementById('navigation'), false, [], closeMenu);
                            expandedIds.forEach(id => ExpandSidebarFolder(id));
                            // 展开目标文件夹路径，让移动后的文件夹在侧边栏中可见
                            ExpandSidebarFolder(targetFolderId);
                        }
                        // 重新渲染当前文件夹（移除被移走的书签/文件夹）
                        reRenderCurrentFolder();
                    });
                    return;
                }

                // 网格内位置未发生变化（如点击被误判为拖拽）：不移动、也不重建侧边栏，
                // 保证内容区与右侧导航始终一致（内容没进入，导航也不展开）
                if (evt.oldIndex === evt.newIndex) {
                    return;
                }

                // 网格内拖拽排序（书签或文件夹）
                // 基于本地树中父文件夹的真实子节点顺序计算目标索引，
                // 兼容"文件夹未全部前置/穿插"的情况，避免索引错误或越界导致移动不生效
                let targetIndex = null;
                if (BookmarkFolderActiveId && draggedId) {
                    const parentFolder = findInTree(firstLayer, (node) => node.id === BookmarkFolderActiveId);
                    const children = parentFolder && parentFolder.children;
                    if (children) {
                        const oldIndex = children.findIndex((child) => child.id === draggedId);
                        // 从拖拽后的网格 DOM 中读取实际新位置（不依赖 SortableJS 索引语义）
                        const gridEl = evt.item.parentNode;
                        const newGridIndex = gridEl ? Array.from(gridEl.children).indexOf(evt.item) : evt.newIndex;
                        if (oldIndex !== -1 && newGridIndex >= 0) {
                            // 计算移除被拖拽项后的插入位置：使其前方恰好有 newGridIndex 个同类项
                            // （文件夹排序数文件夹、书签排序数书签），另一类保持原位
                            const type = dragIsFolder ? 'folder' : 'link';
                            let insertPos = 0;
                            let typeCount = 0;
                            for (let i = 0; i < children.length; i++) {
                                if (i === oldIndex) continue;
                                if (typeCount === newGridIndex) break;
                                if (children[i].type === type) typeCount++;
                                insertPos++;
                            }
                            // chrome.bookmarks.move 的 index 按"移除前"的子节点位置计算，向下移动需 +1
                            targetIndex = insertPos > oldIndex ? insertPos + 1 : insertPos;
                        }
                    }
                }
                if (targetIndex == null) {
                    // 兜底：仅书签走原 folders-first 公式；文件夹无法计算时放弃移动
                    if (!dragIsFolder) {
                        let newIndex = evt.newIndex;
                        let folderLength = getFolderLength();
                        if (evt.oldIndex < evt.newIndex) {
                            newIndex += 1 + folderLength;
                        } else {
                            newIndex += folderLength;
                        }
                        targetIndex = newIndex;
                    }
                }
                if (BookmarkFolderActiveId && targetIndex != null) {
                    chrome.bookmarks.move(evt.item.dataset.id, {
                        index: targetIndex,
                        parentId: BookmarkFolderActiveId
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.warn('移动书签失败:', chrome.runtime.lastError.message);
                            return;
                        }
                        // 文件夹排序会改变侧边栏树顺序：同步本地树并重建侧边栏（保持展开状态）
                        if (dragIsFolder) {
                            const parentFolder = findInTree(firstLayer, (node) => node.id === BookmarkFolderActiveId);
                            const children = parentFolder && parentFolder.children;
                            if (children) {
                                const idx = children.findIndex((child) => child.id === draggedId);
                                if (idx !== -1) {
                                    const [node] = children.splice(idx, 1);
                                    let ins = targetIndex;
                                    if (ins > idx) ins--;
                                    children.splice(ins, 0, node);
                                }
                            }
                            const expandedIds = collectExpandedFolderIds();
                            renderNavigation(firstLayer, document.getElementById('navigation'), false, [], closeMenu);
                            expandedIds.forEach(id => ExpandSidebarFolder(id));
                            // 重新应用激活路径的选中态（重建后 sidebar-active 会丢失）
                            updateSidebarActiveState(BreadcrumbsList);
                        }
                    });
                }
            }
        });
    }
}

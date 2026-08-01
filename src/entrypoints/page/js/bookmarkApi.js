import db from "@/entrypoints/page/utils/IndexedDB.js";
import { SetUpStr, IconsStr } from "@/entrypoints/page/config/index.js";
import { firstLayer, setFirstLayer } from "./state.js";
import { GetParentIdElement } from "./sidebar.js";

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

// 删除已不存在的书签对应的缓存图标
export async function DelIconsCache() {
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
            console.log("删除缓存成功");
        });
    });
}

// 展开默认文件夹（恢复上次活跃文件夹或展开第一个文件夹）
export function ExpandDefaultFolder() {
    db.getData(SetUpStr, "ActiveId").then((value) => {
        if (value) {
            let item = GetParentIdElement(value.data);
            item.click();
        } else {
            const firstItem = firstLayer[0];
            let item = GetParentIdElement(firstItem.id);
            item.click();
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
    await MoveFolderToFront();
    fetchBookmarks()
        .then(data => {
            document.getElementById('loading-spinner').style.display = 'none';
            setFirstLayer(data);
            if (firstLayer.length > 0) {
                renderNavigation(firstLayer, document.getElementById('navigation'), false, [], closeMenuFn);
                ExpandDefaultFolder();
            }
        })
        .catch(error => {
            console.error(`${browser.i18n.getMessage("errorLoadingBookmarks")}`, error);
            document.getElementById('loading-spinner').style.display = 'none';
        });
}

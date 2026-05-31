import { BOOKMARK_LINK, firstLayer, BookmarkFolderActiveId } from "./state.js";
import { findInTree, deleteFromTree, findParentFolders, fetchFaviconAsBase64 } from "@/entrypoints/page/utils/utils.js";
import { CreateSidebarItem, GetParentIdElement } from "./sidebar.js";
import db from "@/entrypoints/page/utils/IndexedDB.js";
import { IconsStr } from "@/entrypoints/page/config/index.js";

let createCardFn = null;
let showNoResultsMessageFn = null;
let mainContentIsNullFn = null;
let bookmarkIsNullFn = null;
let folderIsNullFn = null;
let initBookmarkEditorFn = null;
let SaveBookmarkFn = null;
let BookmarkEditErrorHideFn = null;
let EmptyBookmarkEditFn = null;
let ToggleSvgOrImageFn = null;

// 设置创建文件夹卡片的回调函数
export function setCreateCard(fn) { createCardFn = fn; }
// 设置显示无结果消息的回调函数
export function setShowNoResultsMessage(fn) { showNoResultsMessageFn = fn; }
// 设置判断主内容是否为空的回调函数
export function setMainContentIsNull(fn) { mainContentIsNullFn = fn; }
// 设置判断书签是否为空的回调函数
export function setBookmarkIsNull(fn) { bookmarkIsNullFn = fn; }
// 设置判断文件夹是否为空的回调函数
export function setFolderIsNull(fn) { folderIsNullFn = fn; }
// 设置初始化书签编辑器的回调函数
export function setInitBookmarkEditor(fn) { initBookmarkEditorFn = fn; }
// 设置保存书签的回调函数
export function setSaveBookmark(fn) { SaveBookmarkFn = fn; }
// 设置隐藏书签编辑错误的回调函数
export function setBookmarkEditErrorHide(fn) { BookmarkEditErrorHideFn = fn; }
// 设置清空书签编辑数据的回调函数
export function setEmptyBookmarkEdit(fn) { EmptyBookmarkEditFn = fn; }
// 设置切换SVG/图片显示的回调函数
export function setToggleSvgOrImage(fn) { ToggleSvgOrImageFn = fn; }

// 读取配置判断是否启用右键菜单，未禁用则显示
export function ContextMenuSet(e, link) {
    e.preventDefault();
    browser.storage.sync.get('ContextMenu', (data) => {
        if (!data.ContextMenu) {
            ContextMenu(e, link);
        }
    });
}

// 书签右键菜单（删除、复制链接、编辑书签）
export function ContextMenu(e, link) {
    let { id, url, title } = link;
    const contextMenu = document.getElementById('context-menu');

    MenuPosition(e, contextMenu);

    {
        document.getElementById("del").onclick = () => {
            if (id == "" || id == "0") {
                return;
            }

            chrome.bookmarks.remove(id, function () {
                deleteFromTree(firstLayer, (node) => {
                    if (node.id === id) {
                        return true;
                    }
                });
                const targetElement = e.target.closest(`.${BOOKMARK_LINK}`);
                if (targetElement) {
                    targetElement.remove();
                    if (mainContentIsNullFn()) {
                        showNoResultsMessageFn();
                    } else if (bookmarkIsNullFn()) {
                        let grid_elem = document.getElementById("grid");
                        let dividingLine_elem = document.getElementById("dividingLine");
                        grid_elem.remove();
                        dividingLine_elem.remove();
                    }
                }
            });
        }
        document.getElementById("copy").onclick = () => {
            copyToClipboard(url);
        }
        document.getElementById("openEditBookmark").onclick = () => {
            if (id == "" || id == "0") {
                return;
            }
            const websiteLink = document.getElementById('websiteLink');
            const websiteName = document.getElementById('websiteName');
            const editBookmark_modal = document.getElementById('editBookmark_modal');
            const editSave = document.getElementById('editSave');
            const localPreviewImage = document.getElementById('localPreviewImage');
            const iconBorder = [...document.getElementsByClassName('iconBorder')];
            const PreviewImage = document.getElementById('PreviewImage');
            const defaultIcon = document.getElementById("defaultIcon");
            const defaultImage = document.getElementById("defaultImage");

            editBookmark_modal.showModal();
            editBookmark_modal.focus();

            db.getData(IconsStr, id).then((data) => {
                if (data) {
                    defaultImage.src = data.base64;
                    defaultIcon.classList.remove("hidden");
                    iconBorder.forEach((item) => {
                        item.classList.remove("border-blue-400");
                    });
                    iconBorder[0].classList.add("border-blue-400");
                } else {
                    defaultIcon.classList.add("hidden");
                    iconBorder.forEach((item) => {
                        item.classList.remove("border-blue-400");
                    });
                    iconBorder[1].classList.add("border-blue-400");
                }
            });
            localPreviewImage.src = "";
            PreviewImage.src = "";
            BookmarkEditErrorHideFn();
            editSave.onclick = () => {
                const targetElement = e.target.closest(`.${BOOKMARK_LINK}`);
                SaveBookmarkFn(id, targetElement);
            }

            websiteLink.value = url;
            websiteName.value = title;

            ToggleSvgOrImageFn(true);
            ToggleSvgOrImageFn(true, true);
            fetchFaviconAsBase64(url)
                .then((data) => {
                    if (data && data.base64) {
                        PreviewImage.src = data.base64;
                        ToggleSvgOrImageFn(false);
                    } else {
                        ToggleSvgOrImageFn(true);
                    }
                });
        }
    }

    contextMenu.oncontextmenu = function (e) {
        e.preventDefault();
    };
}

// 空白处右键菜单（创建书签、创建文件夹）
export function ContextMenuBlank(e) {
    const contextMenu = document.getElementById('context-menu-blank');

    MenuPosition(e, contextMenu);

    {
        document.getElementById("createBookmark").onclick = () => {
            EmptyBookmarkEditFn();
            BookmarkEditErrorHideFn();

            const editBookmark_modal = document.getElementById('editBookmark_modal');
            const editSave = document.getElementById('editSave');
            const defaultImage = document.getElementById("defaultImage");
            const defaultIcon = document.getElementById("defaultIcon");
            const localPreviewImage = document.getElementById('localPreviewImage');
            const PreviewImage = document.getElementById('PreviewImage');
            const iconBorder = [...document.getElementsByClassName('iconBorder')];

            editBookmark_modal.showModal();
            editBookmark_modal.focus();

            defaultIcon.classList.add("hidden");
            defaultImage.src = "";
            localPreviewImage.src = "";
            PreviewImage.src = "";
            iconBorder.forEach((item) => {
                item.classList.remove("border-blue-400");
            });
            iconBorder[1].classList.add("border-blue-400");
            ToggleSvgOrImageFn(true);
            ToggleSvgOrImageFn(true, true);

            editSave.onclick = () => {
                SaveBookmarkFn(0);
            }
        }

        document.getElementById("createFolder").onclick = () => {
            const newFolder_modal = document.getElementById('newFolder_modal');
            const newFolderName = document.getElementById('newFolderName');
            const newFolderNameError = document.getElementById('newFolderNameError');
            const folderSave = document.getElementById('folderSave');

            newFolder_modal.showModal();
            newFolderNameError.classList.add("hidden");
            newFolderName.value = "";

            folderSave.onclick = () => {
                let Name = newFolderName.value;
                if (Name === "") {
                    newFolderNameError.classList.remove("hidden");
                    return;
                }

                if (!BookmarkFolderActiveId) {
                    MessageBoxError("无法找到当前活跃文件夹");
                    return;
                }
                newFolder_modal.close();
                chrome.bookmarks.create({
                    parentId: BookmarkFolderActiveId,
                    title: Name
                }, function (newFolder) {
                    if (ErrorMessageNotification()) {
                        return;
                    }
                    let link = {
                        id: newFolder.id,
                        type: "folder",
                        title: Name,
                        parentId: newFolder.parentId,
                        addDate: newFolder.dateAdded,
                        children: []
                    };
                    findInTree(firstLayer, (node) => {
                        if (node.id === BookmarkFolderActiveId) {
                            node.children.push(link);

                            let newNode = findParentFolders(firstLayer, link.id).slice(0, -1);
                            CreateSidebarItem(link, newNode, closeMenu);

                            const container = document.getElementById('bookmarks');
                            let folderSection = document.getElementById("grid_folders");

                            if (mainContentIsNullFn()) {
                                container.innerHTML = "";
                            }
                            if (folderIsNullFn()) {
                                folderSection = document.createElement('div');
                                folderSection.className = 'grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-12 gap-6';
                                folderSection.id = "grid_folders";
                                folderSection.appendChild(createCardFn(Name, newFolder.id, [], newNode));
                                if (bookmarkIsNullFn()) {
                                    container.appendChild(folderSection);
                                } else {
                                    const dividingLine = document.createElement('hr');
                                    dividingLine.className = 'my-1 border-t-1 border-gray-200 dark:pintree-border-gray-800';
                                    dividingLine.id = "dividingLine";
                                    container.insertBefore(dividingLine, container.firstChild);
                                    container.insertBefore(folderSection, container.firstChild);
                                }
                            } else {
                                folderSection.appendChild(createCardFn(Name, newFolder.id, [], newNode));
                            }
                            return true;
                        }
                    });
                });
            }
        }
    }

    contextMenu.oncontextmenu = function (e) {
        e.preventDefault();
    };
}

// 计算右键菜单位置，防止超出窗口边界
export function MenuPosition(e, element) {
    let IsScrollY = window.innerHeight < document.documentElement.scrollHeight;
    let IsScrollX = window.innerWidth < document.documentElement.scrollWidth;

    element.classList.remove("hidden");

    const menuWidth = element.offsetWidth;
    const menuHeight = element.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let posX = e.clientX + window.scrollX;
    let posY = e.clientY + window.scrollY;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const fixedValue = 25;
    if ((posX + menuWidth) > (windowWidth + scrollX - (IsScrollY ? fixedValue : 0))) {
        posX = windowWidth + scrollX - menuWidth - (IsScrollY ? fixedValue : 10);
    }

    if ((posY + menuHeight) > (windowHeight + scrollY - (IsScrollX ? fixedValue : 0))) {
        posY = windowHeight + scrollY - menuHeight - (IsScrollX ? fixedValue : 10);
    }

    element.style.top = `${posY}px`;
    element.style.left = `${posX}px`;
}

// 关闭所有右键菜单
export function closeMenu(event) {
    const contextMenu = document.getElementById('context-menu');
    const contextMenu2 = document.getElementById('context-menu-blank');
    if (event && event.type === "contextmenu") {
        const targetElement = event.target.closest(`.${BOOKMARK_LINK}`);
        const targetElement2 = event.target.closest(`#main`);
        if (!targetElement) {
            contextMenu.classList.add("hidden");
        }
        if (targetElement) {
            contextMenu2.classList.add("hidden");
        }
        if (!targetElement2) {
            contextMenu2.classList.add("hidden");
        }
    } else {
        contextMenu.classList.add("hidden");
        contextMenu2.classList.add("hidden");
    }
}

// 复制文本到剪贴板
export async function copyToClipboard(text) {
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('无法复制', err);
        }
    } else {
        console.log('浏览器不支持复制到剪贴板');
    }
}

// 显示错误消息提示
function MessageBoxError(value, time = 5000) {
    if (!value) {
        return;
    }
    const message = document.getElementById('message');
    const messageValue = document.getElementById('messageValue');
    message.classList.remove("hidden");
    messageValue.textContent = value;

    setTimeout(() => {
        message.classList.add("hidden");
    }, time);
}

// 检查Chrome书签API是否产生错误并显示通知
function ErrorMessageNotification() {
    let err = chrome.runtime.lastError?.message;
    if (err) {
        switch (err) {
            case "Can't find parent bookmark for id.":
                err = "无法找到当前文件夹，可能已经被删除，尝试刷新页面"
                break;
            default:
                break;
        }
        MessageBoxError(err);
        return true;
    }
    return false;
}

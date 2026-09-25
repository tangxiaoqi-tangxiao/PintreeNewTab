import { BookmarkFolderActiveId, BOOKMARK_LINK, firstLayer } from "./state.js";
import { findInTree, isValidUrl, fetchFavicon, convertBlobToBase64, debounce } from "@/entrypoints/page/utils/utils.js";
import db from "@/entrypoints/page/utils/IndexedDB.js";
import { IconsStr } from "@/entrypoints/page/config/index.js";
import { CreateSidebarItemArrowIcon, GetParentIdElement } from "./sidebar.js";
import { setCachedIcon, deleteCachedIcon } from "./iconCache.js";

let createCardFn = null;
let BookmarkDragFn = null;
let mainContentIsNullFn = null;
let bookmarkIsNullFn = null;
let folderIsNullFn = null;

// 设置创建书签卡片的回调函数
export function setCreateCard(fn) { createCardFn = fn; }
// 设置拖拽排序的回调函数
export function setBookmarkDrag(fn) { BookmarkDragFn = fn; }
// 设置判断主内容是否为空的回调函数
export function setMainContentIsNull(fn) { mainContentIsNullFn = fn; }
// 设置判断书签是否为空的回调函数
export function setBookmarkIsNull(fn) { bookmarkIsNullFn = fn; }
// 设置判断文件夹是否为空的回调函数
export function setFolderIsNull(fn) { folderIsNullFn = fn; }

// 初始化书签编辑器（绑定URL输入、图标选择、图片上传等事件）
export function initBookmarkEditor() {
    const websiteLink = document.getElementById('websiteLink');
    const websiteName = document.getElementById('websiteName');
    const iconBorders = [...document.getElementsByClassName('iconBorder')];
    const imageInput = document.getElementById('imageInput');
    const localPreviewImage = document.getElementById('localPreviewImage');
    const localPreviewSvg = document.getElementById('localPreviewSvg');
    const PreviewImage = document.getElementById('PreviewImage');
    const refreshIcon = document.getElementById("refreshIcon");

    const debouncedSearch = debounce(async (event) => {
        const requestedUrl = event.target.value;
        const isCurrent = () => websiteLink.value === requestedUrl;
        const data = await fetchFavicon(requestedUrl, {
            onTitle: (title) => {
                if (isCurrent() && websiteName.value.trim() === "") {
                    websiteName.value = title;
                }
            },
            onIcon: (base64) => {
                if (!isCurrent()) return;
                PreviewImage.src = base64;
                ToggleSvgOrImage(false);
            },
        });

        if (!isCurrent()) return;
        if (data) {
            if (data.url) {
                PreviewImage.src = data.url;
                ToggleSvgOrImage(false);
            } else {
                ToggleSvgOrImage(true);
            }
        } else {
            ToggleSvgOrImage(true);
        }
    }, 1000);
    websiteLink.oninput = debouncedSearch;

    iconBorders.forEach((item) => {
        item.onclick = () => {
            iconBorders.forEach((Border) => {
                Border.classList.remove('border-main-500');
            });
            item.classList.add('border-main-500');

            if (item.classList.contains('image')) {
                imageInput.click();
            }
        }
    });

    refreshIcon.ondblclick = () => {
        const url = websiteLink.value;
        const isCurrent = () => websiteLink.value === url;
        fetchFavicon(url, {
            onTitle: (title) => {
                if (isCurrent() && websiteName.value.trim() === "") {
                    websiteName.value = title;
                }
            },
            onIcon: (base64) => {
                if (!isCurrent()) return;
                PreviewImage.src = base64;
                ToggleSvgOrImage(false);
            },
        }).then((data) => {
            if (!isCurrent()) return;
            if (data) {
                if (data.url) {
                    PreviewImage.src = data.url;
                    ToggleSvgOrImage(false);
                } else {
                    ToggleSvgOrImage(true);
                }
            } else {
                ToggleSvgOrImage(true);
            }
        });
    }

    imageInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        // 清空以便再次选择同一文件时仍能触发 change
        event.target.value = '';

        if (file) {
            convertBlobToBase64(file)
                .then((data) => {
                    localPreviewImage.src = data;
                    localPreviewImage.classList.remove('hidden');
                    localPreviewSvg.classList.add('hidden');
                });
        }
    });
}

// 切换书签编辑的图标显示（SVG占位图 vs 实际图片）
export function ToggleSvgOrImage(bool, local) {
    if (!local) {
        const PreviewSvg = document.getElementById('PreviewSvg');
        const PreviewImage = document.getElementById('PreviewImage');
        if (bool) {
            PreviewImage.classList.add('hidden');
            PreviewSvg.classList.remove('hidden');
        } else {
            PreviewImage.classList.remove('hidden');
            PreviewSvg.classList.add('hidden')
        }
    } else {
        const localPreviewImage = document.getElementById('localPreviewImage');
        const localPreviewSvg = document.getElementById('localPreviewSvg');
        if (bool) {
            localPreviewImage.classList.add('hidden');
            localPreviewSvg.classList.remove('hidden');
        } else {
            localPreviewImage.classList.remove('hidden');
            localPreviewSvg.classList.add('hidden')
        }
    }
}

// 保存书签（新建或更新）
export function SaveBookmark(id, element) {
    const websiteLink = document.getElementById('websiteLink');
    const websiteLinkError = document.getElementById('websiteLinkError');
    const websiteLinkError2 = document.getElementById('websiteLinkError2');
    const websiteName = document.getElementById('websiteName');
    const websiteNameError = document.getElementById('websiteNameError');
    const PreviewImage = document.getElementById('PreviewImage');
    const PreviewImageError = document.getElementById('PreviewImageError');
    const localPreviewImage = document.getElementById('localPreviewImage');
    const editBookmark_modal = document.getElementById('editBookmark_modal');

    const iconBorder = document.querySelector('.iconBorder.border-main-500');
    const linkValue = websiteLink.value.trim();

    const img = element?.querySelector('img');
    const name = element?.querySelector('h2');
    const linkText = element?.querySelector('p');

    if (linkValue === "") {
        websiteLinkError.classList.remove('hidden');
        websiteLinkError2.classList.add('hidden');
        return;
    } else {
        websiteLinkError.classList.add('hidden');
    }

    if (!isValidUrl(linkValue)) {
        ShowLinkError(websiteLinkError2, "invalidUrl");
        websiteLinkError.classList.add('hidden');
        return;
    } else {
        websiteLinkError2.classList.add('hidden');
    }

    // 重复书签检查：在所有书签中查找相同链接
    let excludeId = null;
    if (id > 0) {
        excludeId = id;
    }
    if (findDuplicateBookmark(linkValue, excludeId)) {
        ShowLinkError(websiteLinkError2, "bookmarkExists");
        return;
    }

    if (websiteName.value === "") {
        websiteNameError.classList.remove('hidden');
        return;
    } else {
        websiteNameError.classList.add('hidden');
    }

    if (localPreviewImage.src === location.href && iconBorder.classList.contains('image')) {
        PreviewImageError.classList.remove('hidden');
        return;
    } else {
        PreviewImageError.classList.add('hidden');
    }

    if (id > 0) {
        chrome.bookmarks.update(id, {
            title: websiteName.value,
            url: linkValue
        }, (updatedBookmark) => {
            if (ErrorMessageNotification()) {
                return;
            }
            findInTree(firstLayer, (node) => {
                if (node.id === id) {
                    node.title = websiteName.value;
                    node.url = linkValue;
                    element.href = linkValue;

                    linkText.textContent = linkValue;
                    name.textContent = websiteName.value;

                    if (iconBorder.classList.contains('image')) {
                        img.src = localPreviewImage.src;
                        if (localPreviewImage.src != location.href) {
                            setCachedIcon(id, localPreviewImage.src);
                            db.getData(IconsStr, id).then((data) => {
                                if (data) {
                                    db.updateData(IconsStr, { base64: localPreviewImage.src, id });
                                } else {
                                    db.addData(IconsStr, { base64: localPreviewImage.src, id });
                                }
                            });
                        }
                    } else if (!iconBorder.classList.contains('default')) {
                        img.src = PreviewImage.src;
                        if (isPersistableIcon(PreviewImage.src)) {
                            setCachedIcon(id, PreviewImage.src);
                            db.getData(IconsStr, id).then((data) => {
                                if (data) {
                                    db.updateData(IconsStr, { base64: PreviewImage.src, id });
                                } else {
                                    db.addData(IconsStr, { base64: PreviewImage.src, id });
                                }
                            });
                        } else {
                            deleteCachedIcon(id);
                            db.deleteData(IconsStr, id);
                        }
                    }
                    return true;
                }
            });
        });
    } else {
        if (!BookmarkFolderActiveId) {
            MessageBoxError("无法找到当前活跃文件夹");
            return;
        }
        chrome.bookmarks.create({
            parentId: BookmarkFolderActiveId,
            title: websiteName.value,
            url: linkValue
        }, (newBookmark) => {
            if (ErrorMessageNotification()) {
                return;
            }
            let link = {
                type: "link",
                id: newBookmark.id,
                url: newBookmark.url,
                title: newBookmark.title,
                icon: `https://logo.clearbit.com/${new URL(newBookmark.url).hostname}`,
                parentId: newBookmark.parentId,
                addDate: newBookmark.dateAdded,
                children: []
            };
            findInTree(firstLayer, (node) => {
                if (node.id === link.parentId) {
                    node.children.push(link);

                    CreateSidebarItemArrowIcon(link.parentId);

                    let imgsrc = null;
                    if (iconBorder.classList.contains('image')) {
                        if (localPreviewImage.src != location.href) {
                            imgsrc = localPreviewImage.src;
                            setCachedIcon(link.id, localPreviewImage.src);
                            db.addData(IconsStr, { base64: localPreviewImage.src, id: link.id });
                        }
                    } else if (!iconBorder.classList.contains('default')) {
                        if (isPersistableIcon(PreviewImage.src)) {
                            imgsrc = PreviewImage.src;
                            setCachedIcon(link.id, PreviewImage.src);
                            db.addData(IconsStr, { base64: PreviewImage.src, id: link.id });
                        }
                    }

                    if (imgsrc) {
                        link.icon = imgsrc;
                    }

                    const grid_element = document.getElementById('grid');
                    if (grid_element) {
                        grid_element.appendChild(createCardFn(link));
                    } else {
                        const container = document.getElementById('bookmarks');

                        if (mainContentIsNullFn()) {
                            container.innerHTML = '';
                        }

                        if (!folderIsNullFn()) {
                            const dividingLine = document.getElementById('dividingLine');
                            if (!dividingLine) {
                                const separator = document.createElement('hr');
                                separator.className = 'my-1 border-t-1 border-gray-200 dark:pintree-border-gray-800';
                                separator.id = "dividingLine";
                                container.appendChild(separator);
                            }
                        }

                        const linkSection = document.createElement('div');
                        linkSection.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-6';
                        linkSection.id = "grid";
                        linkSection.appendChild(createCardFn(link));
                        container.appendChild(linkSection);
                        BookmarkDragFn(linkSection.id);
                    }

                    return true;
                }
            });
        });
    }
    editBookmark_modal.close();
}

// 隐藏书签编辑的所有错误提示
export function BookmarkEditErrorHide() {
    const websiteLinkError = document.getElementById('websiteLinkError');
    const websiteLinkError2 = document.getElementById('websiteLinkError2');
    const websiteNameError = document.getElementById('websiteNameError');
    const PreviewImageError = document.getElementById('PreviewImageError');
    websiteLinkError.classList.add('hidden');
    websiteLinkError2.classList.add('hidden');
    websiteNameError.classList.add('hidden');
    PreviewImageError.classList.add('hidden');
}

// 在链接输入框下方显示错误提示（与无效链接提示同一位置）
function ShowLinkError(element, messageKey) {
    const span = element.querySelector("span");
    if (span) {
        span.textContent = browser.i18n.getMessage(messageKey);
    }
    element.classList.remove("hidden");
}

// 比较两个URL是否相同（忽略首尾空格与末尾斜杠）
function isSameUrl(url1, url2) {
    const normalize = (u) => String(u || "").trim().replace(/\/+$/, "");
    return normalize(url1) === normalize(url2);
}

// 判断图标地址是否需要持久化：chrome-extension（浏览器本地端点）和 blob（会话级地址）
// 都不写入 IndexedDB。渲染时会自动重新获取 chrome-extension 图标。
function isPersistableIcon(src) {
    return Boolean(src)
        && src !== location.href
        && !src.startsWith('chrome-extension://')
        && !src.startsWith('blob:');
}

// 在整棵书签树中查找已存在相同链接的书签（可排除自身，用于编辑场景）
function findDuplicateBookmark(url, excludeId) {
    return findInTree(firstLayer, (node) =>
        node.type === "link" && node.id !== excludeId && isSameUrl(node.url, url)
    );
}

// 清空书签编辑表单的数据
export function EmptyBookmarkEdit() {
    const websiteLink = document.getElementById('websiteLink');
    const websiteName = document.getElementById('websiteName');
    const PreviewImage = document.getElementById('PreviewImage');
    const localPreviewImage = document.getElementById('localPreviewImage');

    websiteLink.value = '';
    websiteName.value = '';
    PreviewImage.src = '';
    localPreviewImage.src = '';
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

import db from "@/entrypoints/page/utils/IndexedDB.js";
import { IconsStr } from "@/entrypoints/page/config/index.js";
import { getFaviconURL } from "@/entrypoints/page/utils/utils.js";
import { BOOKMARK_LINK, BookmarkFolderActiveId } from "./state.js";
import { renderBreadcrumbs } from "./breadcrumb.js";
import { updateSidebarActiveState } from "./sidebar.js";
import { ContextMenuSet } from "./contextMenu.js";
import { BookmarkDrag } from "./drag.js";

import empty_svg from '/images/empty.svg';
import default_svg from '/images/default-icon.svg';

// 创建书签卡片元素
export function createCard(link) {
    const { id, title, url, parentId } = link;

    const a_element = document.createElement('a');
    a_element.className = BOOKMARK_LINK;
    a_element.dataset.id = id;
    a_element.dataset.parentId = parentId;
    a_element.href = url;
    a_element.onclick = function (event) {
        event.preventDefault();
        browser.storage.sync.get('BookmarkNewTab', (data) => {
            if (data.BookmarkNewTab) {
                window.open(this.href, '_blank');
            } else {
                window.open(this.href, '_self');
            }
        });
    };

    const card = document.createElement('div');
    card.className = 'tooltip cursor-pointer flex items-center hover:shadow-sm transition-shadow p-4 bg-white shadow-sm ring-1 ring-gray-900/5 dark:pintree-ring-gray-800 rounded-lg hover:bg-gray-100 dark:pintree-bg-gray-900 dark:hover:pintree-bg-gray-800';
    card.dataset.tip = title;
    card.oncontextmenu = (e) => ContextMenuSet(e, link);

    const cardIcon = document.createElement('img');

    cardIcon.src = empty_svg;
    db.getData(IconsStr, id).then((data) => {
        if (data) {
            cardIcon.src = data.base64;
        } else {
            cardIcon.src = getFaviconURL(cardIcon, url) || default_svg;
        }
    });

    cardIcon.alt = title;
    cardIcon.className = 'w-8 h-8 mr-4 rounded-full flex-shrink-0 card-icon-bg';

    cardIcon.onerror = () => {
        cardIcon.src = default_svg;
    };

    const cardContent = document.createElement('div');
    cardContent.className = 'flex flex-col overflow-hidden';

    const cardTitle = document.createElement('h2');
    cardTitle.className = 'text-left text-sm font-medium mb-1 truncate dark:text-gray-400';
    cardTitle.innerText = title;

    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const cardUrl = document.createElement('p');
    cardUrl.className = 'text-left text-xs text-gray-400 dark:text-gray-600 dark:hover:text-gray-400 truncate';
    cardUrl.innerText = cleanUrl;

    cardContent.appendChild(cardTitle);
    cardContent.appendChild(cardUrl);

    card.appendChild(cardIcon);
    card.appendChild(cardContent);

    a_element.appendChild(card);

    return a_element;
}

// 创建文件夹卡片元素
export function createFolderCard(title, id, children, path) {
    const card = document.createElement('div');
    card.className = 'select-none folder-card text-gray rounded-lg cursor-pointer flex flex-col items-center';
    card.onclick = () => {
        const newPath = path.concat({ id, title, children });
        renderBookmarks(children, newPath);
    };

    const cardIcon = document.createElement('div');
    cardIcon.innerHTML = `
      <svg viewBox="0 0 100 80" class="folder__svg">
        <rect x="0" y="0" width="100" height="80" class="folder__back" />
        <rect x="15" y="8" width="70" height="60" class="paper-1" />
        <rect x="10" y="18" width="80" height="50" class="paper-2" />
        <rect x="0" y="10" width="100" height="70" class="folder__front" />
        <rect x="0" y="10" width="100" height="70" class="folder__front right" />
      </svg>
    `;
    cardIcon.className = 'mb-2';

    const cardTitle = document.createElement('h2');
    cardTitle.className = 'text-xs font-normal text-center w-full truncate dark:text-gray-400';
    cardTitle.innerText = title;

    card.appendChild(cardIcon);
    card.appendChild(cardTitle);

    return card;
}

// 显示未找到搜索结果的提示消息
export function showNoResultsMessage() {
    const container = document.getElementById('bookmarks');
    container.innerHTML = '';

    const messageContainer = document.createElement('div');
    messageContainer.className = 'flex flex-col items-center justify-center h-full';
    messageContainer.id = "promptMessage";

    const icon = document.createElement('svg');
    icon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    icon.setAttribute('class', 'h-16 w-16 text-gray-500');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('stroke', 'currentColor');
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />';

    const title = document.createElement('h2');
    title.className = 'text-gray-500 text-xl font-semibold mt-4';
    title.textContent = browser.i18n.getMessage("nope");

    const message = document.createElement('p');
    message.className = 'text-gray-500 mt-2';
    message.textContent = browser.i18n.getMessage("searchTips");

    messageContainer.appendChild(icon);
    messageContainer.appendChild(title);
    messageContainer.appendChild(message);

    container.appendChild(messageContainer);
}

// 渲染书签列表（文件夹和链接）
export function renderBookmarks(data, path) {
    const container = document.getElementById('bookmarks');
    container.innerHTML = '';

    renderBreadcrumbs(path);

    const folders = data.filter(item => item.type === 'folder');
    const links = data.filter(item => item.type === 'link');

    updateSidebarActiveState(path);

    if (folders.length === 0 && links.length === 0) {
        showNoResultsMessage();
        return;
    }

    if (folders.length > 0) {
        const folderSection = document.createElement('div');
        folderSection.className = 'grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-12 gap-6';
        folderSection.id = "grid_folders";

        folders.forEach(folder => {
            const card = createFolderCard(folder.title, folder.id, folder.children, path);
            folderSection.appendChild(card);
        });
        container.appendChild(folderSection);
    }

    if (folders.length > 0 && links.length > 0) {
        const separator = document.createElement('hr');
        separator.className = 'my-1 border-t-1 border-gray-200 dark:pintree-border-gray-800';
        separator.id = "dividingLine";
        container.appendChild(separator);
    }

    if (links.length > 0) {
        const linkSection = document.createElement('div');
        linkSection.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-6';
        linkSection.id = "grid";
        links.forEach(link => {
            const card = createCard(link);
            linkSection.appendChild(card);
        });
        container.appendChild(linkSection);
    }

    if (BookmarkFolderActiveId) {
        BookmarkDrag("grid");
    }
}

// 判断主内容区域是否为空（无书签且无文件夹）
export function mainContentIsNull() {
    let bookmarkList = document.querySelectorAll("#grid > a").length;
    let folderList = document.querySelectorAll("#grid_folders > div").length;
    return !((bookmarkList + folderList) > 0);
}

// 判断书签是否为空
export function bookmarkIsNull() {
    let bookmarkList = document.querySelectorAll("#grid > a").length;
    return !((bookmarkList) > 0);
}

// 判断文件夹是否为空
export function folderIsNull() {
    let folderList = document.querySelectorAll("#grid_folders > div").length;
    return !(folderList > 0);
}

// 获取文件夹数量
export function getFolderLength() {
    return document.querySelectorAll("#grid_folders > div").length;
}

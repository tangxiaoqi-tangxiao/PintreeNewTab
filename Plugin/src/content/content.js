import {convertBlobToBase64, debounce, deleteFromTree, fetchFaviconAsBase64, findInTree} from "../utils/utils.js";
import db from "../utils/IndexedDB.js";
import "../lib/Sortable.min.js";

//全局变量
let firstLayer = null;//书签集合
let BookmarkFolderActiveId = null;//当前活跃的文件夹id

//常量
const bookmark_link = "bookmark-link";

document.addEventListener('DOMContentLoaded', () => {
    Initialize();
    //国际化
    i18n();
    //设置关闭右键菜单
    CloseContextMenu();
    //设置打开新标签页
    SetBookmarkNewTab();
    //编辑书签的初始化
    BookmarkEditInitialize();
    //数据库初始化
    db.openDB('Icons').then(async () => {
        //初始化书签
        BookmarkInitialize();
        //删除已经删除书签的缓存图标
        DelIconsCache();
    });
    // fetchFaviconAsBase64("https://registry.hub.docker.com/")
});

//将浏览器书签节点转换为结构化数据格式
function bookmarkToStructuredData(bookmarkNode) {
    const {id, title, dateAdded, children, parentId} = bookmarkNode;
    const structuredNode = {
        type: children ? "folder" : "link",
        addDate: dateAdded,
        title: title,
        id: id,
        parentId: parentId
    };

    if (children) {
        structuredNode.children = children.map(bookmarkToStructuredData);
    } else {
        structuredNode.icon = `https://logo.clearbit.com/${new URL(bookmarkNode.url).hostname}`;
        structuredNode.url = bookmarkNode.url;
    }

    return structuredNode;
}

async function fetchBookmarks() {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((bookmarks) => {
            const structuredBookmarks = bookmarks[0].children.map(bookmarkToStructuredData);
            resolve(structuredBookmarks);
        });
        // fetch('json/pintree.json')
        //     .then(response => response.json())
        //     .then((data) => {
        //         resolve(data);
        //     });
    });
}

// document.addEventListener('DOMContentLoaded', () => {
//     // Variables for sidebar elements
//     const openSidebarButton = document.getElementById('open-sidebar-button');
//     const closeSidebarButton = document.getElementById('close-sidebar-button');
//     const offCanvasMenu = document.getElementById('off-canvas-menu');
//     const offCanvasBackdrop = document.getElementById('off-canvas-backdrop');
//     const offCanvasContent = document.getElementById('off-canvas-content');

//     // Function to open the sidebar
//     const openSidebar = () => {
//         offCanvasMenu.classList.remove('hidden');
//         setTimeout(() => {
//             offCanvasBackdrop.classList.add('opacity-100');
//             offCanvasContent.classList.add('translate-x-0');
//         }, 10);
//     };

//     // Function to close the sidebar
//     const closeSidebar = () => {
//         offCanvasBackdrop.classList.remove('opacity-100');
//         offCanvasContent.classList.remove('translate-x-0');
//         setTimeout(() => {
//             offCanvasMenu.classList.add('hidden');
//         }, 300); // Match the duration of the transition
//     };

//     // Event listeners for open and close buttons
//     openSidebarButton?.addEventListener('click', openSidebar);
//     closeSidebarButton.addEventListener('click', closeSidebar);
//     offCanvasBackdrop.addEventListener('click', closeSidebar); // Close sidebar when clicking on the backdrop
// });

// Search functionality
// function searchBookmarks(query) {
//     fetchBookmarks()
//         .then(data => {
//             const results = searchInData(data, query.toLowerCase());
//             renderBookmarks(results, [{ title: chrome.i18n.getMessage("searchResults"), children: results }]);
//         })
//         .catch(error => console.error(`${chrome.i18n.getMessage("errorSearchBookmark")}:`, error));
// }

function searchInData(data, query) {
    let results = [];
    data.forEach(item => {
        if (item.title.toLowerCase().includes(query)) {
            results.push(item);
        }
        if (item.children) {
            const childResults = searchInData(item.children, query);
            if (childResults.length > 0) {
                results = results.concat(childResults);
            }
        }
    });
    return results;
}

// 清除搜索结果并重置UI
function clearSearchResults() {
    // fetchBookmarks()
    //     .then(data => {
    //         const secondLayer = data;
    //         if (secondLayer.length > 0) {
    //             const item = secondLayer[0];
    //             renderNavigation(secondLayer, document.getElementById('navigation'));
    //             renderBookmarks(secondLayer, [{id: item.id, title: item.title, children: secondLayer}]);
    //         }
    //         document.getElementById('searchInput').value = '';
    //         document.getElementById('clearSearchButton').classList.add('hidden');
    //     })
    //     .catch(error => console.error(`${chrome.i18n.getMessage("errorSearch")}:`, error));

    // 自动选择并显示第一项
    if (firstLayer.length > 0) {
        const firstItem = firstLayer[0];
        // 使用第一层数据渲染导航
        renderNavigation(firstLayer, document.getElementById('navigation'), true);
        //渲染书签
        renderBookmarks(firstItem.children, [{id: firstItem.id, title: firstItem.title, children: firstItem.children}]);
        document.getElementById('searchInput').value = '';
        document.getElementById('clearSearchButton').classList.add('hidden');
    }
}

// 搜索书签
function searchBookmarks(query) {
    BookmarkFolderActiveId = null;
    fetchBookmarks()
        .then(data => {
            const results = searchInData(data, query.toLowerCase());
            renderBookmarks(results, [{id: "0", title: chrome.i18n.getMessage("searchResults"), children: results}]);
            document.getElementById('clearSearchButton').classList.remove('hidden');
        })
        .catch(error => console.error(`${chrome.i18n.getMessage("errorSearchBookmark")}:`, error));
}

// 创建书签卡元素
function createCard(link) {
    const {id, title, url, icon, parentId} = link;

    const a_element = document.createElement('a');
    a_element.className = bookmark_link;
    a_element.dataset.id = id;
    a_element.dataset.parentId = parentId;
    a_element.href = url;
    a_element.onclick = function (event) {
        // 阻止a标签默认行为
        event.preventDefault();
        chrome.storage.sync.get('BookmarkNewTab', (data) => {
            if (data.BookmarkNewTab) {
                window.open(this.href, '_blank');
            } else {
                window.open(this.href, '_self');
            }
        });
    };

    const card = document.createElement('div');
    card.className = 'cursor-pointer flex items-center hover:shadow-sm transition-shadow p-4 bg-white shadow-sm ring-1 ring-gray-900/5 dark:pintree-ring-gray-800 rounded-lg hover:bg-gray-100 dark:pintree-bg-gray-900 dark:hover:pintree-bg-gray-800';
    // card.onclick = () => window.open(url, '_blank'); // Make the whole card clickable
    card.oncontextmenu = (e) => ContextMenuSet(e, link);

    const cardIcon = document.createElement('img');

    cardIcon.src = new URL("../assets/empty.svg", import.meta.url).toString();
    db.getData("Icons", id).then((data) => {
        if (data) {
            cardIcon.src = data.base64;
        } else {
            cardIcon.src = icon || new URL(
                '../assets/default-icon.svg',
                import.meta.url
            ); // Use provided icon or default icon
        }
    });

    cardIcon.alt = title;
    cardIcon.className = 'w-8 h-8 mr-4 rounded-full flex-shrink-0 card-icon-bg'; // Smaller size and rounded

    // Check if the image URL returns 404 and replace it with the default icon if it does
    cardIcon.onerror = () => {
        cardIcon.src = new URL(
            '../assets/default-icon.svg',
            import.meta.url
        );
    };

    const cardContent = document.createElement('div');
    cardContent.className = 'flex flex-col overflow-hidden'; // Ensure the content is hidden if too long

    const cardTitle = document.createElement('h2');
    cardTitle.className = 'text-sm font-medium mb-1 truncate dark:text-gray-400';
    cardTitle.innerText = title;

    // Clean URL by removing http(s) and trailing slash
    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const cardUrl = document.createElement('p');
    cardUrl.className = 'text-xs text-gray-400 dark:text-gray-600 dark:hover:text-gray-400 truncate';
    cardUrl.innerText = cleanUrl; // Use cleaned URL

    cardContent.appendChild(cardTitle);
    cardContent.appendChild(cardUrl); // Add URL paragraph

    card.appendChild(cardIcon);
    card.appendChild(cardContent);

    a_element.appendChild(card);

    return a_element;
}

// 创建文件夹卡片元素
function createFolderCard(title, id, children, path) {
    const card = document.createElement('div');
    card.className = 'select-none folder-card text-gray rounded-lg cursor-pointer flex flex-col items-center';
    card.onclick = () => {
        const newPath = path.concat({id, title, children});
        renderBookmarks(children, newPath);
        updateSidebarActiveState(newPath); // Update sidebar active state
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

// 渲染侧边栏导航
function renderNavigation(folders, container, isFirstRender = false, path = []) {
    container.innerHTML = ''; // Clear previous content
    folders.forEach((folder, index) => {
        if (folder.type === 'folder') {
            const navItem = document.createElement('li');
            navItem.className = 'items-center group flex justify-between gap-x-3 rounded-md p-2 text-gray-700 dark:text-gray-400 hover:text-main-500 hover:bg-gray-50 dark:hover:pintree-bg-gray-800 bg-opacity-50';

            const navLinkContainer = document.createElement('div');
            navLinkContainer.className = 'flex items-center space-x-2 truncate';

            const folderIcon = document.createElement('span');
            folderIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>';

            const navLink = document.createElement('a');
            navLink.className = 'flex text-sm leading-6 font-semibold dark:text-gray-400';
            navLink.innerText = folder.title;
            navLink.dataset.id = folder.id;

            navLinkContainer.appendChild(folderIcon);
            navLinkContainer.appendChild(navLink);

            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'ml-2 transform transition-transform';
            toggleIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>';

            navItem.appendChild(navLinkContainer);
            if (folder.children && folder.children.length > 0) {
                navItem.appendChild(toggleIcon);
            }
            container.appendChild(navItem);

            if (folder.children && folder.children.length > 0) {
                const subList = document.createElement('ul');
                subList.className = 'ml-4 space-y-2 hidden';
                renderNavigation(folder.children, subList, false, path.concat({
                    id: folder.id,
                    title: folder.title,
                    children: folder.children
                }));
                container.appendChild(subList);

                if (isFirstRender && index === 0) {
                    // 在初始渲染时展开第一个项目
                    subList.classList.remove('hidden');
                    if (subList.children.length > 0) {
                        toggleIcon.classList.toggle('rotate-90');
                    }
                }

                navItem.onclick = (e) => {
                    closeMenu();//关闭右键菜单
                    e.stopPropagation();
                    document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));
                    navItem.classList.add('sidebar-active');

                    //更新当前活跃书签文件夹id
                    BookmarkFolderActiveId = folder.id;

                    if (subList.children.length > 0) {
                        subList.classList.toggle('hidden');
                        toggleIcon.classList.toggle('rotate-90');
                    }
                    renderBookmarks(folder.children, path.concat({
                        id: folder.id,
                        title: folder.title,
                        children: folder.children
                    }));
                };
            } else {
                navItem.onclick = (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));
                    navItem.classList.add('sidebar-active');

                    //更新当前活跃书签文件夹id
                    BookmarkFolderActiveId = folder.id;

                    renderBookmarks(folder.children, path.concat({
                        id: folder.id,
                        title: folder.title,
                        children: folder.children
                    }));
                };
            }
        }
    });
}

// 为导航渲染面包屑
function renderBreadcrumbs(path) {
    const breadcrumbsPath = document.getElementById('breadcrumbs-path');
    breadcrumbsPath.innerHTML = ''; // Clear previous breadcrumbs

    path.forEach((item, index) => {
        const li_element = document.createElement('li');
        if (index === path.length - 1) {//当前所在位置不需要单击事件
            const span_element = document.createElement('span');
            span_element.className = "inline-flex items-center gap-2";
            span_element.textContent = item.title;
            li_element.appendChild(span_element);
        } else {
            const a_element = document.createElement('a');
            a_element.innerHTML = `<svg
              xmlns = "http://www.w3.org/2000/svg"
              fill = "none"
              viewBox = "0 0 24 24"
              class= "h-4 w-4 stroke-current mr-2" >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg >${item.title}`;
            a_element.onclick = () => {
                // Render bookmarks for the selected breadcrumb
                const newPath = path.slice(0, index + 1);
                //渲染书签
                renderBookmarks(item.children, newPath);
                // updateSidebarActiveState(newPath); //更新侧边栏活动状态
                document.getElementById('clearSearchButton').classList.add('hidden'); // Hide clear button when navigating through breadcrumbs
            };
            li_element.appendChild(a_element);
        }
        breadcrumbsPath.appendChild(li_element);
    });
}

// 更新侧边栏项的活动状态
function updateSidebarActiveState(path) {
    document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));

    let currentNav = document.getElementById('navigation');

    let ActiveId = null;

    // 遍历路径，找到对应的导航项并设置为活动状态
    path.forEach((item, index) => {
        const items = currentNav.querySelectorAll('li');
        items.forEach(navItem => {
            const navLink = navItem.querySelector('a');
            if (navLink && navLink.dataset.id === item.id) {
                if (index === path.length - 1) {
                    navItem.classList.add('sidebar-active');
                    ActiveId = item.id;
                }

                if (index < path.length - 1) {
                    const subList = navItem.querySelector('ul');
                    if (subList) {
                        subList.classList.remove('hidden');
                        currentNav = subList;
                    }
                }
            }
        });
    });

    //将当前活跃的书签文件夹id保存到全局变量中
    BookmarkFolderActiveId = ActiveId;
    if (ActiveId) {
        ExpandActiveFolder();
    }
}

// 未找到搜索结果时显示消息
function showNoResultsMessage() {
    const container = document.getElementById('bookmarks');
    container.innerHTML = ''; // Clear previous content

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
    title.textContent = chrome.i18n.getMessage("nope");

    const message = document.createElement('p');
    message.className = 'text-gray-500 mt-2';
    message.textContent = chrome.i18n.getMessage("searchTips");


    messageContainer.appendChild(icon);
    messageContainer.appendChild(title);
    messageContainer.appendChild(message);

    container.appendChild(messageContainer);
}

// 渲染书签
function renderBookmarks(data, path) {
    const container = document.getElementById('bookmarks');
    container.innerHTML = ''; // Clear previous content

    //渲染面包屑
    renderBreadcrumbs(path);

    // 单独的文件夹和链接
    const folders = data.filter(item => item.type === 'folder');
    // const links = data.filter(item => item.type === 'link').sort((a, b) => b.addDate - a.addDate);
    const links = data.filter(item => item.type === 'link');

    // 如果没有文件夹和链接，显示未找到搜索结果的消息
    if (folders.length === 0 && links.length === 0) {
        showNoResultsMessage();
        return;
    }

    // 创建文件夹部分
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

    // 如果有链接，请添加分隔线
    if (folders.length > 0 && links.length > 0) {
        const separator = document.createElement('hr');
        separator.className = 'my-1 border-t-1 border-gray-200 dark:pintree-border-gray-800';
        separator.id = "dividingLine";
        container.appendChild(separator);
    }

    // 创建链接部分
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
    // 更新侧边栏活动状态
    updateSidebarActiveState(path);
    //书签拖拽
    if (BookmarkFolderActiveId) {
        BookmarkDrag("grid");
    }
}

// 获取和渲染数据
// fetchBookmarks()
//     .then(data => {
//         // 直接使用第一层数据
//         const firstLayer = data;
//         // 使用第一层数据渲染导航
//         renderNavigation(firstLayer, document.getElementById('navigation'), true);
//         // 使用第一层数据渲染书签，从书签开始
//         renderBookmarks(firstLayer, [{ title: 'Bookmark', children: firstLayer }]);

//         // 自动选择并显示第一项
//         if (firstLayer.length > 0) {
//             const firstItem = firstLayer[0];
//             updateSidebarActiveState([{ title: firstItem.title, children: firstItem.children }]);
//             renderBookmarks(firstItem.children, [{ title: 'Bookmark', children: firstLayer }, { title: firstItem.title, children: firstItem.children }]);
//         }
//     })
//     .catch(error => console.error(`${chrome.i18n.getMessage("errorLoadingBookmarks")}`, error));

// 应用深色主题
function applyDarkTheme() {
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    const root = document.documentElement;
    root.classList.add('dark');
    root.dataset.theme = 'dark';
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
}

// 应用浅色主题
function applyLightTheme() {
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    const root = document.documentElement;
    root.classList.remove('dark');
    root.dataset.theme = 'light';
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
}

// Toggle theme between dark and light
function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        applyLightTheme();
    } else {
        applyDarkTheme();
    }
}

// 初始化书签
function BookmarkInitialize() {
    // 获取和渲染数据
    fetchBookmarks()
        .then(data => {
            // 隐藏加载状态
            document.getElementById('loading-spinner').style.display = 'none';
            // 直接使用第一层数据
            firstLayer = data;
            // 自动选择并显示第一项
            if (firstLayer.length > 0) {
                const firstItem = firstLayer[0];
                // console.log([{id: firstItem.id, title: firstItem.title, children: firstLayer}]);
                // 使用第一层数据渲染导航
                renderNavigation(firstLayer, document.getElementById('navigation'), true);
                // // 使用第一层数据渲染书签，从书签开始
                // renderBookmarks(firstLayer, [{id: firstItem.id, title: firstItem.title, children: firstLayer}]);
                // //更新侧边栏项的活动状态
                // updateSidebarActiveState([{id: firstItem.id, title: firstItem.title, children: firstItem.children}]);
                //渲染书签
                renderBookmarks(firstItem.children, [{
                    id: firstItem.id,
                    title: firstItem.title,
                    children: firstItem.children
                }]);
            }
        })
        .catch(error => {
            console.error(`${chrome.i18n.getMessage("errorLoadingBookmarks")}`, error);
            // 隐藏加载状态
            document.getElementById('loading-spinner').style.display = 'none';
        });
}

//设置右键菜单
function CloseContextMenu() {
    const checkbox = document.getElementById('ContextMenuCheckbox');
    chrome.storage.sync.get('ContextMenu', (data) => {
        if (data.ContextMenu) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    checkbox.onclick = () => {
        if (checkbox.checked) {
            chrome.storage.sync.set({'ContextMenu': true});
        } else {
            chrome.storage.sync.set({'ContextMenu': false});
        }
    }
}

//设置打开新标签页
function SetBookmarkNewTab() {
    const checkbox = document.getElementById('bookmarkNewTab');
    chrome.storage.sync.get('BookmarkNewTab', (data) => {
        if (data.BookmarkNewTab) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    checkbox.onclick = () => {
        if (checkbox.checked) {
            chrome.storage.sync.set({'BookmarkNewTab': true});
        } else {
            chrome.storage.sync.set({'BookmarkNewTab': false});
        }
    }
}

// i18n 多语言国际化
function i18n() {
    let appName_i18ns = [...document.getElementsByClassName("appName_i18n")];
    appName_i18ns.forEach((item) => {
        item.textContent = chrome.i18n.getMessage("appName");
    });
    //搜索
    searchInput.setAttribute("placeholder", chrome.i18n.getMessage("search"));
    clear_i18n.textContent = chrome.i18n.getMessage("clear");
    //设置
    set_i18n.textContent = chrome.i18n.getMessage("set");
    setContextMenu_i18n.textContent = chrome.i18n.getMessage("setContextMenu");
    setOpenNewTab_i18n.textContent = chrome.i18n.getMessage("setOpenNewTab");
    //书签
    bookmark_i18n.textContent = chrome.i18n.getMessage("bookmark");
    baidu_i18n.textContent = chrome.i18n.getMessage("baidu");
    google_i18n.textContent = chrome.i18n.getMessage("google");
    bing_i18n.textContent = chrome.i18n.getMessage("bing");
    //右键菜单
    copyUrl_i18n.textContent = chrome.i18n.getMessage("copyUrl");
    editBookmark_i18n.textContent = chrome.i18n.getMessage("editBookmark");
    del_i18n.textContent = chrome.i18n.getMessage("del");
    bookmarkAdd_i18n.textContent = chrome.i18n.getMessage("bookmarkAdd");
    //书签编辑
    infoEdit_i18n.textContent = chrome.i18n.getMessage("infoEdit");
    IconDescribe_i18n.textContent = chrome.i18n.getMessage("IconDescribe");
    websiteLink_i18n.textContent = chrome.i18n.getMessage("websiteLink");
    websiteLink.setAttribute("placeholder", chrome.i18n.getMessage("websiteLinkPlaceholder"));
    websiteLinkError_i18n.textContent = chrome.i18n.getMessage("websiteLinkError");
    websiteName_i18n.textContent = chrome.i18n.getMessage("websiteName");
    websiteName.setAttribute("placeholder", chrome.i18n.getMessage("websiteNamePlaceholder"));
    websiteNameError_i18n.textContent = chrome.i18n.getMessage("websiteNameError");
    iconEdit_i18n.textContent = chrome.i18n.getMessage("iconEdit");
    iconChoose_i18n.textContent = chrome.i18n.getMessage("iconChoose");
    default_i18n.textContent = chrome.i18n.getMessage("default");
    official_i18n.textContent = chrome.i18n.getMessage("official");
    upload_i18n.textContent = chrome.i18n.getMessage("upload");
    uploadImage_i18n.textContent = chrome.i18n.getMessage("uploadImage");
    save_i18n.textContent = chrome.i18n.getMessage("save");
    cancel_i18n.textContent = chrome.i18n.getMessage("cancel");

    // document.getElementById("closeSidebar_i18n").textContent = chrome.i18n.getMessage("closeSidebar");
}

//读取配置判断是否显示右键菜单
function ContextMenuSet(e, link) {
    e.preventDefault();//阻止默认菜单显示
    // e.stopPropagation();//阻止事件冒泡
    chrome.storage.sync.get('ContextMenu', (data) => {
        if (!data.ContextMenu) {
            ContextMenu(e, link);
        }
    });
}

//右键菜单
function ContextMenu(e, link) {
    let {id, url, title} = link;
    const contextMenu = document.getElementById('context-menu');

    // 右键菜单逻辑
    MenuPosition(e, contextMenu);

    //菜单事件
    {
        //删除书签
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
                //删除书签后移除元素
                const targetElement = e.target.closest(`.${bookmark_link}`);
                if (targetElement) {
                    targetElement.remove();
                    if (mainContentIsNull()) {
                        //如果主内容为空，则显示提示消息
                        showNoResultsMessage();
                    } else if (bookmarkIsNull()) {
                        //如果书签为空删除分割线
                        let grid_elem = document.getElementById("grid");
                        let dividingLine_elem = document.getElementById("dividingLine");
                        grid_elem.remove();
                        dividingLine_elem.remove();
                    }
                }
            });
        }
        //复制书签链接
        document.getElementById("copy").onclick = () => {
            copyToClipboard(url);
        }
        //编辑书签
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
            // const refreshIcon = document.getElementById("refreshIcon");
            const defaultIcon = document.getElementById("defaultIcon");
            const defaultImage = document.getElementById("defaultImage");

            // 显示编辑书签模态框
            editBookmark_modal.showModal();
            editBookmark_modal.focus();//设置为焦点，用于阻止UI库模态窗口将第一个可交互元素设置为焦点

            db.getData("Icons", id).then((data) => {
                if (data) {
                    defaultImage.src = data.base64;
                    defaultIcon.classList.remove("hidden");
                    iconBorder.forEach((item) => {
                        item.classList.remove("border-blue-400");
                    });
                    iconBorder[0].classList.add("border-blue-400");
                } else {
                    defaultIcon.classList.add("hidden");
                    //默认官方图标选中
                    iconBorder.forEach((item) => {
                        item.classList.remove("border-blue-400");
                    });
                    iconBorder[1].classList.add("border-blue-400");
                }
            });
            //删除本地上传图片
            localPreviewImage.src = "";
            //删除网络图片
            PreviewImage.src = "";
            //隐藏所有错误信息
            BookmarkEditErrorHide();
            //保存按钮点击事件
            editSave.onclick = () => {
                const targetElement = e.target.closest(`.${bookmark_link}`);
                SaveBookmark(id, targetElement);
            }

            //赋值
            websiteLink.value = url;
            websiteName.value = title;

            ToggleSvgOrImage(true);
            ToggleSvgOrImage(true, true);
            //更新图标
            fetchFaviconAsBase64(url)
                .then((data) => {
                    if (data && data.base64) {
                        PreviewImage.src = data.base64;
                        ToggleSvgOrImage(false);
                    } else {
                        ToggleSvgOrImage(true);
                    }
                });
        }
    }

    contextMenu.oncontextmenu = function (e) {
        e.preventDefault();
    };
}

//空白处右键菜单
function ContextMenuBlank(e) {
    const contextMenu = document.getElementById('context-menu-blank');

    // 右键菜单逻辑
    MenuPosition(e, contextMenu);

    //菜单事件
    {
        document.getElementById("createBookmark").onclick = () => {
            EmptyBookmarkEdit();
            BookmarkEditErrorHide();

            const editBookmark_modal = document.getElementById('editBookmark_modal');
            const defaultImage = document.getElementById("defaultImage");
            const defaultIcon = document.getElementById("defaultIcon");
            const localPreviewImage = document.getElementById('localPreviewImage');
            const PreviewImage = document.getElementById('PreviewImage');
            const iconBorder = [...document.getElementsByClassName('iconBorder')];

            // 显示编辑书签模态框
            editBookmark_modal.showModal();
            editBookmark_modal.focus();//设置为焦点，用于阻止UI库模态窗口将第一个可交互元素设置为焦点

            //隐藏默认icon
            defaultIcon.classList.add("hidden");
            defaultImage.src = "";
            //删除本地上传图片
            localPreviewImage.src = "";
            //删除网络图片
            PreviewImage.src = "";
            //重置选中状态
            iconBorder.forEach((item) => {
                item.classList.remove("border-blue-400");
            });
            iconBorder[1].classList.add("border-blue-400");
            //显示默认svg
            ToggleSvgOrImage(true);
            ToggleSvgOrImage(true, true);

            //保存按钮点击事件
            editSave.onclick = () => {
                SaveBookmark(0);
            }
        }
    }

    contextMenu.oncontextmenu = function (e) {
        e.preventDefault();
    };
}

// 右键菜单逻辑
function MenuPosition(e, element) {
    let IsScrollY = window.innerHeight < document.documentElement.scrollHeight;
    let IsScrollX = window.innerWidth < document.documentElement.scrollWidth;

    // 提前显示菜单，否则可能获取不到菜单宽高
    element.classList.remove("hidden");

    // 获取菜单宽高
    const menuWidth = element.offsetWidth;
    const menuHeight = element.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 设置菜单位置，防止超出窗口边界
    let posX = e.clientX + window.scrollX;
    let posY = e.clientY + window.scrollY;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const fixedValue = 25;// 固定值，防止菜单超出窗口边界（滚动条宽度+距离滚动条宽度）
    if ((posX + menuWidth) > (windowWidth + scrollX - (IsScrollY ? fixedValue : 0))) {
        posX = windowWidth + scrollX - menuWidth - (IsScrollY ? fixedValue : 10);
    }

    if ((posY + menuHeight) > (windowHeight + scrollY - (IsScrollX ? fixedValue : 0))) {
        posY = windowHeight + scrollY - menuHeight - (IsScrollX ? fixedValue : 10);
    }

    element.style.top = `${posY}px`;
    element.style.left = `${posX}px`;
}

//关闭右键菜单
function closeMenu(event) {
    const contextMenu = document.getElementById('context-menu');
    const contextMenu2 = document.getElementById('context-menu-blank');
    if (event && event.type === "contextmenu") {
        const targetElement = event.target.closest(`.${bookmark_link}`);
        const targetElement2 = event.target.closest(`#main`);
        //没有在指定元素触发隐藏右键事件隐藏菜单
        if (!targetElement) {
            contextMenu.classList.add("hidden"); // 关闭自定义菜单
        }
        //contextMenu2子元素触发右键事件隐藏菜单
        if (targetElement) {
            contextMenu2.classList.add("hidden"); // 关闭自定义菜单
        }
        //没有在指定元素触发隐藏右键事件隐藏菜单
        if (!targetElement2) {
            contextMenu2.classList.add("hidden"); // 关闭自定义菜单
        }
    } else {
        contextMenu.classList.add("hidden");
        contextMenu2.classList.add("hidden");
    }
}

//拷贝到剪贴板
async function copyToClipboard(text) {
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

//书签编辑
function BookmarkEditInitialize() {
    const websiteLink = document.getElementById('websiteLink');
    const websiteName = document.getElementById('websiteName');
    // const iconName = document.getElementById('iconName');
    // const iconName2 = document.getElementById('iconName2');
    const iconBorders = [...document.getElementsByClassName('iconBorder')];
    const imageInput = document.getElementById('imageInput');
    const localPreviewImage = document.getElementById('localPreviewImage');
    const localPreviewSvg = document.getElementById('localPreviewSvg');
    const PreviewImage = document.getElementById('PreviewImage');
    const refreshIcon = document.getElementById("refreshIcon");

    //同步icon
    // iconName.oninput = (event) => {
    //     iconName2.textContent = event.target.value;
    // }

    //同步网站icon
    const debouncedSearch = debounce(async (event) => {
        let data = await fetchFaviconAsBase64(event.target.value);

        if (data) {
            if (data.base64) {
                PreviewImage.src = data.base64;
                ToggleSvgOrImage(false);
            } else {
                ToggleSvgOrImage(true);
            }
            if (websiteName.value.trim() === "" && data.title) {
                websiteName.value = data.title;
            }
        } else {
            ToggleSvgOrImage(true);
        }
    }, 1000);
    websiteLink.oninput = debouncedSearch;

    //选项卡切换
    iconBorders.forEach((item) => {
        item.onclick = () => {
            iconBorders.forEach((Border) => {
                Border.classList.remove('border-blue-400');
            });
            item.classList.add('border-blue-400');

            if (item.classList.contains('image')) {
                imageInput.click();
            }
        }
    });

    //刷新网络图标双击事件
    refreshIcon.ondblclick = () => {
        const url = websiteLink.value;
        fetchFaviconAsBase64(url)
            .then((data) => {
                if (data) {
                    if (websiteName.value.trim() === "" && data.title) {
                        websiteName.value = data.title;
                    }

                    if (data.base64) {
                        PreviewImage.src = data.base64;
                        ToggleSvgOrImage(false);
                    } else {
                        ToggleSvgOrImage(true);
                    }
                } else {
                    ToggleSvgOrImage(true);
                }
            });
    }

    //上传图片
    // 为文件选择器添加change事件监听器
    imageInput.addEventListener('change', function (event) {
        // 获取选中的文件
        const file = event.target.files[0];

        // 确保文件存在
        if (file) {
            convertBlobToBase64(file)
                .then((data) => {
                    // 将读取到的文件内容设置为图片的src属性，以预览图片
                    localPreviewImage.src = data;
                    localPreviewImage.classList.remove('hidden');
                    localPreviewSvg.classList.add('hidden');
                });
        }
    });
}

//切换书签编辑的官方图标
/**
 * 切换 SVG 或图像的显示。
 * 如果元素是 SVG，则切换为图像；如果元素是图像，则切换为 SVG。
 * @param {boolean} bool - 指示是否显示图像。
 * @param {boolean} local - 指示是否使用本地预览图像。
 */
function ToggleSvgOrImage(bool, local) {
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

//保存书签
function SaveBookmark(id, element) {
    const websiteLink = document.getElementById('websiteLink');
    const websiteLinkError = document.getElementById('websiteLinkError');
    const websiteName = document.getElementById('websiteName');
    const websiteNameError = document.getElementById('websiteNameError');
    const PreviewImage = document.getElementById('PreviewImage');
    const PreviewImageError = document.getElementById('PreviewImageError');
    const localPreviewImage = document.getElementById('localPreviewImage');

    const iconBorder = document.querySelector('.iconBorder.border-blue-400');

    const img = element?.querySelector('img');
    const name = element?.querySelector('h2');
    const linkText = element?.querySelector('p');

    if (websiteLink.value == "") {
        websiteLinkError.classList.remove('hidden');
        return;
    } else {
        websiteLinkError.classList.add('hidden');
    }

    if (websiteName.value == "") {
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
            url: websiteLink.value
        }, (updatedBookmark) => {
            findInTree(firstLayer, (node) => {
                if (node.id === id) {
                    node.title = websiteName.value;
                    node.url = websiteLink.value;
                    //更新打开链接
                    element.href = websiteLink.value;

                    //更新当前元素
                    linkText.textContent = websiteLink.value;
                    name.textContent = websiteName.value;

                    if (iconBorder.classList.contains('image')) {//本地图片
                        img.src = localPreviewImage.src;
                        if (localPreviewImage.src != location.href) {
                            db.getData("Icons", id).then((data) => {
                                if (data) {
                                    db.updateData("Icons", {base64: localPreviewImage.src, id});
                                } else {
                                    db.addData("Icons", {base64: localPreviewImage.src, id});
                                }
                            });
                        }
                    } else if (!iconBorder.classList.contains('default')) {//网络图片
                        img.src = PreviewImage.src;
                        if (PreviewImage.src != location.href) {
                            db.getData("Icons", id).then((data) => {
                                if (data) {
                                    db.updateData("Icons", {base64: PreviewImage.src, id});
                                } else {
                                    db.addData("Icons", {base64: PreviewImage.src, id});
                                }
                            });
                        } else {
                            db.deleteData("Icons", id);
                        }
                    }
                    return true;
                }
            });
        });
    } else {
        chrome.bookmarks.create({
            parentId: BookmarkFolderActiveId,
            title: websiteName.value,
            url: websiteLink.value
        }, (newBookmark) => {
            // 处理新书签的逻辑
            let link = {
                type: "link",
                id: newBookmark.id,
                url: newBookmark.url,
                title: newBookmark.title,
                icon: `https://logo.clearbit.com/${new URL(newBookmark.url).hostname}`,
                parentId: newBookmark.parentId,
                children: []
            };
            findInTree(firstLayer, (node) => {
                if (node.id === link.parentId) {
                    node.children.push(link);

                    let imgsrc = null;
                    if (iconBorder.classList.contains('image')) {//本地图片
                        if (localPreviewImage.src != location.href) {
                            imgsrc = localPreviewImage.src;
                            db.addData("Icons", {base64: localPreviewImage.src, id: link.id});
                        }
                    } else if (!iconBorder.classList.contains('default')) {//网络图片
                        if (PreviewImage.src != location.href) {
                            imgsrc = PreviewImage.src;
                            db.addData("Icons", {base64: PreviewImage.src, id: link.id});
                        }
                    }

                    if (imgsrc) {
                        link.icon = imgsrc;
                    }

                    const grid_element = document.getElementById('grid');
                    if (grid_element) {
                        grid_element.appendChild(createCard(link));
                    } else {
                        const container = document.getElementById('bookmarks');
                        const grid_folders = document.getElementById('grid_folders');
                        const promptMessage = document.getElementById('promptMessage');

                        if (promptMessage) {
                            container.innerHTML = '';
                        }

                        //添加分割线
                        if (grid_folders) {
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
                        linkSection.appendChild(createCard(link));
                        container.appendChild(linkSection);
                        BookmarkDrag(linkSection.id);//添加拖拽效果
                    }

                    return true;
                }
            });
        });
    }
    // 关闭模态框
    editBookmark_modal.close();
}

//隐藏书签编辑错误
function BookmarkEditErrorHide() {
    const websiteLinkError = document.getElementById('websiteLinkError');
    const websiteNameError = document.getElementById('websiteNameError');
    const PreviewImageError = document.getElementById('PreviewImageError');
    websiteLinkError.classList.add('hidden');
    websiteNameError.classList.add('hidden');
    PreviewImageError.classList.add('hidden');
}

//清空书签编辑的数据
function EmptyBookmarkEdit() {
    const websiteLink = document.getElementById('websiteLink');
    const websiteName = document.getElementById('websiteName');
    const PreviewImage = document.getElementById('PreviewImage');
    const localPreviewImage = document.getElementById('localPreviewImage');

    websiteLink.value = '';
    websiteName.value = '';
    PreviewImage.src = '';
    localPreviewImage.src = '';
}

//初始化
function Initialize() {
    // 按Enter时的搜索功能
    document.getElementById('searchInput').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            Search();
        }
    });

    // 按钮点击的搜索功能
    document.getElementById('searchButton').addEventListener('click', function () {
        Search();
    });

    // 清除搜索结果的按钮
    document.getElementById('clearSearchButton').addEventListener('click', clearSearchResults);
    document.getElementById('searchButton').onclick = () => {
        const query = document.getElementById('searchInput').value;
        if (query.trim() === '') {
            return;
        }
        searchBookmarks(query);
    }

    // Event listener for theme toggle button
    const themeToggleButton = document.getElementById('themeToggleButton');
    themeToggleButton.addEventListener('click', toggleTheme);

    // Automatically apply theme according to system theme settings
    function applyColorTheme(theme) {
        if (theme === 'dark') {
            applyDarkTheme();
        } else {
            applyLightTheme();
        }
    }

    // Detect initial color theme
    const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyColorTheme(prefersDarkTheme ? 'dark' : 'light');

    // Listen for changes in the color theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        applyColorTheme(event.matches ? 'dark' : 'light');
    });

    // Open mobile menu
    // document.getElementById('open-sidebar-button')?.addEventListener('click', function () {
    //     var navigation = document.getElementById('navigation').cloneNode(true);
    //     document.getElementById('sidebar-2').appendChild(navigation);
    // });

    // 设置modal
    (() => {
        const SetUp_modal = document.getElementById('SetUp_modal');
        const SetUp_modalButton = document.getElementById('SetUp_modal_but');

        SetUp_modalButton.onclick = () => {
            SetUp_modal.showModal();
        };
    })();

    //关闭鼠标右键菜单
    (() => {
        // 添加多个事件监听器来关闭菜单
        document.onclick = closeMenu;
        document.onscroll = closeMenu; // 捕获所有滚动事件
        document.onkeydown = closeMenu; // 按下任意键关闭菜单
        document.oncontextmenu = closeMenu; // 按下任意键关闭菜单
        window.onresize = closeMenu; // 窗口大小改变时关闭菜单
        document.ondragstart = closeMenu;//拖拽开始事件
        document.onmousedown = (event) => {
            if (event.button === 1) {
                closeMenu(event);
            }
        };//鼠标中键按下事件
    })();

    //书签空白处鼠标右键
    (() => {
        let bookmarks = document.getElementById("main");
        bookmarks.oncontextmenu = (event) => {
            event.preventDefault();
            if (!BookmarkFolderActiveId) {
                return true;
            }
            const targetElement = event.target.closest(`.${bookmark_link}`);
            if (!targetElement) {
                chrome.storage.sync.get('ContextMenu', (data) => {
                    if (!data.ContextMenu) {
                        ContextMenuBlank(event);
                    }
                });
            }
        };
    })();

    //更新日期
    (() => {
        const yearElement = document.getElementById('currentYear');
        yearElement.textContent = new Date().getFullYear();
    })();
}

//删除书签缓存的图标
async function DelIconsCache() {
    let datas = await fetchBookmarks();
    let ArrId = [];
    let DelArrId = [];
    const GetArrId = (node) => {
        // 如果 node 是数组，遍历数组中的每个元素
        if (Array.isArray(node)) {
            for (let item of node) {
                GetArrId(item);
            }
        } else {
            ArrId.push(node.id);
            // 如果当前节点有子节点，递归查找子节点
            if (node.children && node.children.length > 0) {
                for (let child of node.children) {
                    GetArrId(child);
                }
            }
        }
    }
    GetArrId(datas);
    db.GetCursor("Icons", (data) => {
        if (!ArrId.includes(data.id)) {
            DelArrId.push(data.id);
        }
    }, () => {
        db.deleteMultipleData("Icons", DelArrId).then(() => {
            console.log("删除缓存成功");
        });
    });
}

//搜索
function Search() {
    const query = document.getElementById('searchInput').value;
    const selectElement = document.getElementById('currency');
    switch (selectElement.value) {
        case "0":
            if (query.trim() === '') {
                return;
            }
            searchBookmarks(query);
            break;
        case "1":
            var encodedStr = encodeURIComponent(query);
            window.open(`https://www.baidu.com/s?wd=${encodedStr}&ie=utf-8`, '_blank');
            break;
        case "2":
            var encodedStr = encodeURIComponent(query);
            window.open(`https://www.google.com/search?q=${encodedStr}`, '_blank');
            break;
        case "3":
            var encodedStr = encodeURIComponent(query);
            window.open(`https://www.bing.com/search?q=${encodedStr}`, '_blank');
            break;
        default:
            break;
    }
}

//书签拖拽
function BookmarkDrag(id) {
    const element = document.getElementById(id);
    if (element) {
        new Sortable(element, {
            animation: 150,
            // ghostClass: 'sortable-ghost', // Class name for the drop placeholder
            // chosenClass: 'sortable-chosen', // Class name for the chosen item
            onEnd: function (evt) {
                // 当拖拽结束时，可以在这里获取新顺序
                // console.log(`从索引 ${evt.oldIndex} 移动到索引 ${evt.newIndex}`);
                let newIndex = evt.newIndex;
                if (evt.oldIndex < evt.newIndex) {
                    newIndex++;
                }
                //更新书签位置
                if (BookmarkFolderActiveId) {
                    chrome.bookmarks.move(evt.item.dataset.id, {
                        index: newIndex,
                        parentId: BookmarkFolderActiveId
                    });
                }
            }
        });
    }
}

//判断书签和文件夹是空
function mainContentIsNull() {
    let bookmarkList = document.querySelectorAll("#grid > a").length;
    let folderList = document.querySelectorAll("#grid_folders > div").length;
    return !((bookmarkList + folderList) > 0);
}

//判断书签是空
function bookmarkIsNull() {
    let bookmarkList = document.querySelectorAll("#grid > a").length;
    return !((bookmarkList) > 0);
}

//展开侧边栏当前活跃的文件夹
function ExpandActiveFolder() {
    let active = document.querySelector(".sidebar-active");

    while (active) {
        let ul = active.parentNode;
        if (ul) {
            ul.classList.remove("hidden");
            if (ul.previousElementSibling) {
                active = ul.previousElementSibling;
            } else {
                active = null;
            }
        } else {
            active = null;
        }
    }
}
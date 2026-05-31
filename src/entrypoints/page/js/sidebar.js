import { BookmarkFolderActiveId, BreadcrumbsList, setBookmarkFolderActiveId, setBreadcrumbsList, firstLayer } from "./state.js";
import db from "@/entrypoints/page/utils/IndexedDB.js";
import { SetUpStr } from "@/entrypoints/page/config/index.js";
import { findInTree, findParentFolders } from "@/entrypoints/page/utils/utils.js";

let renderBookmarksFn = null;

// 设置渲染书签的回调函数
export function setRenderBookmarks(fn) {
    renderBookmarksFn = fn;
}

// 渲染侧边栏导航（使用栈模拟递归构建文件夹树）
export function renderNavigation(folders, container, isFirstRender = false, path = [], closeMenuFn) {
    container.innerHTML = '';

    const stack = [];
    stack.push({ folders, container, path, isFirstRender, parentElement: container });

    while (stack.length > 0) {
        const { folders, container, path, isFirstRender, parentElement } = stack.pop();

        folders.forEach((folder, index) => {
            if (folder.type === 'folder') {
                const navItem = CreateSidebarItemElement(folder.title, folder.id);
                const toggleIcon = CreateIconElement();

                if (folder.children && folder.children.length > 0) {
                    navItem.appendChild(toggleIcon);
                }
                parentElement.appendChild(navItem);

                if (folder.children && folder.children.length > 0) {
                    const subList = document.createElement('ul');
                    subList.className = 'ml-4 space-y-2 hidden';
                    stack.push({
                        folders: folder.children,
                        container: subList,
                        path: path.concat({
                            id: folder.id,
                            title: folder.title,
                            children: folder.children
                        }),
                        isFirstRender: false,
                        parentElement: subList
                    });
                    parentElement.appendChild(subList);

                    if (isFirstRender && index === 0) {
                        subList.classList.remove('hidden');
                        if (subList.children.length > 0) {
                            toggleIcon.classList.toggle('rotate-90');
                        }
                    }

                    navItem.onclick = (e) => {
                        closeMenuFn();
                        e.stopPropagation();
                        document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));
                        if (subList.children.length > 0) {
                            subList.classList.toggle('hidden');
                            toggleIcon.classList.toggle('rotate-90');
                        }
                        renderBookmarksFn(folder.children, path.concat({
                            id: folder.id,
                            title: folder.title,
                            children: folder.children
                        }));
                    };
                } else {
                    navItem.onclick = (e) => {
                        closeMenuFn();
                        e.stopPropagation();
                        document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));
                        renderBookmarksFn(folder.children, path.concat({
                            id: folder.id,
                            title: folder.title,
                            children: folder.children
                        }));
                    };
                }
            }
        });
    }
}

// 更新侧边栏项的活动状态并保存当前活跃文件夹id
export function updateSidebarActiveState(path) {
    document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));

    let currentNav = document.getElementById('navigation');
    let ActiveId = null;

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

    setBookmarkFolderActiveId(ActiveId);
    setBreadcrumbsList(path);
    if (ActiveId) {
        ExpandActiveFolder();
        db.getData(SetUpStr, "ActiveId").then((data) => {
            if (data) {
                db.updateData(SetUpStr, { id: "ActiveId", data: ActiveId });
            } else {
                db.addData(SetUpStr, { id: "ActiveId", data: ActiveId });
            }
        });
    }
}

// 创建侧边栏项（新增文件夹时动态添加到导航树）
export function CreateSidebarItem(folder, path, closeMenuFn) {
    if (folder.type !== 'folder') {
        return;
    }

    let navItem_ = GetParentIdElement(folder.parentId);
    let container = null;

    if (navItem_.nextElementSibling && navItem_.nextElementSibling.tagName === 'UL') {
        container = navItem_.nextElementSibling;
        if (!navItem_.querySelector("li>span")) {
            navItem_.appendChild(CreateIconElement());
        }
    } else {
        container = document.createElement('ul');
        let icon = CreateSidebarItemArrowIcon(folder.parentId);
        container.className = 'ml-4 space-y-2 hidden';
        navItem_.parentNode.insertBefore(container, navItem_.nextSibling);

        navItem_.onclick = (e) => {
            closeMenuFn();
            e.stopPropagation();
            document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));
            container.classList.toggle('hidden');
            icon.classList.toggle('rotate-90');
            let ParentNode = null;
            findInTree(firstLayer, (node) => {
                if (node.id === folder.parentId) {
                    ParentNode = node;
                    return true;
                }
            });
            renderBookmarksFn(ParentNode.children, path);
        }
    }

    const navItem = CreateSidebarItemElement(folder.title, folder.id);
    const toggleIcon = CreateIconElement();
    if (folder.children && folder.children.length > 0) {
        navItem.appendChild(toggleIcon);
    }
    container.appendChild(navItem);

    navItem.onclick = (e) => {
        closeMenuFn();
        e.stopPropagation();
        document.querySelectorAll('#navigation .sidebar-active').forEach(el => el.classList.remove('sidebar-active'));
        if (container.children.length > 0) {
            container.classList.toggle('hidden');
            toggleIcon.classList.toggle('rotate-90');
        }
        renderBookmarksFn(folder.children, path.concat({
            id: folder.id,
            title: folder.title,
            children: folder.children
        }));
    };
}

// 根据id获取侧边栏中对应的DOM元素
export function GetParentIdElement(ActiveId) {
    let item_ = null;
    let SidebarItemList = [...document.querySelectorAll("#navigation li div a")];
    SidebarItemList.forEach(item => {
        if (item.dataset.id === ActiveId) {
            item_ = item.parentNode.parentNode;
        }
    });
    return item_;
}

// 创建或获取侧边栏项的展开箭头图标
export function CreateSidebarItemArrowIcon(parentId) {
    let navItem = GetParentIdElement(parentId);
    let icon = navItem.querySelector("li>span");
    if (!icon) {
        icon = CreateIconElement();
        navItem.appendChild(icon);
    }
    return icon;
}

// 创建侧边栏项元素（li + 文件夹图标 + 名称链接）
export function CreateSidebarItemElement(title, id) {
    const navItem = document.createElement('li');
    navItem.className = 'items-center group flex justify-between gap-x-3 rounded-md p-2 text-gray-700 dark:text-gray-400 hover:text-main-500 hover:bg-gray-50 dark:hover:pintree-bg-gray-800 bg-opacity-50';

    const navLinkContainer = document.createElement('div');
    navLinkContainer.className = 'flex items-center space-x-2 truncate';

    const folderIcon = document.createElement('span');
    folderIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>';

    const navLink = document.createElement('a');
    navLink.className = 'flex text-sm leading-6 font-semibold dark:text-gray-400';
    navLink.innerText = title;
    navLink.dataset.id = id;

    navLinkContainer.appendChild(folderIcon);
    navLinkContainer.appendChild(navLink);

    navItem.appendChild(navLinkContainer);
    return navItem;
}

// 创建展开/折叠箭头图标元素
export function CreateIconElement() {
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'ml-2 transform transition-transform';
    toggleIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>';
    return toggleIcon;
}

// 展开侧边栏中当前活跃的文件夹路径
export function ExpandActiveFolder() {
    let active = document.querySelector(".sidebar-active");

    let bool = false;
    while (active) {
        if (bool) {
            active.querySelector("li>span")?.classList.add("rotate-90");
        } else {
            bool = true;
        }

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

// 数据库与配置
import db from "@/entrypoints/page/utils/IndexedDB.js";
import { dbNames } from "@/entrypoints/page/config/index.js";

// 搜索图标资源
import google_svg from '~/assets/svg/google.svg';
import bing_svg from '~/assets/svg/bing.svg';
import baidu_svg from '~/assets/svg/baidu.svg';

// 模块导入
import { BookmarkInitialize, DelIconsCache } from "./bookmarkApi.js";
import { renderBookmarks, createFolderCard, createCard, showNoResultsMessage, mainContentIsNull, bookmarkIsNull, folderIsNull } from "./bookmarkRender.js";
import { renderNavigation, setRenderBookmarks as setSidebarRenderBookmarks, CreateSidebarItem } from "./sidebar.js";
import { setRenderBookmarksRef } from "./breadcrumb.js";
import { ContextMenuBlank, closeMenu } from "./contextMenu.js";
import { initBookmarkEditor, SaveBookmark, BookmarkEditErrorHide, EmptyBookmarkEdit, ToggleSvgOrImage, setCreateCard as setEditorCreateCard, setBookmarkDrag as setEditorBookmarkDrag, setMainContentIsNull as setEditorMainContentIsNull, setBookmarkIsNull as setEditorBookmarkIsNull, setFolderIsNull as setEditorFolderIsNull } from "./bookmarkEditor.js";
import { Search, setRenderBookmarks as setSearchRenderBookmarks } from "./search.js";
import { applyDarkTheme, applyLightTheme, toggleTheme } from "./theme.js";
import { SetCloseContextMenu, SetBookmarkNewTab } from "./settings.js";
import { i18n } from "./i18n.js";
import { BookmarkDrag } from "./drag.js";
import { BookmarkFolderActiveId, BOOKMARK_LINK } from "./state.js";
import { setCreateCard as setContextMenuCreateCard, setShowNoResultsMessage, setMainContentIsNull as setContextMenuMainContentIsNull, setBookmarkIsNull as setContextMenuBookmarkIsNull, setFolderIsNull as setContextMenuFolderIsNull, setInitBookmarkEditor, setSaveBookmark, setBookmarkEditErrorHide, setEmptyBookmarkEdit, setToggleSvgOrImage } from "./contextMenu.js";

// 跨模块依赖注入 - sidebar/breadcrumb/search 需要 renderBookmarks
setSidebarRenderBookmarks(renderBookmarks);
setRenderBookmarksRef(renderBookmarks);
setSearchRenderBookmarks(renderBookmarks);

// 跨模块依赖注入 - contextMenu 需要渲染和编辑相关的函数
setContextMenuCreateCard(createFolderCard);
setShowNoResultsMessage(showNoResultsMessage);
setContextMenuMainContentIsNull(mainContentIsNull);
setContextMenuBookmarkIsNull(bookmarkIsNull);
setContextMenuFolderIsNull(folderIsNull);
setInitBookmarkEditor(initBookmarkEditor);
setSaveBookmark(SaveBookmark);
setBookmarkEditErrorHide(BookmarkEditErrorHide);
setEmptyBookmarkEdit(EmptyBookmarkEdit);
setToggleSvgOrImage(ToggleSvgOrImage);

// 跨模块依赖注入 - bookmarkEditor 需要渲染和拖拽相关的函数
setEditorCreateCard(createCard);
setEditorBookmarkDrag(BookmarkDrag);
setEditorMainContentIsNull(mainContentIsNull);
setEditorBookmarkIsNull(bookmarkIsNull);
setEditorFolderIsNull(folderIsNull);

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    Initialize();
    // 数据库初始化
    db.openDB(dbNames).then(() => {
        // 初始化书签
        BookmarkInitialize(renderNavigation, closeMenu);
        // 删除已经删除书签的缓存图标
        DelIconsCache();
    });
});

// 关闭页面前断开数据库连接
window.onbeforeunload = () => {
    db.closeDB();
};

// 初始化
function Initialize() {
    // 国际化
    i18n();
    // 设置右键菜单开关
    SetCloseContextMenu();
    // 设置书签新标签页打开
    SetBookmarkNewTab();
    // 书签编辑初始化
    initBookmarkEditor();

    // 按Enter时的搜索功能
    document.getElementById('searchInput')?.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            browser.storage.sync.get('SearchTab', (data) => {
                if (data.SearchTab) {
                    Search(data.SearchTab);
                }
            });
        }
    });

    // 按钮点击的搜索功能
    document.getElementById('searchButton')?.addEventListener('click', function () {
        browser.storage.sync.get('SearchTab', (data) => {
            if (data.SearchTab) {
                Search(data.SearchTab);
            }
        });
    });

    // 侧导航栏切换
    SideNavigationToggle.onclick = () => {
        browser.storage.sync.get('SideNavigationToggle', (data) => {
            if (data.SideNavigationToggle) {
                browser.storage.sync.set({ SideNavigationToggle: false });
                SideNavigation.classList.add('lg:block');
                document.getElementById('main-content').classList.remove("mx-20");
            } else {
                browser.storage.sync.set({ SideNavigationToggle: true });
                SideNavigation.classList.remove('lg:block');
                document.getElementById('main-content').classList.add("mx-20");
            }
        });
    }

    // 主题切换按钮
    const themeToggleButton = document.getElementById('themeToggleButton');
    themeToggleButton.addEventListener('click', toggleTheme);

    // 应用主题
    function applyColorTheme(theme) {
        if (theme === 'dark') {
            applyDarkTheme();
        } else {
            applyLightTheme();
        }
    }

    // 检测系统主题并应用
    const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyColorTheme(prefersDarkTheme ? 'dark' : 'light');

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        applyColorTheme(event.matches ? 'dark' : 'light');
    });

    // 设置弹窗
    (() => {
        const SetUp_modal = document.getElementById('SetUp_modal');
        const SetUp_modalButton = document.getElementById('SetUp_modal_but');

        SetUp_modalButton.onclick = () => {
            SetUp_modal.showModal();
        };
    })();

    // 搜索状态管理（标签页切换与搜索选项）
    (() => {
        let tab_ = null;
        let currentTab_ = null;
        // 搜索类型对应的选项
        const tabData = {
            bookmarks: ["All_bookmarks", "Current_bookmark"],
            "web-search": ["Google", "Baidu", "Bing"],
            "ai-search": ["ChatGPT", "Perplexity", "Secret_Tower"],
        };

        // DOM 元素
        const tabs = document.querySelectorAll(".tab-btn");
        const collections = document.getElementById("collections");

        // 切换 Tab 时更新集合按钮
        function updateCollections(tabKey, currentTab = null) {
            collections.innerHTML = "";
            let icons = {
                "Google": google_svg,
                "Baidu": baidu_svg,
                "Bing": bing_svg,
            }
            tabData[tabKey].forEach((label, index) => {
                const btn = document.createElement("button");

                // 添加搜索引擎图标
                if (icons[label]) {
                    const svg = document.createElement("img");
                    svg.src = icons[label];
                    svg.classList.add("w-4", "h-4", "mr-2");
                    btn.appendChild(svg);
                }

                const span = document.createElement("span");
                span.textContent = browser.i18n.getMessage(label.toLowerCase());
                btn.appendChild(span);
                btn.dataset.tab = label;
                btn.className = `collection-btn flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-200 dark:pintree-bg-gray-900 dark:text-gray-300 dark:hover:pintree-bg-gray-800 dark:border dark:border-gray-700 rounded-full`;
                btn.onclick = (e) => {
                    // 重置所有按钮样式
                    document.querySelectorAll(".collection-btn").forEach((btn) => {
                        btn.classList.add("hover:bg-gray-200", "bg-gray-50");
                        btn.classList.remove("bg-gray-200", "dark:pintree-bg-gray-800");
                    });
                    // 选中当前按钮
                    btn.classList.add("bg-gray-200", "dark:pintree-bg-gray-800")
                    btn.classList.remove("bg-gray-50", "hover:bg-gray-200");

                    currentTab_ = btn.dataset.tab;

                    // 保存当前选中的搜索选项
                    browser.storage.sync.set({
                        SearchTab: {
                            tab: tab_,
                            currentTab: currentTab_
                        }
                    });
                }
                // 默认选中第一项或恢复之前选中项
                if ((currentTab === null && index === 0) || (currentTab === btn.dataset.tab)) {
                    btn.click();
                }
                collections.appendChild(btn);
            });
        }

        // 标签页点击事件
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                // 移除所有 Tab 的选中样式
                tabs.forEach((t) => {
                    t.classList.remove("bg-black", "text-white")
                    t.classList.add("hover:text-black")
                });

                // 为当前点击的 Tab 添加选中样式
                tab.classList.add("bg-black", "text-white");
                tab.classList.remove("hover:text-black")

                tab_ = tab.dataset.tab;

                // 恢复之前保存的搜索选项
                browser.storage.sync.get('SearchTab', (data) => {
                    if (data.SearchTab) {
                        if (data.SearchTab.tab === tab_) {
                            currentTab_ = data.SearchTab.currentTab;
                        } else {
                            currentTab_ = null;
                        }
                    } else {
                        currentTab_ = null;
                    }
                    updateCollections(tab_, currentTab_);
                });
            });
        });

        // 初始化搜索标签页状态
        browser.storage.sync.get('SearchTab', (data) => {
            if (data.SearchTab) {
                let Isdefault = true;
                tabs.forEach((tab) => {
                    if (tab.dataset.tab === data.SearchTab.tab) {
                        Isdefault = false;
                        tab.click();
                        currentTab_ = data.SearchTab.currentTab;
                        updateCollections(tab_, currentTab_);
                    }
                });
                if (Isdefault) tabs[0]?.click();
            } else {
                tabs[0]?.click();
            }
        });
    })();

    // 关闭右键菜单的事件监听
    (() => {
        document.onclick = closeMenu;
        document.querySelector("body > div > div.flex.flex-row.h-screen > div.flex-1.overflow-auto.h-full.flex.flex-col.bor").onscroll = closeMenu;
        document.onkeydown = closeMenu;
        document.oncontextmenu = closeMenu;
        window.onresize = closeMenu;
        document.ondragstart = closeMenu;
        document.onmousedown = (event) => {
            if (event.button === 1) {
                closeMenu(event);
            }
        };
    })();

    // 书签空白处鼠标右键
    (() => {
        let bookmarks = document.getElementById("main");
        bookmarks.oncontextmenu = (event) => {
            event.preventDefault();
            if (!BookmarkFolderActiveId) {
                return true;
            }
            const targetElement = event.target.closest(`.${BOOKMARK_LINK}`);
            if (!targetElement) {
                browser.storage.sync.get('ContextMenu', (data) => {
                    if (!data.ContextMenu) {
                        ContextMenuBlank(event);
                    }
                });
            }
        };
    })();

    // 初始化侧导航栏隐藏状态
    (() => {
        browser.storage.sync.get('SideNavigationToggle', (data) => {
            if (!data.SideNavigationToggle) {
                SideNavigation.classList.add('lg:block');
                document.getElementById('main-content').classList.remove("mx-20");
            } else {
                SideNavigation.classList.remove('lg:block');
                document.getElementById('main-content').classList.add("mx-20");
            }
        });
    })();

    // 更新页脚年份
    (() => {
        const yearElement = document.getElementById('currentYear');
        yearElement.textContent = new Date().getFullYear();
    })();
}
import { BookmarkFolderActiveId, SearchOldBookmarkFolderActiveId, setSearchOldBookmarkFolderActiveId, setBookmarkFolderActiveId } from "./state.js";
import { fetchBookmarks } from "./bookmarkApi.js";
import { navigateToFolder } from "./bookmarkRender.js";

let renderBookmarksFn = null;

// 设置渲染书签的回调函数
export function setRenderBookmarks(fn) {
    renderBookmarksFn = fn;
}

// 在书签数据中递归搜索匹配的项，并记录每项所在的父文件夹路径（parentPath）
export function searchInData(data, query, currentTab, parentPath = []) {
    query = query.toLowerCase();
    let results = [];
    data.forEach(item => {
        const itemPath = item.children
            ? parentPath.concat({ id: item.id, title: item.title })
            : parentPath;
        const isMatch = item.title.toLowerCase().includes(query)
            && (currentTab === "All_bookmarks" || item.parentId == BookmarkFolderActiveId);
        if (isMatch) {
            item.folderPath = parentPath;
            results.push(item);
        }
        if (item.children) {
            const childResults = searchInData(item.children, query, currentTab, itemPath);
            if (childResults.length > 0) {
                results = results.concat(childResults);
            }
        }
    });
    return results;
}

// 清除搜索结果并恢复到指定文件夹的书签视图
export function clearSearchResults(ActiveId) {
    navigateToFolder(ActiveId);
}

// 搜索书签（支持全部搜索和当前文件夹搜索）
export function searchBookmarks(query, currentTab) {
    if (BookmarkFolderActiveId) setSearchOldBookmarkFolderActiveId(BookmarkFolderActiveId);
    if (query.trim() === '') {
        clearSearchResults(SearchOldBookmarkFolderActiveId);
        return;
    }
    setBookmarkFolderActiveId(null);
    fetchBookmarks()
        .then(data => {
            const results = searchInData(data, query, currentTab);
            renderBookmarksFn(results, [{ id: "0", title: browser.i18n.getMessage("searchResults"), children: results }]);
        })
        .catch(error => console.error(`${browser.i18n.getMessage("errorSearchBookmark")}:`, error));
}

// 网页搜索（Google/Baidu/Bing）
export function searchWeb(query, currentTab) {
    var encodedStr = encodeURIComponent(query);
    switch (currentTab) {
        case "Google":
            window.open(`https://www.google.com/search?q=${encodedStr}`, '_blank');
            return;
        case "Baidu":
            window.open(`https://www.baidu.com/s?wd=${encodedStr}&ie=utf-8`, '_blank');
            return;
        case "Bing":
            window.open(`https://cn.bing.com/search?q=${encodedStr}`, '_blank');
            return;
        default:
            break;
    }
}

// AI搜索（ChatGPT/Perplexity/秘塔）
export function searchAI(query, currentTab) {
    var encodedStr = encodeURIComponent(query);
    switch (currentTab) {
        case "ChatGPT":
            window.open(`https://chatgpt.com/?q=${encodedStr}`, '_blank');
            return;
        case "Perplexity":
            window.open(`https://www.perplexity.ai/search/new?q=${encodedStr}&ie=utf-8`, '_blank');
            return;
        case "Secret_Tower":
            window.open(`https://metaso.cn?q=${encodedStr}`, '_blank');
            return;
        default:
            break;
    }
}

// 根据搜索类型分发搜索请求（书签/网页/AI）
export function Search(data) {
    const query = document.getElementById('searchInput').value;
    switch (data.tab) {
        case "bookmarks":
            searchBookmarks(query, data.currentTab);
            break;
        case "web-search":
            searchWeb(query, data.currentTab);
            break;
        case "ai-search":
            searchAI(query, data.currentTab);
            break;
        default:
            break;
    }
}

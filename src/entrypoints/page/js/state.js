// 全局状态管理
export let firstLayer = null; // 书签集合
export let BookmarkFolderActiveId = null; // 当前活跃的文件夹id
export let SearchOldBookmarkFolderActiveId = null; // 搜索之前活跃的文件夹id
export let BreadcrumbsList = []; // 面包屑列表

export const BOOKMARK_LINK = "bookmark-link"; // 书签链接CSS类名

// 设置书签集合
export function setFirstLayer(data) { firstLayer = data; }
// 设置当前活跃文件夹id
export function setBookmarkFolderActiveId(id) { BookmarkFolderActiveId = id; }
// 设置搜索前活跃文件夹id
export function setSearchOldBookmarkFolderActiveId(id) { SearchOldBookmarkFolderActiveId = id; }
// 设置面包屑列表
export function setBreadcrumbsList(list) { BreadcrumbsList = list; }

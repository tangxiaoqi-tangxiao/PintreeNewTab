import db from "@/entrypoints/page/utils/IndexedDB.js";
import { IconsStr } from "@/entrypoints/page/config/index.js";

// 图标内存缓存：初始化时一次性从 IndexedDB 读取，渲染时同步取用，
// 避免每个书签卡片都单独开一个 IndexedDB 事务。
const iconCache = new Map();

// 从 IndexedDB 加载全部自定义图标到内存缓存
export async function loadIconCache() {
    try {
        const all = await db.getAllData(IconsStr);
        iconCache.clear();
        for (const item of all) {
            if (item && item.id != null && item.base64) {
                iconCache.set(item.id, item.base64);
            }
        }
    } catch (error) {
        console.error('[iconCache] 加载图标缓存失败:', error);
    }
}

// 同步读取某个书签的自定义图标（无则返回 undefined）
export function getCachedIcon(id) {
    return iconCache.get(id);
}

// 更新/新增缓存中的图标
export function setCachedIcon(id, base64) {
    if (id == null) return;
    if (base64) {
        iconCache.set(id, base64);
    } else {
        iconCache.delete(id);
    }
}

// 删除缓存中的图标
export function deleteCachedIcon(id) {
    iconCache.delete(id);
}

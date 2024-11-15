import db from "../utils/IndexedDB.js"
import {convertBlobToBase64, fetchFaviconBlobData, isImageBlob} from "../utils/utils.js"

// const newTabUrls = [
//   'chrome://newtab/',      // Chrome
//   'edge://newtab/',       // Edge
// ];

//全局变量
let flatBookmarks = [];

// 定义两个数据库名称
const dbName1 = 'Icons';
db.openDB([dbName1]).then(() => {
    // 初始化
    Initialize();
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GetWebUrlIsExist") {
        // 回复消息
        GetWebUrlIsExist(message.message).then((data) => {
            sendResponse({message: data});
        });
    } else if (message.type === "SaveWebIcon") {
        const {url, iconLinks} = message.message;
        SaveWebIcon(url, iconLinks);
        // 回复消息
        sendResponse();
    }
    return true;
});

//监听书签增加
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    flatBookmarks.push({
        id: bookmark.id,
        domain: new URL(bookmark.url).hostname
    });
});

//监听书签删除
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    console.log(removeInfo,id);
    // 查找需要删除的书签的索引
    const index = flatBookmarks.findIndex(bookmark => bookmark.id === id);
    // 检查索引是否有效
    if (index !== -1) {
        // 使用 splice 删除指定索引的元素
        flatBookmarks.splice(index, 1);
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: new URL('../index.html', import.meta.url).toString(),
    });
});

// chrome.tabs.onCreated.addListener(function (tab) {
//   chrome.storage.sync.get('openInNewTab', (data) => {
//     if (data.openInNewTab) {
//       // 如果是新标签页，重定向到自定义页面
//       if (newTabUrls.includes(tab.pendingUrl)) {
//         chrome.tabs.update(tab.id, { url: 'index.html' });
//       }
//     }
//   });
// });

async function Initialize() {
    await fetchFlatBookmarks().then((data) => {
        flatBookmarks = data;
    });
}

async function GetWebUrlIsExist(domain) {
    return new Promise((resolve) => {
        chrome.storage.sync.get('CacheIcon', (data) => {
            console.log(data)
            if (data.CacheIcon) {
                resolve(flatBookmarks.some(e => e.domain === domain));
            } else {
                resolve(false);
            }
        });
    })
}

async function fetchFlatBookmarks() {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((bookmarks) => {
            const flatBookmarks = [];

            // 递归函数，转换树形结构为平面数组
            function flattenBookmarks(bookmarkNode) {
                const {id, url} = bookmarkNode;

                // 只处理书签链接，忽略文件夹
                if (url) {
                    const structuredNode = {
                        id: id,
                        domain: new URL(url).hostname
                    };
                    flatBookmarks.push(structuredNode);
                }

                // 如果有子节点，递归处理每个子节点
                if (bookmarkNode.children) {
                    bookmarkNode.children.forEach(flattenBookmarks);
                }
            }

            // 处理根节点的子节点
            bookmarks[0].children.forEach(flattenBookmarks);

            resolve(flatBookmarks);
        });
    });
}

async function SaveWebIcon(url, iconLinks) {
    // 调用新的封装函数获取图标的 Blob 数据
    const {blob, faviconUrl} = await fetchFaviconBlobData(url, iconLinks);
    console.log(blob, faviconUrl)
    if (blob != null && (isImageBlob(blob, faviconUrl, ["ico"]))) {//判断是否是图片
        // 读取 Blob 数据并转换为 Base64
        const base64 = await convertBlobToBase64(blob);

        const domain = new URL(url).hostname;
        let Bookmarks = flatBookmarks.filter(e => e.domain === domain);

        if (!Bookmarks || Bookmarks.length === 0) {
            return;
        }

        // 遍历书签并更新图标（因为可能出现同一个域名被保存多次）
        Bookmarks.forEach(bookmark => {
            //查询是否存在不存在添加
            db.getData(dbName1, bookmark.id).then(data => {
                if (!data) {
                    db.addData(dbName1, {
                        id: bookmark.id,
                        base64,
                    });
                }
            });
        });
    }
}
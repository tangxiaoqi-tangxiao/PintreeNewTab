import default_svg from '/images/default-icon.svg';

//全局变量
const _browserRelatedHeaders = {
    "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
    "sec-ch-ua-arch": "x86",
    "sec-ch-ua-bitness": "64",
    "sec-ch-ua-full-version": "131.0.6778.69",
    "sec-ch-ua-full-version-list": "\"Google Chrome\";v=\"131.0.6778.69\", \"Chromium\";v=\"131.0.6778.69\", \"Not_A Brand\";v=\"24.0.0.0\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": "",
    "sec-ch-ua-platform": "Windows",
    "sec-ch-ua-platform-version": "15.0.0",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};
// 预加载默认图标数据
let _defaultImageData;

/**
 * 异步获取网站的favicon图标，并将其转换为base64编码字符串
 * @param {string} url - 要获取图标的网站的URL
 * @returns {Promise} - 解析为包含base64编码图标的对象的Promise，如果获取失败则返回null
 */
async function fetchFaviconAsBase64(url) {
    if (!isValidUrl(url)) return null;

    // 并行：优先用浏览器本地 favicon 端点取图标（不依赖目标站跨域），同时抓取页面 HTML 取标题
    const [endpointBase64, page] = await Promise.all([
        fetchFaviconFromEndpoint(url),
        fetchPageInfo(url),
    ]);

    // 端点未取到图标时，降级解析页面 <link rel="icon"> 兜底
    let base64 = endpointBase64;
    if (!base64 && page && page.iconLinks.length > 0) {
        base64 = await fetchFaviconHtmlFallback(url, page.iconLinks);
    }

    return { base64, title: page ? page.title : null };
}

// 通过浏览器本地 favicon 端点获取图标并转为 base64；站点无真实图标时返回 null。
// 该端点由浏览器提供，不受目标站 CORS 限制，比直接抓取站点 HTML 更可靠。
async function fetchFaviconFromEndpoint(url, size = 128) {
    try {
        const hasCustom = await checkFavicon(url);
        if (!hasCustom) return null;
        const response = await fetch(faviconURL(url, size));
        if (!response.ok) return null;
        const blob = await response.blob();
        if (!blob || blob.size === 0) return null;
        return await convertBlobToBase64(blob);
    } catch (error) {
        return null;
    }
}

// 抓取站点 HTML，返回标题与按优先级排序的候选图标链接（可能因跨域限制失败，失败返回 null）
async function fetchPageInfo(url) {
    try {
        const response = await fetchWithTimeout(url, { headers: _browserRelatedHeaders }, 5000);
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const iconLinks = Array.from(doc.querySelectorAll('link'))
            .filter(link => (link.getAttribute('rel') || '').toLowerCase().includes('icon'))
            .sort((a, b) => iconLinkPriority(a) - iconLinkPriority(b))
            .map(link => link.getAttribute('href'));
        return { title: doc.title || null, iconLinks };
    } catch (error) {
        return null;
    }
}

// 图标链接优先级：普通 icon 优先，apple-touch-icon 次之（后者通常是大尺寸 PNG，不适合做小图标）
function iconLinkPriority(link) {
    const rel = (link.getAttribute('rel') || '').toLowerCase();
    if (rel === 'icon' || rel.includes('shortcut icon')) return 0;
    if (rel.includes('apple-touch-icon')) return 2;
    return 1;
}

// 端点未取到图标时的兜底：按候选链接抓取图标并转 base64
async function fetchFaviconHtmlFallback(url, iconLinks) {
    try {
        const { blob, faviconUrl } = await fetchFaviconBlobData(url, iconLinks);
        if (blob != null && isImageBlob(blob, faviconUrl, ["ico"])) {
            return await convertBlobToBase64(blob);
        }
    } catch (error) {
        /* 兜底失败忽略 */
    }
    return null;
}

/**
 * 创建一个防抖函数
 * @param {Function} func - 需要防抖处理的函数
 * @param {number} wait - 等待时长，单位为毫秒
 * @param {boolean} immediate - 是否立即执行一次（在等待期间不再触发）
 * @returns {Function} - 返回一个防抖处理过的函数
 */
function debounce(func, wait, immediate = false) {
    let timeout;

    // 返回一个函数，这个函数在每次被调用时会清除之前的定时器并重新设置
    return function (...args) {
        // 如果是 immediate 模式，第一次执行后则不再执行
        const context = this;

        if (timeout) clearTimeout(timeout);

        if (immediate) {
            // 如果已经执行过，不再执行
            const callNow = !timeout;
            timeout = setTimeout(() => {
                timeout = null;
            }, wait);
            if (callNow) func.apply(context, args);
        } else {
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        }
    };
}

/**
 * 检查给定的字符串是否是一个有效的URL
 * @param {string} string - 需要验证的字符串
 * @returns {boolean} - 如果字符串是一个有效的URL，返回true，否则返回false
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 带有超时功能的fetch请求
 * @param {string} url - 请求的URL
 * @param {Object} options - fetch请求的选项
 * @param {number} [timeout=3000] - 超时时间，单位毫秒
 * @returns {Promise} - 解析为响应对象的Promise
 * @throws {Error} - 如果请求超时，抛出带有"请求超时"消息的错误
 */
function fetchWithTimeout(url, options, timeout = 3000) {
    // 创建一个超时的Promise
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    return fetch(url, {
        ...options,
        signal: controller.signal  // 将AbortController的signal属性传递给fetch
    })
        .then(response => {
            clearTimeout(id);  // 如果请求成功，清除超时定时器
            return response;
        })
        .catch(error => {
            clearTimeout(id);  // 如果请求失败，清除超时定时器
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            } else {
                throw error;
            }
        });
}

/**
 * 在树结构中查找满足条件的节点
 * @param {Object} node - 树中的节点
 * @param {function} predicate - 用于测试节点是否满足条件的函数
 * @returns {Object|null} - 找到的第一个满足条件的节点，如果未找到则返回 null
 */
function findInTree(node, predicate) {
    // 如果 node 是数组，遍历数组中的每个元素
    if (Array.isArray(node)) {
        for (let item of node) {
            const result = findInTree(item, predicate);
            if (result) {
                return result;
            }
        }
    } else {
        // 检查当前节点是否满足条件函数
        if (predicate(node)) {
            return node;
        }

        // 如果当前节点有子节点，递归查找子节点
        if (node.children && node.children.length > 0) {
            for (let child of node.children) {
                const result = findInTree(child, predicate);
                if (result) {
                    return result;
                }
            }
        }
    }

    // 如果未找到，返回 null
    return null;
}

/**
 * 从树结构中删除满足条件的节点
 * @param {Object} node - 树中的节点
 * @param {function} predicate - 用于测试节点是否满足条件的函数
 * @returns {boolean} - 如果找到并删除了节点，返回 true；否则返回 false
 */
function deleteFromTree(node, predicate) {
    // 如果 node 是数组，遍历数组中的每个元素
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            if (predicate(node[i])) {
                // 如果找到匹配的节点，从数组中删除
                node.splice(i, 1);
                return true; // 删除成功，返回 true
            } else {
                // 递归处理子节点
                deleteFromTree(node[i], predicate);
            }
        }
    } else {
        // 如果 node 是单个对象
        if (node.children && node.children.length > 0) {
            for (let i = 0; i < node.children.length; i++) {
                if (predicate(node.children[i])) {
                    // 如果找到匹配的节点，从 children 中删除
                    node.children.splice(i, 1);
                    return true; // 删除成功，返回 true
                } else {
                    // 递归处理子节点
                    deleteFromTree(node.children[i], predicate);
                }
            }
        }
    }

    // 如果未找到匹配项，返回 false
    return false;
}

/**
 * 在树结构中添加一个新节点
 * @param {Object} node - 树中的节点
 * @param {function} predicate - 用于测试节点是否满足条件的函数
 * @param {Object} newNode - 要添加的新节点
 * @returns {boolean} - 如果成功添加了新节点，返回 true；否则返回 false
 */
function addToTree(node, predicate, newNode) {
    // 如果 node 是数组，遍历数组中的每个元素
    if (Array.isArray(node)) {
        for (let item of node) {
            // 递归检查每个子节点
            if (addToTree(item, predicate, newNode)) {
                return true; // 添加成功，停止递归
            }
        }
    } else {
        // 如果当前节点满足 predicate 条件，添加新节点到当前节点的 children
        if (predicate(node)) {
            // 确保 node 有 children 属性
            if (!node.children) {
                node.children = [];
            }
            node.children.push(newNode);
            return true; // 添加成功，返回 true
        }

        // 如果当前节点有子节点，继续递归查找
        if (node.children && node.children.length > 0) {
            for (let child of node.children) {
                if (addToTree(child, predicate, newNode)) {
                    return true; // 添加成功，停止递归
                }
            }
        }
    }

    // 如果没有找到符合条件的节点，返回 false
    return false;
}

/**
 * 压缩图像到指定大小
 * @param {File} file - 要压缩的图像文件
 * @param {number} targetSize - 目标大小，单位为KB
 * @param {function} callback - 压缩完成后的回调函数，接收压缩后的文件作为参数
 * @returns {void}
 */
function compressImageToTargetSize(file, targetSize, callback) {
    var reader = new FileReader();
    reader.onload = function (event) {
        var img = new Image();
        img.onload = function () {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var quality = 0.92; // 初始质量

            function tryCompress() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                var dataURL = canvas.toDataURL('image/jpeg', quality);
                var byteString = atob(dataURL.split(',')[1]);
                var byteLength = byteString.length;

                if (byteLength <= targetSize * 1024) {
                    // 文件大小达到目标，转换为Blob并回调
                    var mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
                    var ab = new ArrayBuffer(byteString.length);
                    var ia = new Uint8Array(ab);
                    for (var i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    var blob = new Blob([ab], {type: mimeString});
                    var newFile = new File([blob], "compressed.jpg", {type: mimeString, lastModified: Date.now()});
                    callback(newFile);
                } else {
                    // 如果文件太大，降低质量并重试
                    quality -= 0.02;
                    if (quality < 0.01) {
                        console.error('Unable to compress image to target size');
                        return;
                    }
                    tryCompress();
                }
            }

            tryCompress();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * 检查给定的Blob对象是否是一个图像文件
 * @param {Blob} blob - 需要验证的Blob对象
 * @param {string} url - Blob对象的URL
 * @param {Array<string>} arrtype - 允许的文件扩展名列表
 * @returns {boolean} - 如果Blob对象是一个图像文件，返回true，否则返回false
 */
function isImageBlob(blob, url, arrtype) {
    // 检查Blob是否为空
    if (!blob) {
        return false;
    }
    // 获取Blob的MIME类型
    const type = blob.type;
    if (type === "application/octet-stream" && url && arrtype) {
        return arrtype.some((item) => url.endsWith(`.${item}`));
    }
    // 检查MIME类型是否以'image/'开头
    return /^image\//.test(type);
}

/**
 * 将 Blob 对象转换为 Base64 编码字符串
 * @param {Blob} blob - 要转换的 Blob 对象
 * @returns {Promise<string>} - 解析为 Base64 编码字符串的 Promise
 * @throws {Error} - 如果在转换过程中发生错误，则抛出错误
 */
function convertBlobToBase64(blob) {
    return new Promise((resolve, reject) => {
        if (blob && blob.size > 0) {
            const reader = new FileReader();

            // 读取Blob并转换为Data URL
            reader.onloadend = () => {
                resolve(reader.result);
            };

            reader.onerror = (error) => {
                reject('Error converting Blob to Base64: ' + error);
            };

            reader.readAsDataURL(blob);
        } else {
            reject('Blob is empty');
        }
    });
}

/**
 * 查找并返回目标文件夹的所有父文件夹
 * @param {Object[]} folders - 文件夹结构的数组，每个文件夹对象包含 id 和 children 属性
 * @param {number} targetId - 目标文件夹的 id
 * @returns {Object[]} - 包含目标文件夹所有父文件夹的数组，从根文件夹开始
 */
function findParentFolders(folders, targetId) {
    let result = [];

    // 定义递归查找父类的函数
    function findFolder(folders, id) {
        for (const folder of folders) {
            if (folder.id === id) {
                result.push(folder); // 找到目标文件夹，将其加入路径
                return true; // 找到后返回
            }

            // 如果当前文件夹有子文件夹，继续在子文件夹中查找
            if (folder.children && folder.children.length > 0) {
                if (findFolder(folder.children, id)) {
                    result.push(folder); // 找到目标文件夹，加入路径
                    return true;
                }
            }
        }
        return false; // 没有找到目标文件夹
    }

    findFolder(folders, targetId);
    return result.reverse(); // 反转顺序从根到目标文件夹
}

// 获取图标的 Blob 数据
async function fetchFaviconBlobData(url, iconLinks) {
    try {
        let faviconUrl;
        let blob = null;

        // 如果找到了图标链接，尝试获取图标数据
        if (iconLinks.length > 0) {
            for (let i = 0; i < iconLinks.length; i++) {
                let href = iconLinks[i];

                // 判断 href 是否为绝对路径或相对路径
                if (href.startsWith('http')) {
                    faviconUrl = href;
                } else {
                    // 将相对路径转换为绝对路径
                    faviconUrl = new URL(href, url).href;
                }

                // 获取图标的二进制数据
                const iconResponse = await fetch(faviconUrl, {
                    headers: _browserRelatedHeaders
                });
                if (iconResponse.ok) {
                    blob = await iconResponse.blob();
                    break;
                }
            }
        } else {
            // 如果没有找到 <link> 标签，使用默认的 /favicon.ico
            faviconUrl = new URL('/favicon.ico', url).href;
            const iconResponse = await fetch(faviconUrl, {
                headers: _browserRelatedHeaders
            });
            if (iconResponse.ok) {
                blob = await iconResponse.blob();
            }
        }

        return {blob, faviconUrl};
    } catch (error) {
        console.error('Error fetching favicon:', error);
        return {blob: null, faviconUrl: null};
    }
}

// 声明图像比较图片大小(越小速度越快，但是准确率会降低)
const _compareSize = 2;
// 域名级 favicon 判断结果缓存（避免同一域名重复异步判断）
const _faviconCheckCache = new Map();

function faviconURL(iconUrl, size) {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", iconUrl);
    url.searchParams.set("size", size);
    return url.toString();
}

// 加载图像并缩放为小尺寸像素数据
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = _compareSize;
            canvas.height = _compareSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, _compareSize, _compareSize);
            resolve(ctx.getImageData(0, 0, _compareSize, _compareSize));
        };
        img.onerror = reject;
        img.src = url;
    });
}

// 比较图像数据
function areImageDataEqual(a, b) {
    if (a.width !== b.width || a.height !== b.height) return false;
    const dataA = a.data;
    const dataB = b.data;
    for (let i = 0; i < dataA.length; i++) {
        if (dataA[i] !== dataB[i]) return false;
    }
    return true;
}

// 预加载浏览器默认图标的像素数据（初始化时提前调用，避免首屏逐个判断时等待）
export function preloadFaviconDefaultData() {
    if (_defaultImageData) return Promise.resolve(_defaultImageData);
    return loadImage(faviconURL("undefined", _compareSize))
        .then((data) => {
            _defaultImageData = data;
            return data;
        })
        .catch(() => null);
}

// 检查站点是否拥有真实 favicon（非浏览器默认图标），结果按域名缓存
async function checkFavicon(url) {
    let domain = url;
    try {
        domain = new URL(url).hostname;
    } catch { /* 保留原值 */ }
    if (_faviconCheckCache.has(domain)) {
        return _faviconCheckCache.get(domain);
    }
    const isCustom = await checkFaviconWithoutCache(url);
    _faviconCheckCache.set(domain, isCustom);
    return isCustom;
}

async function checkFaviconWithoutCache(url) {
    try {
        const ref = await preloadFaviconDefaultData();
        if (!ref) return false;
        const targetData = await loadImage(faviconURL(url, _compareSize));
        return !areImageDataEqual(targetData, ref);
    } catch (e) {
        return false;
    }
}

// 获取站点 favicon：初始返回自定义默认图标，确认站点有真实图标后才异步替换为 favicon 地址。
// 这样没有图标的站点不会先显示浏览器默认图标，再等一秒才替换。
function getFaviconURL(image, pageUrl, size = 32) {
    checkFavicon(pageUrl).then(isCustom => {
        image.src = isCustom ? faviconURL(pageUrl, size) : default_svg;
    });

    return default_svg;
}

export {
    fetchFaviconAsBase64,
    debounce,
    findInTree,
    deleteFromTree,
    convertBlobToBase64,
    compressImageToTargetSize,
    isValidUrl,
    findParentFolders,
    fetchFaviconBlobData,
    isImageBlob,
    getFaviconURL
};
async function fetchFaviconAsBase64(url) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!isValidUrl(url)) return null;
            // 获取网站的 HTML 源代码
            fetchWithTimeout(url, {}, 3000)
                .then(response => response.text())
                .then(async text => {
                    // 使用 DOMParser 来解析 HTML
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/html');

                    // 查找 <link rel="icon"> 或 <link rel="shortcut icon">
                    let iconLink = doc.querySelector('link[rel="icon"]') || doc.querySelector('link[rel="shortcut icon"]');

                    // 如果没有找到图标链接，尝试使用默认路径 /favicon.ico
                    let faviconUrl;
                    if (iconLink) {
                        let href = iconLink.getAttribute('href');
                        // 判断 href 是否为相对路径
                        if (href.startsWith('http') && href.startsWith('//')) {
                            faviconUrl = href;
                        } else {
                            // 将相对路径转换为绝对路径
                            faviconUrl = new URL(href, url).href;
                        }
                    } else {
                        // 如果没有找到 <link> 标签，使用默认的 /favicon.ico
                        faviconUrl = new URL('/favicon.ico', url).href;
                    }

                    // 获取图标的二进制数据
                    const iconResponse = await fetch(faviconUrl);
                    const blob = await iconResponse.blob();

                    if (isImageBlob(blob)) {//判断是否是图片
                        // 读取 Blob 数据并转换为 Base64
                        const base64 = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob); // 将 Blob 转换为 Base64
                        });

                        resolve(base64);
                    } else {
                        resolve(null);
                    }
                }).catch(error => {
                    // console.error('Error fetching favicon:', error);
                    resolve(null);
                });
        } catch (error) {
            // console.error('Error fetching favicon:', error);
            resolve(null);
        }
    });
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
                    var blob = new Blob([ab], { type: mimeString });
                    var newFile = new File([blob], "compressed.jpg", { type: mimeString, lastModified: Date.now() });
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
 * @returns {boolean} - 如果Blob对象是一个图像文件，返回true，否则返回false
 */
function isImageBlob(blob) {
    // 获取Blob的MIME类型
    const type = blob.type;
    // 检查MIME类型是否以'image/'开头
    return /^image\//.test(type);
}

export { fetchFaviconAsBase64, debounce };
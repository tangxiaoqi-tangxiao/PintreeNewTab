async function fetchFaviconAsBase64(url) {
    try {
        // 获取网站的 HTML 源代码
        const response = await fetch(url);
        const text = await response.text();

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

        // 读取 Blob 数据并转换为 Base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob); // 将 Blob 转换为 Base64
        });

        return base64;
    } catch (error) {
        console.error('Error fetching favicon:', error);
        return null;
    }
}



export { fetchFaviconAsBase64 };
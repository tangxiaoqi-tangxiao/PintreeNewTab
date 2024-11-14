
// 发送消息给后台脚本
chrome.runtime.sendMessage({type: "GetWebUrlIsExist", message: window.location.hostname}, (response) => {
    if (response.message) {
        console.log("获取icon");
        // 查找 <link rel="icon"> 或 <link rel="shortcut icon">
        let iconLinks = Array.from(document.querySelectorAll('link'))
            .filter(link => link.getAttribute('rel').includes('icon'))
            .map(link => link.getAttribute('href'));
        let protocolAndDomain = window.location.protocol + "//" + window.location.hostname;
        chrome.runtime.sendMessage({
            type: "SaveWebIcon",
            message: {
                url: protocolAndDomain,
                iconLinks
            }
        });
    }
});

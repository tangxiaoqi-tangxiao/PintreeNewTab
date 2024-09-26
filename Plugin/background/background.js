const newTabUrls = [
  'chrome://newtab/',      // Chrome
  'edge://newtab/',       // Edge
];

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: "index.html"
  });
});

chrome.tabs.onCreated.addListener(function (tab) {
  chrome.storage.sync.get('openInNewTab', (data) => {
    if (data.openInNewTab) {
      // 如果是新标签页，重定向到自定义页面
      if (newTabUrls.includes(tab.pendingUrl)) {
        chrome.tabs.update(tab.id, { url: 'index.html' });
      }
    }
  });
});

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  OpenNewPage();
});

//打开新页面
function OpenNewPage() {
  // 打开扩展页面
  browser.action.onClicked.addListener(() => {
    const url = browser.runtime.getURL('/page.html');
    browser.tabs.create({
      url: url,
    });
  });
}
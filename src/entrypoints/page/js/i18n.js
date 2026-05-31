// 国际化：将页面中所有带i18n类名的元素替换为对应语言的文本
export function i18n() {
    let appName_i18ns = [...document.getElementsByClassName("appName_i18n")];
    appName_i18ns.forEach((item) => {
        item.textContent = browser.i18n.getMessage("appName");
    });
    let save_i18ns = [...document.getElementsByClassName("save_i18n")];
    save_i18ns.forEach((item) => {
        item.textContent = browser.i18n.getMessage("save");
    });
    let cancel_i18ns = [...document.getElementsByClassName("cancel_i18n")];
    cancel_i18ns.forEach((item) => {
        item.textContent = browser.i18n.getMessage("cancel");
    });

    const searchInput = document.getElementById('searchInput');
    const bookmark_i18n = document.getElementById('bookmark_i18n');
    const web_search_i18n = document.getElementById('web_search_i18n');
    const ai_search_i18n = document.getElementById('ai_search_i18n');
    const set_i18n = document.getElementById('set_i18n');
    const setContextMenu_i18n = document.getElementById('setContextMenu_i18n');
    const setOpenNewTab_i18n = document.getElementById('setOpenNewTab_i18n');
    const copyUrl_i18n = document.getElementById('copyUrl_i18n');
    const editBookmark_i18n = document.getElementById('editBookmark_i18n');
    const del_i18n = document.getElementById('del_i18n');
    const bookmarkAdd_i18n = document.getElementById('bookmarkAdd_i18n');
    const newFolder_i18n = document.getElementById('newFolder_i18n');
    const infoEdit_i18n = document.getElementById('infoEdit_i18n');
    const IconDescribe_i18n = document.getElementById('IconDescribe_i18n');
    const websiteLink_i18n = document.getElementById('websiteLink_i18n');
    const websiteLink = document.getElementById('websiteLink');
    const websiteLinkError_i18n = document.getElementById('websiteLinkError_i18n');
    const websiteName_i18n = document.getElementById('websiteName_i18n');
    const websiteName = document.getElementById('websiteName');
    const websiteNameError_i18n = document.getElementById('websiteNameError_i18n');
    const iconEdit_i18n = document.getElementById('iconEdit_i18n');
    const iconChoose_i18n = document.getElementById('iconChoose_i18n');
    const default_i18n = document.getElementById('default_i18n');
    const official_i18n = document.getElementById('official_i18n');
    const upload_i18n = document.getElementById('upload_i18n');
    const uploadImage_i18n = document.getElementById('uploadImage_i18n');
    const newFolderName = document.getElementById('newFolderName');
    const folderNameNotEmpty_i18n = document.getElementById('folderNameNotEmpty_i18n');

    searchInput.setAttribute("placeholder", browser.i18n.getMessage("search"));
    bookmark_i18n.textContent = browser.i18n.getMessage("bookmark");
    web_search_i18n.textContent = browser.i18n.getMessage("web_search");
    ai_search_i18n.textContent = browser.i18n.getMessage("ai_search");

    set_i18n.textContent = browser.i18n.getMessage("set");
    setContextMenu_i18n.textContent = browser.i18n.getMessage("setContextMenu");
    setOpenNewTab_i18n.textContent = browser.i18n.getMessage("setOpenNewTab");

    copyUrl_i18n.textContent = browser.i18n.getMessage("copyUrl");
    editBookmark_i18n.textContent = browser.i18n.getMessage("editBookmark");
    del_i18n.textContent = browser.i18n.getMessage("del");
    bookmarkAdd_i18n.textContent = browser.i18n.getMessage("bookmarkAdd");
    newFolder_i18n.textContent = browser.i18n.getMessage("newFolder");

    infoEdit_i18n.textContent = browser.i18n.getMessage("infoEdit");
    IconDescribe_i18n.textContent = browser.i18n.getMessage("IconDescribe");
    websiteLink_i18n.textContent = browser.i18n.getMessage("websiteLink");
    websiteLink.setAttribute("placeholder", browser.i18n.getMessage("websiteLinkPlaceholder"));
    websiteLinkError_i18n.textContent = browser.i18n.getMessage("websiteLinkError");
    websiteName_i18n.textContent = browser.i18n.getMessage("websiteName");
    websiteName.setAttribute("placeholder", browser.i18n.getMessage("websiteNamePlaceholder"));
    websiteNameError_i18n.textContent = browser.i18n.getMessage("websiteNameError");
    iconEdit_i18n.textContent = browser.i18n.getMessage("iconEdit");
    iconChoose_i18n.textContent = browser.i18n.getMessage("iconChoose");
    default_i18n.textContent = browser.i18n.getMessage("default");
    official_i18n.textContent = browser.i18n.getMessage("official");
    upload_i18n.textContent = browser.i18n.getMessage("upload");
    uploadImage_i18n.textContent = browser.i18n.getMessage("uploadImage");

    newFolderName.setAttribute("placeholder", browser.i18n.getMessage("newFolderName"));
    folderNameNotEmpty_i18n.textContent = browser.i18n.getMessage("folderNameNotEmpty");
}

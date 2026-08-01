// 新功能提醒：展示当前版本（扩展版本号）的更新内容，已确认的版本不再提醒

// 当前版本的更新说明
const changelogList = [
    {
        title: "新功能",
        content: [
            "新增「文件夹排在所有书签前面」设置",
            "新增主题模式切换（浅色/自动/深色）",
            "侧边栏支持拖动调整宽度并保存",
            "新增新版本功能提醒",
        ],
    },
];

// 获取当前扩展版本号
function getCurrentVersion() {
    try {
        return chrome.runtime.getManifest().version;
    } catch (e) {
        return "";
    }
}

// 读取已确认的版本号并决定是否展示提醒
export function ShowChangelog() {
    const current = getCurrentVersion();
    if (!current) return;

    const changelog = changelogList[0];
    if (!changelog) return;

    browser.storage.sync.get('ChangelogConfirmed', (data) => {
        if (data.ChangelogConfirmed === current) {
            return; // 该版本已确认过，不再提醒
        }

        const modal = document.getElementById('changelog_modal');
        if (!modal) return;

        document.getElementById('changelogVersion').textContent = "v" + current;
        document.getElementById('changelogTitle').textContent = changelog.title;

        const contentList = document.getElementById('changelogContent');
        contentList.innerHTML = "";
        changelog.content.forEach(text => {
            const li = document.createElement('li');
            li.className = "flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300";
            li.innerHTML = `<svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>${text}</span>`;
            contentList.appendChild(li);
        });

        // 确认按钮：记录已确认的版本号
        const confirmBtn = document.getElementById('changelogConfirm');
        confirmBtn.onclick = () => {
            browser.storage.sync.set({ ChangelogConfirmed: current });
            modal.close();
        };

        modal.showModal();
    });
}

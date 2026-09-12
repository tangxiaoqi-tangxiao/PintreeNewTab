// 本文件由 scripts/sync-changelog.mjs 自动生成，请勿手动编辑
// 更新说明请写在 release.md，npm run build / zip 时自动同步
export const changelogList = [
  {
    title: "修复侧边栏初始化闪烁与存储写入配额报错",
    content: [
      "1. 修复刷新或新开标签时右侧导航栏闪烁、展开过程可见的问题：初始化等待默认文件夹展开完成后再隐藏加载遮罩，整页内容一次呈现",
      "2. 优化侧边栏初始化动画：加载完成后不再显示箭头展开动画，点击文件夹时仍保留平滑旋转动画",
      "3. 修复浏览器存储写入配额报错（MAX_WRITE_OPERATIONS_PER_MINUTE）：搜索选项仅在用户真实点击时保存，不再每次打开标签都触发 storage 写入",
      "4. 所有浏览器存储写入增加错误日志，写入失败不再出现未捕获的 Promise 报错",
    ],
  },
];

// 本文件由 scripts/sync-changelog.mjs 自动生成，请勿手动编辑
// 更新说明请写在 release.md，npm run build / zip 时自动同步
export const changelogList = [
  {
    title: "添加书签重复检测与状态重置",
    content: [
      "1. 新建或编辑书签保存时，自动检索全部书签中的链接，若已存在相同链接则拦截保存并提示「书签已存在」，提示位置与「无效链接地址」一致（同步 7 种语言文案）",
      "2. 每次右键添加/编辑书签都会重置表单与错误提示状态，错误提示不再残留",
    ],
  },
];

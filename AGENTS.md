# PintreeNewTab 项目指南

## 项目概述
PintreeNewTab 是一个浏览器扩展，将书签转换为美观的新标签页导航页面。支持 Chrome/Edge。

## 技术栈
- **框架**: WXT (Web Extension Tools)
- **语言**: TypeScript + JavaScript  
- **样式**: Tailwind CSS + DaisyUI
- **包管理**: npm

## 关键目录
- `src/entrypoints/page/` - 新标签页主界面（HTML + CSS + JS）
  - `js/index.js` - 核心业务逻辑，页面初始化入口
  - `js/bookmarkApi.js` - 书签获取、排序（文件夹前置排序）、删除缓存
  - `js/bookmarkRender.js` - 书签/文件夹卡片渲染、空状态、文件夹图标预览
  - `js/bookmarkEditor.js` - 书签编辑弹窗（新建/编辑/图标选择）
  - `js/contextMenu.js` - 右键菜单（书签操作、新建书签/文件夹）
  - `js/sidebar.js` - 侧边栏导航树渲染
  - `js/breadcrumb.js` - 面包屑导航
  - `js/search.js` - 搜索（书签/网页/AI）
  - `js/drag.js` - 书签拖拽排序（sortablejs）
  - `js/settings.js` - 设置项绑定（右键菜单、新标签页、文件夹图标、文件夹前置、主题模式）
  - `js/theme.js` - 主题应用与切换（浅色/自动/深色）
  - `js/state.js` - 全局状态（当前文件夹、面包屑、图标模式）
  - `js/i18n.js` - 国际化文案填充
  - `css/` - 样式（`index.css` 入口 + `styles.css` Tailwind/daisyUI 配置）
  - `config/index.js` - IndexedDB 数据库名配置
  - `utils/` - 工具函数（`IndexedDB.js` 数据库封装, `utils.js` favicon处理/树操作）
- `src/entrypoints/background/` - 后台脚本（点击插件图标打开新标签页）
- `src/entrypoints/content/` - 内容脚本（当前为空）
- `public/_locales/` - 国际化文件 (7种语言)

## 主要功能
1. **书签管理** - 获取、渲染、编辑、删除、创建书签/文件夹，支持拖拽排序
2. **搜索** - 书签搜索、网页搜索(Google/Bing/百度)、AI搜索(ChatGPT/Perplexity/秘塔)
3. **图标管理** - 自动获取favicon，支持本地上传，IndexedDB缓存
4. **主题切换** - 明/暗主题，跟随系统
5. **国际化** - 支持中/英/日/韩/俄/德语

## 构建命令
```bash
npm install        # 安装依赖
npm run dev        # 开发模式
npm run build      # 生产构建
npm run zip        # 打包扩展
```

## 权限说明
- `storage` - 存储用户设置
- `bookmarks` - 访问浏览器书签  
- `favicon` - 获取网站图标

## 核心依赖
- `sortablejs` - 书签拖拽排序
- `wxt` - Web扩展开发框架
- `tailwindcss` (v4) + `daisyui` (v5) - UI样式

## 文字颜色体系
浅色与深色模式下的文字颜色采用统一对应关系，保证两种模式下文字清晰可读。新增或修改文字元素时遵循以下对应关系：

| 用途 | 浅色模式 | 深色模式 |
| --- | --- | --- |
| 标题/主文字（应用名、弹窗标题、书签标题、输入框文字） | `text-gray-900` | `dark:text-gray-100` |
| 标签（表单标签、侧边栏导航） | `text-gray-700` | `dark:text-gray-300` |
| 正文/次要（页脚、搜索图标、空状态提示） | `text-gray-500` | `dark:text-gray-400` |
| 弱化文字（图标选项标签、书签URL） | `text-gray-600` | `dark:text-gray-400` |

规则：
- 每个文字元素必须同时设置浅色和深色，缺一不可（浅色用深灰、深色用浅灰，一一对应）。
- 禁止出现颜色倒置（如深色模式比浅色模式更暗）或对比度过低（如浅色模式用 `gray-400` 以下）。
- 弹窗/菜单等容器内若未显式设置文字颜色，会继承 daisyUI 的 `--color-base-content`（浅色近黑、深色近白），此时不需要额外添加 `text-*` 类。

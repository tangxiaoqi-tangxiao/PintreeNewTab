import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  manifestVersion: 3,
  manifest: {
    name: '__MSG_appName__',
    description: '__MSG_appDesc__',
    default_locale: 'zh_CN',
    version: "1.0.16",
    permissions: ['storage',"bookmarks","favicon"],
    icons: {
      16: 'icon/favicon_16x16.png',
      32: 'icon/favicon_32x32.png',
      48: 'icon/favicon_48x48.png',
      128: 'icon/favicon_128x128.png',
    },
    action: {
      default_title: '__MSG_appTitle__',
    },
    web_accessible_resources: [
      {
        resources: ["_favicon/*"],
        matches: ["<all_urls>"]
      },
    ],
  },
});

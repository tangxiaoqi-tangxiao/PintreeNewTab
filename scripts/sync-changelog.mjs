// 发版自动化：从 release.md 的当前版本分节生成 changelog.data.js
// 由 npm prebuild / prezip 自动触发，版本号统一来自 scripts/get-version.mjs（APP_VERSION > 最新 git tag > package.json）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getVersion } from './get-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'src', 'entrypoints', 'page', 'js', 'changelog.data.js');

// 解析 release.md 中的版本分节（## v1.2.4 标题 + 条目列表），只应保留当前版本的更新内容
function parseFirstSection() {
  const mdPath = join(root, 'release.md');
  if (!existsSync(mdPath)) return null;
  const md = readFileSync(mdPath, 'utf8');

  const sections = [];
  for (const part of md.split(/^##\s+/m).map((s) => s.trim()).filter(Boolean)) {
    const lines = part.split(/\r?\n/);
    const m = lines[0].match(/^v?(\d+\.\d+\.\d+)(?:\s+(.*))?$/);
    if (!m) continue;
    sections.push({
      version: m[1],
      title: (m[2] || '更新说明').trim(),
      items: lines
        .slice(1)
        .map((l) => l.trim().replace(/\*\*/g, '').replace(/^[-*]\s+/, ''))
        .filter((l) => l && !/^-{3,}$/.test(l)),
    });
  }
  if (sections.length === 0) return null;
  if (sections.length > 1) {
    console.warn(
      `[sync-changelog] release.md 包含 ${sections.length} 个版本分节，本文件只应保留当前版本内容，将使用第一个（v${sections[0].version}）`
    );
  }
  return sections[0];
}

const section = parseFirstSection();
const version = getVersion();

if (!section) {
  console.warn('[sync-changelog] release.md 中未找到版本分节（格式：## v1.2.4 标题），跳过生成');
  process.exit(0);
}

// 一致性保护：分节版本与当前版本不一致时阻止打包，防止版本号与弹窗文案错配
if (section.version !== version) {
  console.error(
    `[sync-changelog] 版本不一致：release.md 第一个分节是 v${section.version}，当前版本是 v${version}。\n` +
    `  请先创建 tag：git tag v${section.version}\n` +
    `  （临时打包可用环境变量覆盖：APP_VERSION=v${section.version} npm run zip）`
  );
  process.exit(1);
}

const data = `// 本文件由 scripts/sync-changelog.mjs 自动生成，请勿手动编辑
// 更新说明请写在 release.md，npm run build / zip 时自动同步
export const changelogList = [
  {
    title: ${JSON.stringify(section.title)},
    content: [
${section.items.map((item) => `      ${JSON.stringify(item)},`).join('\n')}
    ],
  },
];
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, data, 'utf8');
console.log(`[sync-changelog] 已生成 changelog.data.js（v${version}，${section.items.length} 条）`);
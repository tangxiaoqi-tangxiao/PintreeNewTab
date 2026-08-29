// 通用版本号获取：供 wxt.config.ts、scripts/sync-changelog.mjs 等统一使用
// 优先级：环境变量 APP_VERSION > 最新 git tag > package.json > "0.0.0"
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function getVersion() {
  if (process.env.APP_VERSION) {
    return String(process.env.APP_VERSION).replace(/^v/, '');
  }
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    if (tag) {
      return tag.replace(/^v/, '');
    }
  } catch {
    /* 无 git tag 时继续回退 */
  }
  try {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
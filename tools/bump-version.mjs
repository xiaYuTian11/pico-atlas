/**
 * 版本号三处同步（package.json / build.gradle / latest.json）。
 *
 * 用法：
 *   node tools/bump-version.mjs 0.1.1     # 指定版本
 *   node tools/bump-version.mjs patch     # 0.1.0 → 0.1.1
 *   node tools/bump-version.mjs minor     # 0.1.0 → 0.2.0
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PKG = path.join(ROOT, 'package.json');
const GRADLE = path.join(ROOT, 'android/app/build.gradle');
const FEED = path.join(ROOT, 'public/updates/latest.json');

const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const arg = process.argv[2] ?? 'patch';

function bump(v, kind) {
  const [a = 0, b = 0, c = 0] = v.split('.').map((n) => parseInt(n, 10) || 0);
  if (kind === 'major') return `${a + 1}.0.0`;
  if (kind === 'minor') return `${a}.${b + 1}.0`;
  if (kind === 'patch') return `${a}.${b}.${c + 1}`;
  return kind.replace(/^v/, '');
}

const next = bump(pkg.version, arg);
const [maj, min, pat] = next.split('.').map((n) => parseInt(n, 10) || 0);
const code = maj * 10000 + min * 100 + pat;

pkg.version = next;
fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

if (fs.existsSync(GRADLE)) {
  let g = fs.readFileSync(GRADLE, 'utf8');
  g = g.replace(/versionName "[^"]*"/, `versionName "${next}"`);
  g = g.replace(/versionCode \d+/, `versionCode ${code}`);
  fs.writeFileSync(GRADLE, g, 'utf8');
}

if (fs.existsSync(FEED)) {
  const feed = JSON.parse(fs.readFileSync(FEED, 'utf8'));
  feed.version = next;
  if (feed.url) {
    feed.url = feed.url
      .replace(/\/v[^/]+\//, `/v${next}/`)
      .replace(/pico-atlas-[^/]+\.apk$/, `pico-atlas-${next}.apk`);
  }
  fs.writeFileSync(FEED, JSON.stringify(feed, null, 2) + '\n', 'utf8');
}

console.log(`版本：${pkg.version} → ${next}（versionCode ${code}）`);
console.log('已同步 package.json / build.gradle / latest.json');

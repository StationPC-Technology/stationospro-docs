// 修正转换遗留的站内链接。
// 旧站链接形态：`/zh-CN/pocketcloud/x`、`/portable/pocketcloud/x`、`/portable/contact/contact`、
//                以及 changelog 索引里的绝对链接 `/<lang>/portable/changelog/DATE`。
// 跑法：node scripts/portable/fix-links.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve(import.meta.dirname, '../..');
const CONTENT = path.join(DOCS, 'content/docs');
const DRY = process.argv.includes('--dry');

const RULES = [
  // changelog 索引：绝对链接改成相对链接，fumadocs 的 createRelativeLink 会按当前语言解析
  { from: /\]\(\/(?:zh|zh-Hant|ja|ko|de|fr|es)\/portable\/changelog\/(\d{4}-\d{2}-\d{2})\)/g, to: '](./$1)' },
  // 联系我们已提升为站级页面
  { from: /\(\/portable\/contact\/contact\)/g, to: '(/contact)' },
  // 转换时多留了一层 pocketcloud，且目标目录已归位
  { from: /\(\/portable\/pocketcloud\/setup-smtp\)/g, to: '(/portable/setting/setup-smtp)' },
  { from: /\(\/portable\/pocketcloud\/remote-access\)/g, to: '(/portable/guides/remote-access)' },
  { from: /\(\/portable\/pocketcloud\//g, to: '(/portable/' },
  // 旧站带语言前缀的绝对链接
  { from: /\(\/(?:zh-CN|zh-TW|ja-JP|ko-KR|de-DE)\/pocketcloud\//g, to: '(/portable/' },
  // 旧站域名
  { from: /https?:\/\/help\.stationpc\.(?:cn|com)\/(?:zh-CN\/)?pocketcloud\//g, to: '/portable/' },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

let touched = 0;
for (const file of walk(CONTENT)) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  for (const rule of RULES) after = after.replace(rule.from, rule.to);
  if (after !== before) {
    touched += 1;
    console.log(`${DRY ? 'would fix' : 'fixed'} ${path.relative(DOCS, file)}`);
    if (!DRY) fs.writeFileSync(file, after);
  }
}
console.log(`\n${touched} file(s) ${DRY ? 'to update' : 'updated'}`);

#!/usr/bin/env node
/**
 * 同步译文 frontmatter 的 sourceHash。
 *
 * 读取指定（或全部）翻译语言文件对应中文源的内容 hash，写入/更新译文
 * frontmatter 中的 sourceHash 字段。翻译流程最后一步必须执行。
 *
 * 用法：
 *   node scripts/update-sourcehash.mjs           # 同步全部翻译语言的全部文件
 *   node scripts/update-sourcehash.mjs en ja     # 只同步指定语言
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content/docs');
const SOURCE_LOCALE = 'zh';
const TARGET_LOCALES = ['zh-Hant', 'en', 'ja', 'ko', 'de', 'fr', 'es'];

const locales = process.argv.slice(2).length ? process.argv.slice(2) : TARGET_LOCALES;
for (const locale of locales) {
  if (!TARGET_LOCALES.includes(locale)) {
    console.error(`未知语言: ${locale}（可选：${TARGET_LOCALES.join(', ')}）`);
    process.exit(1);
  }
}

const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);

/** 递归列出目录下所有 .mdx（相对 locale 根目录的 posix 风格路径，不含扩展名） */
function listMdx(dir, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listMdx(full, base));
    } else if (name.endsWith('.mdx')) {
      out.push(relative(base, full).replaceAll('\\', '/').replace(/\.mdx$/, ''));
    }
  }
  return out.sort();
}

let updated = 0;
let missing = 0;

for (const locale of locales) {
  for (const f of listMdx(join(CONTENT, locale))) {
    const zhFile = join(CONTENT, SOURCE_LOCALE, `${f}.mdx`);
    const targetFile = join(CONTENT, locale, `${f}.mdx`);
    if (!existsSync(zhFile)) continue; // 结构缺失由 check-content.mjs 报告
    if (!existsSync(targetFile)) { missing += 1; continue; }

    const current = hash(readFileSync(zhFile, 'utf8'));
    let text = readFileSync(targetFile, 'utf8');
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      text = `---\nsourceHash: ${current}\n---\n\n${text}`;
    } else if (/^sourceHash:\s*"?[0-9a-f]+"?\s*$/m.test(fmMatch[1])) {
      text = text.replace(/^sourceHash:\s*"?[0-9a-f]+"?\s*$/m, `sourceHash: ${current}`);
    } else {
      text = text.replace(/^---\r?\n/, `---\nsourceHash: ${current}\n`);
    }
    writeFileSync(targetFile, text);
    updated += 1;
  }
}

console.log(`✅ sourceHash 同步完成：更新 ${updated} 个文件${missing ? `，跳过 ${missing} 个缺失译文` : ''}`);

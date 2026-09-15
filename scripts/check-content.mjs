#!/usr/bin/env node
/**
 * 内容一致性校验（无测试框架，纯 Node 脚本）
 *
 * 检查项（zh 为唯一人工编写的源语言，其余语言由翻译流程生成）：
 * 1. 各语言目录结构与 zh 对齐（文件一一对应）
 * 2. meta.json 的 pages 数组与磁盘内容对应（pages 条目可以是页面名或文件夹名；
 *    Fumadocs 会把未登记的页面追加到末尾，故未登记降级为警告）
 * 3. 翻译过期检测：非 zh 语言的 frontmatter sourceHash 必须与当前 zh 源一致
 * 4. MDX 内部链接可解析（死链检查）
 *
 * 用法：node scripts/check-content.mjs
 * 退出码：0 通过 / 1 存在错误
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT = join(ROOT, 'content/docs');
const SOURCE_LOCALE = 'zh'; // 与 src/lib/i18n.ts 的 sourceLanguage 保持一致
const TARGET_LOCALES = ['zh-Hant', 'en', 'ja', 'ko', 'de', 'fr', 'es'];
const DEFAULT_LOCALE = 'en'; // 与 src/lib/i18n.ts 的 defaultLanguage 保持一致

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ---------- 工具 ----------

/** 目录的直接子项：.mdx 页面（不含扩展名）和子文件夹 */
function listChildren(dir) {
  const pages = [];
  const folders = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      folders.push(name);
    } else if (name.endsWith('.mdx')) {
      pages.push(name.replace(/\.mdx$/, ''));
    }
  }
  return { pages: pages.sort(), folders: folders.sort() };
}

/** 递归列出目录下所有 .mdx 文件（posix 风格相对路径，不含扩展名） */
function listMdx(dir, base = dir) {
  const out = [];
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

/** 列出目录下所有 meta.json（返回其所在子目录的 posix 相对路径，'' 为根） */
function listMetaDirs(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listMetaDirs(full, base));
    } else if (name === 'meta.json') {
      out.push(relative(base, dir).replaceAll('\\', '/'));
    }
  }
  return out.sort();
}

function readMeta(dirRel) {
  const file = join(CONTENT, dirRel, 'meta.json');
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(`meta.json 解析失败: ${file} — ${e.message}`);
    return null;
  }
}

// ---------- 检查 1：各语言目录结构对齐 zh ----------

const files = {};
for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES]) {
  const dir = join(CONTENT, locale);
  files[locale] = existsSync(dir) ? listMdx(dir) : [];
}

const sourceFiles = files[SOURCE_LOCALE];
for (const locale of TARGET_LOCALES) {
  for (const f of sourceFiles.filter((f) => !files[locale].includes(f))) {
    err(`[结构] zh 有而 ${locale} 缺失: content/docs/${locale}/${f}.mdx`);
  }
  for (const f of files[locale].filter((f) => !sourceFiles.includes(f))) {
    err(`[结构] ${locale} 有而 zh 缺失: content/docs/${locale}/${f}.mdx`);
  }
}

// ---------- 检查 2：meta.json 与磁盘内容对齐 ----------

for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES]) {
  if (!existsSync(join(CONTENT, locale))) continue; // 该语言尚未创建目录，检查 1 已报告缺失
  for (const dirRel of listMetaDirs(join(CONTENT, locale))) {
    const meta = readMeta(join(locale, dirRel));
    if (!meta || !Array.isArray(meta.pages)) continue;

    const dirAbs = join(CONTENT, locale, dirRel);
    const { pages, folders } = listChildren(dirAbs);
    const prefix = `content/docs/${locale}${dirRel ? '/' + dirRel : ''}`;

    for (const p of meta.pages) {
      if (!pages.includes(p) && !folders.includes(p)) {
        err(`[meta] ${prefix}/meta.json 引用了不存在的页面或文件夹: "${p}"`);
      }
    }
    const dup = meta.pages.filter((p, i) => meta.pages.indexOf(p) !== i);
    for (const d of dup) err(`[meta] ${prefix}/meta.json 中 "${d}" 重复出现`);

    for (const p of pages) {
      if (!meta.pages.includes(p)) {
        warn(`[meta] ${prefix}/${p}.mdx 未登记在 meta.json 的 pages 中（Fumadocs 会将其追加到栏目末尾）`);
      }
    }
  }
}

// ---------- 检查 3：翻译过期检测（sourceHash） ----------
//
// 各翻译语言 frontmatter 中的 sourceHash 记录了翻译时中文源文件的内容 hash。
// 中文源一旦修改，hash 对不上即判定该译文过期，需重新运行翻译（/translate-docs）。

/** 计算中文源文件内容 hash（与 skill 写入时使用同一算法：sha256 前 12 位） */
function sourceHashOf(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

/** 从 MDX 文本中解析 frontmatter 里的 sourceHash 字段 */
function parseSourceHash(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1].match(/^sourceHash:\s*"?([0-9a-f]+)"?\s*$/m);
  return fm ? fm[1] : undefined; // null=无 frontmatter；undefined=有 frontmatter 但无 sourceHash
}

for (const locale of TARGET_LOCALES) {
  for (const f of sourceFiles) {
    const targetFile = join(CONTENT, locale, `${f}.mdx`);
    if (!existsSync(targetFile)) continue; // 结构缺失已由检查 1 报告
    const text = readFileSync(targetFile, 'utf8');
    const recorded = parseSourceHash(text);
    const current = sourceHashOf(readFileSync(join(CONTENT, SOURCE_LOCALE, `${f}.mdx`), 'utf8'));
    if (recorded === null || recorded === undefined) {
      err(`[翻译] content/docs/${locale}/${f}.mdx 缺少 sourceHash 字段，请运行翻译流程（/translate-docs）`);
    } else if (recorded !== current) {
      err(`[翻译] content/docs/${locale}/${f}.mdx 已过期（中文源已修改），请重新运行翻译流程`);
    }
  }
}

// ---------- 检查 4：MDX 内部链接死链 ----------

const localePrefixRe = new RegExp(`^(?:(${[SOURCE_LOCALE, ...TARGET_LOCALES].join('|')})/)?docs(?:/(.*))?$`);

/** 把 URL path 解析成 [locale, slug]；返回 null 表示不是站内文档链接 */
function parseDocLink(href) {
  let path = href.split('#')[0].split('?')[0];
  if (!path) return null; // 纯锚点
  if (/^[a-z]+:\/\//i.test(href) || href.startsWith('mailto:')) return null; // 外链/邮件
  path = path.replace(/^\/+|\/+$/g, '');
  if (path === '') return null;
  // /zh/docs/<slug> | /docs/<slug>(默认语言 en) | /en/docs/<slug>(会 301)
  const m = path.match(localePrefixRe);
  if (!m) return null; // 非文档路由链接（如 /、/api/...），不检查
  const explicit = m[1];
  const slug = (m[2] ?? '').replace(/\.mdx?$/, '');
  const locale = explicit ?? DEFAULT_LOCALE;
  return { locale, slug, explicit, path };
}

const mdxLinkRe = /(?:\[([^\]]*)\]\(([^)\s]+)[^)]*\))|(?:href=["']([^"']+)["'])/g;

for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES]) {
  for (const f of files[locale]) {
    const file = join(CONTENT, locale, `${f}.mdx`);
    const text = readFileSync(file, 'utf8');
    // 去掉代码块和行内代码，避免示例代码里的链接被误报
    const cleaned = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    let m;
    while ((m = mdxLinkRe.exec(cleaned)) !== null) {
      const href = m[2] ?? m[3];
      if (!href) continue;
      const target = parseDocLink(href);
      if (!target) continue;
      if (target.explicit && target.explicit !== locale) {
        warn(`[链接] ${locale}/${f}.mdx 硬编码了其他语言链接 "${href}"（i18n 会自行协商语言，建议去掉 /zh 或 /en 前缀）`);
        continue;
      }
      const exists =
        target.slug === '' || // 文档首页 /docs 或 /zh/docs
        files[target.locale].includes(target.slug) ||
        files[target.locale].some((f2) => f2.startsWith(`${target.slug}/`)); // 指向栏目的链接（如 /docs/changelog）
      if (!exists) {
        err(`[链接] ${locale}/${f}.mdx 死链: "${href}" → ${target.locale} 下不存在 ${target.slug || '(首页)'}`);
      }
    }
  }
}

// ---------- 检查 5：图片引用存在性 ----------
//
// 译文统一引用 /images/<语言>/...，缺失的本地化图片由 next.config 的
// afterFiles rewrite 自动回退到 /images/common/。此处校验引用的图片
// 至少在 <语言>/ 或 common/ 之一中存在，两个位置都没有即死图。

function imageExists(locale, imagePath) {
  // imagePath 形如 /images/<lang>/quick-start/.../x.png
  const rel = imagePath.replace(/^\/+/, ''); // images/<lang>/...
  if (existsSync(join(ROOT, 'public', rel))) return true;
  const commonRel = rel.replace(`images/${locale}/`, 'images/common/');
  return existsSync(join(ROOT, 'public', commonRel));
}

const mdImageRe = /!\[[^\]]*\]\(([^)\s]+)\)/g;

for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES]) {
  for (const f of files[locale]) {
    const text = readFileSync(join(CONTENT, locale, `${f}.mdx`), 'utf8');
    const cleaned = text.replace(/```[\s\S]*?```/g, ''); // 代码块中的图片不算引用
    let m;
    while ((m = mdImageRe.exec(cleaned)) !== null) {
      const src = m[1];
      if (/^[a-z]+:\/\//i.test(src)) continue; // 外链图
      if (!src.startsWith('/images/')) {
        warn(`[图片] ${locale}/${f}.mdx 引用了 /images/ 之外的路径: "${src}"`);
        continue;
      }
      if (!imageExists(locale, src)) {
        err(`[图片] ${locale}/${f}.mdx 死图: "${src}"（${locale}/ 与 common/ 下均不存在）`);
      }
    }
  }
}

// ---------- 输出 ----------

console.log(`扫描完成: ${[SOURCE_LOCALE, ...TARGET_LOCALES].map((l) => `${l} ${files[l].length} 篇`).join(' / ')}`);

if (warnings.length) {
  console.log(`\n⚠️  警告 ${warnings.length} 项:`);
  for (const w of warnings) console.log(`  ${w}`);
}
if (errors.length) {
  console.log(`\n❌ 错误 ${errors.length} 项:`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
console.log('\n✅ 内容一致性检查通过');

// 把 zh 的 meta.json 结构复制到还没有便携式译文的语言（fr / es），只翻译 title。
// 用法：node scripts/portable/clone-meta.mjs [locale...]
import fs from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve(import.meta.dirname, '../..');
const CONTENT = path.join(DOCS, 'content/docs');
const GLOSSARY = path.join(DOCS, '.agents/skills/translate-docs/glossary.json');

const glossary = JSON.parse(fs.readFileSync(GLOSSARY, 'utf8'));
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'es'];

/** 在 zh 便携式目录里递归找所有 meta.json */
function collectMeta(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMeta(full, out);
    else if (entry.name === 'meta.json') out.push(path.relative(path.join(CONTENT, 'zh/portable'), full));
  }
  return out;
}

function translateTitle(title, lang) {
  if (!title) return title;
  const fixed = glossary.fixed?.[lang] ?? {};
  if (fixed[title]) return fixed[title];
  // PocketCloud / StationOS Pro 这类产品名保持原样
  if (/^[A-Za-z0-9 .&+-]+$/.test(title)) return title;
  return fixed[title] ?? title;
}

const metaFiles = collectMeta(path.join(CONTENT, 'zh/portable'));
for (const lang of targets) {
  let written = 0;
  for (const rel of metaFiles) {
    const source = JSON.parse(fs.readFileSync(path.join(CONTENT, 'zh/portable', rel), 'utf8'));
    const target = { ...source };
    if (source.title) target.title = translateTitle(source.title, lang);
    const dest = path.join(CONTENT, lang, 'portable', rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `${JSON.stringify(target, null, 2)}\n`);
    written += 1;
  }
  console.log(`${lang}: wrote ${written} meta.json`);
}

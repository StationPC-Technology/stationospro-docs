// 生成「旧站每一个 URL → 新站目标」的完整映射，供切流时 nginx 301 使用。
//
// 与 reports/url-map.csv（转换器产出，只含真正导入了的页面）不同：本脚本把
// 旧站 739 个 .md 全部覆盖——被删掉的 Authing 页、空占位页也要有落点，
// 否则切流后这些历史 URL 会 404。
//
//   node scripts/portable/nginx-map.mjs
//
// 产物：
//   reports/url-map-full.csv                  locale,from,to,kind
//   docs/deployment/nginx-redirect-pocketcloud.conf
//
// 用法（旧站 server 块内 include）：
//   include /etc/nginx/snippets/pocketcloud-redirects.conf;
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve(import.meta.dirname, '../..');
const WS = path.resolve(DOCS, '..');
const OLD = path.join(WS, 'stationpc_nas_help');
const CONTENT = path.join(DOCS, 'content/docs');
const REPORTS = path.join(DOCS, 'reports');
const SITE = 'https://docs.stationpc.com';

// 旧语言目录 → 新语言段（en 的源在 docs/pocketcloud，没有目录前缀）
const LOCALES = [
  { oldDir: '', newLocale: 'en', siteName: '/', label: 'en' },
  { oldDir: 'zh-CN', newLocale: 'zh', siteName: '/zh', label: 'zh-CN' },
  { oldDir: 'zh-TW', newLocale: 'zh-Hant', siteName: '/zh-Hant', label: 'zh-TW' },
  { oldDir: 'ja-JP', newLocale: 'ja', siteName: '/ja', label: 'ja-JP' },
  { oldDir: 'ko-KR', newLocale: 'ko', siteName: '/ko', label: 'ko-KR' },
  { oldDir: 'de-DE', newLocale: 'de', siteName: '/de', label: 'de-DE' },
];

// 显式特例：这几页在新站换了位置或归宿
const OVERRIDES = {
  'contact/contact': { to: '', kind: 'station-contact' }, // 升为站级 /contact
  search: { to: 'portable', kind: 'product-landing' }, // 旧全文搜索页取消
  'trouble_issue/connect_issue': { to: 'portable/troubleshooting/connect-issue', kind: 'merged' },
};

function walk(dir, base = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'images') continue; // 图片目录不产生 URL
      out.push(...walk(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.md')) {
      out.push(rel);
    }
  }
  return out;
}

function exists(p) {
  return existsSync(p);
}

function firstChild(portableDir, dirKey) {
  const metaPath = path.join(portableDir, dirKey, 'meta.json');
  if (!exists(metaPath)) {
    // 没有 meta.json：退而求其次，按目录里第一个 .mdx 当作落点
    const abs = path.join(portableDir, dirKey);
    if (!exists(abs)) return null;
    const files = readdirSync(abs).filter((f) => f.endsWith('.mdx')).sort();
    if (!files.length) return null;
    const childKey = `${dirKey}/${path.basename(files[0], '.mdx')}`;
    return resolvePage(childKey, portableDir);
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const pages = Array.isArray(meta.pages) ? meta.pages : [];
  for (const candidate of pages) {
    if (typeof candidate !== 'string') continue;
    if (candidate === 'index' || candidate === '...') continue;
    const childKey = dirKey ? `${dirKey}/${candidate}` : candidate;
    const hit = resolvePage(childKey, portableDir);
    if (hit) return hit;
  }
  return null;
}

// 判断某个 slug 在目标语言里是否真的存在（`a/b` 可能是 a/b.mdx 或 a/b/index.mdx）
function resolvePage(slug, portableDir = path.join(CONTENT, 'zh/portable')) {
  if (slug === '') {
    return exists(path.join(portableDir, 'index.mdx')) ? 'portable' : null;
  }
  const file = path.join(portableDir, `${slug}.mdx`);
  const index = path.join(portableDir, slug, 'index.mdx');
  if (exists(file)) return `portable/${slug}`;
  if (exists(index)) return `portable/${slug}`;
  return null;
}

// 目标不存在时逐级上溯，最后兜底到产品落地页
function fallback(slug, portableDir) {
  let cur = slug;
  while (cur.includes('/')) {
    cur = cur.slice(0, cur.lastIndexOf('/'));
    const hit = resolvePage(cur, portableDir);
    if (hit) return hit;
  }
  return 'portable';
}

function targetFor(oldRelPath, portableDir) {
  const special = OVERRIDES[oldRelPath.replace(/\.md$/, '')];
  if (special) {
    if (special.kind === 'station-contact') return { to: 'contact', kind: 'station-contact' };
    return { to: special.to, kind: special.kind };
  }

  const isIndex = path.basename(oldRelPath) === 'README.md';
  const relNoExt = isIndex
    ? path.dirname(oldRelPath) // README 代表它所在目录
    : oldRelPath.replace(/\.md$/, '');
  const key = relNoExt === '.' ? '' : relNoExt;

  if (isIndex) {
    // 目录页：先看目录自己有没有 index，没有就落到第一个子页
    const own = resolvePage(key, portableDir);
    if (own) return { to: own, kind: 'page' };
    const child = firstChild(portableDir, key);
    if (child) return { to: child, kind: 'folder-first-child' };
    return { to: fallback(key, portableDir), kind: 'fallback' };
  }

  const hit = resolvePage(key, portableDir);
  if (hit) return { to: hit, kind: 'page' };
  return { to: fallback(key, portableDir), kind: 'fallback' };
}

function main() {
  mkdirSync(REPORTS, { recursive: true });
  const rows = [];
  const seen = new Set();
  const emitted = new Set();
  let duplicates = 0;
  const nginx = [
    '# 由 scripts/portable/nginx-map.mjs 生成，勿手改。',
    '# 旧站（help.stationpc.cn / help.stationpc.com）每一个历史 URL 到 docs.stationpc.com 的 301。',
    '# 规则按语言分组；精确 location 匹配，无需关心先后顺序。',
    '',
  ];

  for (const { oldDir, newLocale, siteName, label } of LOCALES) {
    const root = oldDir
      ? path.join(OLD, 'docs', oldDir, 'pocketcloud')
      : path.join(OLD, 'docs', 'pocketcloud');
    if (!exists(root)) {
      console.warn(`[skip] 找不到旧站目录：${root}`);
      continue;
    }

    const portableDir = path.join(CONTENT, newLocale, 'portable');
    const files = walk(root).sort();
    nginx.push(`# ---- ${label} → ${newLocale} (${files.length} 条)`);

    for (const rel of files) {
      const fromPath = rel.endsWith('README.md')
        ? rel.slice(0, -'README.md'.length)
        : rel.replace(/\.md$/, '');
      const oldUrl = `${oldDir ? `/${oldDir}` : ''}/pocketcloud/${fromPath}`;
      if (seen.has(oldUrl)) {
        duplicates += 1;
        continue;
      }
      seen.add(oldUrl);
      const { to, kind } = targetFor(rel, portableDir);
      const newUrl = to === 'contact' ? `${siteName === '/' ? '' : siteName}/contact` : `${siteName === '/' ? '' : siteName}/${to}`;

      rows.push({
        locale: newLocale,
        from: oldUrl,
        to: newUrl,
        kind,
      });
      nginx.push(`location = ${oldUrl} { return 301 ${SITE}${newUrl}; }`);
      // 目录页旧 URL 带尾斜杠（VuePress 规范），但也可能被外部链接写成不带斜杠
      if (oldUrl.endsWith('/')) {
        const bare = oldUrl.slice(0, -1);
        // 不带斜杠的形式可能与另一页（如 `changelog.md` 与 `changelog/README.md`）撞车
        if (bare && !seen.has(bare) && !emitted.has(bare)) {
          emitted.add(bare);
          nginx.push(`location = ${bare} { return 301 ${SITE}${newUrl}; }`);
        }
      }
    }
    nginx.push('');
  }

  // CSV
  const csv = ['locale,from,to,kind', ...rows.map((r) => `${r.locale},${r.from},${r.to},${r.kind}`)].join('\n');
  writeFileSync(path.join(REPORTS, 'url-map-full.csv'), `${csv}\n`);

  // nginx snippet
  const confDir = path.join(DOCS, 'docs/deployment');
  mkdirSync(confDir, { recursive: true });
  writeFileSync(path.join(confDir, 'nginx-redirect-pocketcloud.conf'), `${nginx.join('\n')}\n`);

  // 统计
  const byKind = rows.reduce((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {});
  console.log(`共 ${rows.length} 条旧 URL（跳过重复 ${duplicates} 条）`);
  for (const [kind, n] of Object.entries(byKind).sort()) console.log(`  ${kind}: ${n}`);
  console.log('→ reports/url-map-full.csv');
  console.log('→ docs/deployment/nginx-redirect-pocketcloud.conf');
}

main();

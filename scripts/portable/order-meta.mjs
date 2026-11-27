/**
 * 按旧站 nav.js 的顺序重排 meta.json 的 pages。
 *
 * 转换器的排序只是「导航分组命中率」启发式，落到每一层 folder 时顺序会和旧站不一致
 * （如「硬件安装」旧站是 ssd-install → dock → battery-install，转换后成了 battery-install → dock → ssd-install）。
 *
 * 这里的做法：把每个顶层导航分组摊平成「该分组内的出现顺序」；
 * 对每个 folder，选与它页面集合重叠最多的那个分组作为基准，按该分组内的顺序排；
 * index 永远在最前，分组里没有的页面追加到末尾并保持原有相对顺序。
 *
 * 用法：node scripts/portable/order-meta.mjs [--only=zh] [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DOCS = path.resolve(import.meta.dirname, '../..');
const WS = path.resolve(DOCS, '..');
const OLD = path.join(WS, 'stationpc_nas_help');
const CONTENT = path.join(DOCS, 'content/docs');
const REPORTS = path.join(DOCS, 'reports');

const LOCALES = [
  { oldPrefix: '', next: 'en', nav: 'en-US' },
  { oldPrefix: 'zh-CN', next: 'zh', nav: 'zh-CN' },
  { oldPrefix: 'zh-TW', next: 'zh-Hant', nav: 'zh-TW' },
  { oldPrefix: 'ja-JP', next: 'ja', nav: 'ja-JP' },
  { oldPrefix: 'ko-KR', next: 'ko', nav: 'ko-KR' },
  { oldPrefix: 'de-DE', next: 'de', nav: 'de-DE' },
];

/** oldUrl（不含首尾斜杠）→ 新相对路径（相对 portable/） */
function readUrlMap() {
  const file = path.join(REPORTS, 'url-map-full.csv');
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split('\n').slice(1)) {
    if (!line.trim()) continue;
    const [, from, to] = line.split(',');
    const oldKey = from.replace(/^\/+|\/+$/g, '');
    const newRel = to.replace(/^\/+/, '').split('/').slice(2).join('/');
    map.set(oldKey, newRel);
  }
  return map;
}

function loadNav(locale) {
  const file = path.join(OLD, 'docs/.config', locale.nav, 'nav.js');
  if (!fs.existsSync(file)) return null;
  return require(file)['/pocketcloud/'] ?? null;
}

/** 一个导航分组 → Map<新相对路径, 组内序号> */
function groupOrder(node, locale, urlMap) {
  const out = new Map();
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.path) {
        const rel = n.path.replace(/^\/+|\/+$/g, '');
        const oldUrl = locale.oldPrefix ? `${locale.oldPrefix}/${rel}` : rel;
        const found = urlMap.get(oldUrl);
        if (found && !out.has(found)) out.set(found, out.size);
      }
      if (n.children) walk(n.children);
    }
  };
  walk([node]);
  return out;
}

let currentNext = 'zh';
const portableRoot = () => path.join(CONTENT, currentNext, 'portable');

/** 收集某个 folder 下所有页面的相对路径 */
function collectLeaves(absPath, out = new Set()) {
  const metaFile = path.join(absPath, 'meta.json');
  if (!fs.existsSync(metaFile)) {
    out.add(path.relative(portableRoot(), absPath).split(path.sep).join('/'));
    return out;
  }
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const pages = meta.pages ?? [];
  // 目录自己也是导航里的一个叶子（旧站 guides/device-connection 这种一页一目录）
  const rel = path.relative(portableRoot(), absPath).split(path.sep).join('/');
  if (pages.includes('index')) out.add(rel);
  for (const page of pages) {
    if (page === 'index') continue;
    collectLeaves(path.join(absPath, page), out);
  }
  return out;
}

let changed = 0;

function orderTree(dir, groups, dry, isRoot = false) {
  const metaFile = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaFile)) return;
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const pages = meta.pages ?? [];

  // 选与本 folder 页面集合重叠最多的导航分组
  let best = null;
  let bestScore = 0;
  let bestGroupIndex = -1;
  groups.forEach((g, gi) => {
    let score = 0;
    for (const p of pages) {
      if (p === 'index') continue;
      for (const leaf of collectLeaves(path.join(dir, p))) {
        if (g.has(leaf)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = g;
      bestGroupIndex = gi;
    }
  });

  const rank = (page) => {
    if (page === 'index') return -1;
    const leaves = collectLeaves(path.join(dir, page));
    if (isRoot) {
      // 根层按「顶层分组在旧导航里的先后」排，不按组内序号
      let bestGroup = Number.POSITIVE_INFINITY;
      groups.forEach((g, gi) => {
        for (const leaf of leaves) {
          if (g.has(leaf)) bestGroup = Math.min(bestGroup, gi);
        }
      });
      return bestGroup;
    }
    if (!best) return Number.POSITIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;
    for (const leaf of leaves) {
      const idx = best.get(leaf);
      if (idx !== undefined) min = Math.min(min, idx);
    }
    return min;
  };

  const positioned = pages.map((page, i) => ({ page, i, order: rank(page) }));
  positioned.sort((a, b) => {
    if (a.order === b.order) return a.i - b.i;
    if (b.order === Number.POSITIVE_INFINITY) return -1;
    if (a.order === Number.POSITIVE_INFINITY) return 1;
    return a.order - b.order;
  });

  const next = positioned.map((p) => p.page);
  if (next.join('|') !== pages.join('|')) {
    meta.pages = next;
    if (!dry) fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
    changed += 1;
    const rel = path.relative(portableRoot(), dir) || '.';
    console.log(`  ${currentNext}/${rel}\n    ${pages.join(', ')}\n → ${next.join(', ')}`);
  }

  for (const page of next) {
    const child = path.join(dir, page);
    if (fs.existsSync(child) && fs.statSync(child).isDirectory()) orderTree(child, groups, dry, false);
  }
}

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const dry = process.argv.includes('--dry');
const urlMap = readUrlMap();

/** 每组：{ title, map } */
function buildGroups(locale) {
  const nav = loadNav(locale);
  if (!nav) return null;
  return nav.map((node) => ({ title: node.title, map: groupOrder(node, locale, urlMap) }));
}

const zhLocale = LOCALES.find((l) => l.next === 'zh');
const zhGroups = buildGroups(zhLocale);

for (const locale of LOCALES) {
  if (only && locale.next !== only) continue;
  const groups = buildGroups(locale) ?? zhGroups;
  currentNext = locale.next;
  const root = portableRoot();
  if (!fs.existsSync(root)) continue;
  const leaves = groups.reduce((n, g) => n + g.map.size, 0);
  console.log(`${locale.next}: ${groups.length} 组 / ${leaves} 叶子`);
  orderTree(root, groups.map((g) => g.map), dry, true);
}
console.log(`${dry ? 'will update' : 'updated'} ${changed} meta.json`);

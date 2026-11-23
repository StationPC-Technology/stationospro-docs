import * as PageTree from 'fumadocs-core/page-tree';
import { source } from './source';
import type { Product } from './products';

/**
 * 在页面树里定位某个产品的分组节点。
 *
 * 用落地页 URL 反查（`content/docs/<lang>/<slug>/index.mdx` 的 URL），而不是靠
 * 目录名或扫描顺序——fumadocs 把该页当成普通子页放在 `children` 里，不一定有
 * `index` 字段，所以按 children 匹配最稳。
 */
export function getProductFolder(locale: string, slug: Product['slug']): PageTree.Folder | undefined {
  const tree = source.getPageTree(locale);
  const landing = source.getPage([slug], locale)?.url;

  return tree.children.find(
    (node): node is PageTree.Folder =>
      node.type === 'folder' &&
      // fumadocs 视 meta.json 的写法二选一：落地页要么是分组 index，要么是分组里的普通子页
      (node.index?.url === landing ||
        node.children.some((child) => child.type === 'page' && child.url === landing)),
  );
}

/** 侧栏只展示当前产品的子树：把该产品的分组提升为页面树的根 */
export function getProductScopedTree(locale: string, slug: Product['slug']): PageTree.Root {
  const tree = source.getPageTree(locale);
  const folder = getProductFolder(locale, slug);
  return folder ? { ...tree, children: folder.children } : tree;
}

/**
 * 统计某个产品下的文档页数（含落地页自身）。
 *
 * 不能用页面树来数：meta.json 里被 `!name` 隐藏的页面不进树，但仍然是可访问的文档，
 * 页面树还会把部分页面合并成链接，数出来的值会偏小。直接数源里的页面。
 */
export function countProductDocs(locale: string, slug: Product['slug']): number {
  return source
    .getPages(locale)
    .filter((page) => page.slugs[0] === slug).length;
}

/**
 * 站首页产品卡上的直达链接。
 *
 * 先按 `prefer` 里列出的分组顺序取（产品线最常用的入口），不足 `limit` 时按
 * meta.json 顺序补齐——这样结构变化不会出现空卡，也不必为 8 语言维护手写链接表。
 */
export function getProductQuickLinks(
  locale: string,
  slug: Product['slug'],
  limit = 4,
  prefer: string[] = [],
): { title: string; url: string }[] {
  const folder = getProductFolder(locale, slug);
  if (!folder) return [];

  const landing = source.getPage([slug], locale)?.url;
  const byKey = new Map<string, { title: string; url: string }>();
  const order: string[] = [];

  for (const child of folder.children) {
    let url: string | undefined;
    if (child.type === 'page') url = child.url;
    else if (child.type === 'folder') {
      url = child.index?.url ?? child.children.find((c) => c.type === 'page')?.url;
    }
    if (!url || url === landing) continue;

    // 用「产品段之后的第一段」做 key：/zh/portable/guides 与
    // /zh/portable/guides/install-app 都归到 guides，匹配 prefer 时更稳
    const segments = url.split('/').filter(Boolean);
    const key = segments[2];
    if (!key || byKey.has(key)) continue;

    const title = 'name' in child && child.name ? String(child.name) : url;
    byKey.set(key, { title, url });
    order.push(key);
  }

  const picked = prefer.filter((key) => byKey.has(key));
  for (const key of order) {
    if (picked.length >= limit) break;
    if (!picked.includes(key)) picked.push(key);
  }

  return picked.slice(0, limit).map((key) => byKey.get(key)!);
}

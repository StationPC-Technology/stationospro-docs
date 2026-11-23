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

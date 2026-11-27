import * as PageTree from 'fumadocs-core/page-tree';
import { source } from './source';
import { getProductFolder } from './product-tree';
import type { Product } from './products';

/**
 * 站首页两条产品线的模块卡（「按模块划分热门文档」）。
 *
 * 只写语言无关的东西：模块在文档树里的路径，以及卡片里优先展示的文档。
 * 模块名、文档标题都取自页面树（各语言 meta.json / frontmatter 已翻译），
 * 所以新增语言不用在这里补文案。路径找不到时整块跳过，不渲染空卡。
 */
interface ModuleDef {
  /** 相对产品目录的路径，如 `app-guide/settings` */
  path: string;
  /** 卡片里优先展示的文档（相对产品目录）；不足三篇时按树顺序补齐 */
  docs?: string[];
  /** 已经有独立卡片的子路径，不计入本卡的篇数与候选文档 */
  exclude?: string[];
  /**
   * 卡片标题前的图标：Lucide 图标名（如 `Rocket`），或以 `/` 开头的自定义图标路径
   * （放在 `public/` 下，例如 `/images/common/icons/quick-start.svg`）。
   * 想换图标只改这里；留空则不显示图标。
   */
  icon?: string;
}

const MODULES: Record<Product['slug'], ModuleDef[]> = {
  desktop: [
    { path: 'quick-start', icon: '/images/home/desktop-quickstart.png' },
    {
      path: 'app-guide',
      icon: 'BookOpen',
      docs: ['app-guide/app-center', 'app-guide/files', 'app-guide/backup'],
      exclude: ['app-guide/settings'],
    },
    {
      path: 'app-guide/settings',
      icon: 'Settings',
      docs: ['app-guide/settings/users', 'app-guide/settings/storage', 'app-guide/settings/remote-access'],
    },
    { path: 'explore', icon: 'Compass' },
    { path: 'compatible', icon: 'Plug' },
    { path: 'changelog', icon: 'History' },
  ],
  /**
   * 首页每条产品线只摊开六个模块，其余章节留给「进入文档」。
   * 顺序即用户的查找路径：先装起来，再连上去，然后管文件、做备份，最后才是排障。
   */
  portable: [
    { path: 'guides', icon: '/images/home/portable-quickstart.png', docs: ['guides/install-app', 'guides/initialize-pocketcloud', 'guides/remote-access'] },
    { path: 'hardware', icon: 'Wrench', docs: ['hardware/dock', 'hardware/battery-install'] },
    { path: 'remote-access', icon: 'Globe', docs: ['remote-access/remote-access-principle', 'remote-access/ddns'] },
    { path: 'backup', icon: 'Archive', docs: ['backup/create-cloud-backup', 'backup/sd-backup', 'backup/syncthing'] },
    {
      path: 'file-service',
      icon: 'Share2',
      docs: [
        'file-service/access-samba-service',
        'file-service/access-webdav-service',
        'file-service/access-nfs-service',
      ],
    },
    { path: 'troubleshooting', icon: 'LifeBuoy' },
  ],
};

export interface HomeModuleCard {
  /** 模块名，取自页面树 */
  title: string;
  /** 图标名或图标路径，见 `ModuleDef.icon` */
  icon?: string;
  /** 卡片里展示的热门文档，最多三条 */
  docs: { title: string; url: string }[];
}

const segments = (url: string): string[] => url.split('/').filter(Boolean);

/** 节点下所有可点的 URL（分组自身的落地页也算一个） */
function nodeUrls(node: PageTree.Node): string[] {
  if (node.type === 'page') return [node.url];
  if (node.type !== 'folder') return [];

  const urls = node.index ? [node.index.url] : [];
  return urls.concat(node.children.flatMap(nodeUrls));
}

/**
 * URL 去掉语言段、`docs` 段和产品段之后剩下的路径。
 *
 * 默认语言甚至没有语言段，所以先定位产品段再取后缀；定位不到说明不是本产品的页面。
 */
function pathAfterProduct(url: string, slug: string): string[] | undefined {
  const parts = segments(url);
  const start = parts.indexOf(slug);
  return start < 0 ? undefined : parts.slice(start + 1);
}

const startsWith = (path: string[], prefix: string[]) =>
  prefix.length <= path.length && prefix.every((segment, i) => path[i] === segment);

/**
 * 节点自己在树里的路径（相对产品目录）。
 *
 * 页节点直接来自 URL；分组节点没有路径字段，就用「父路径 + 子页面路径里多出来的那一段」
 * 反推——这样 `meta.json` 里指向其他章节的外链（路径不在父路径下）不会干扰判断。
 */
function nodePath(
  node: PageTree.Node,
  slug: string,
  parent: string[],
): string[] | undefined {
  if (node.type === 'page') return pathAfterProduct(node.url, slug);
  if (node.type !== 'folder') return undefined;

  for (const url of nodeUrls(node)) {
    const path = pathAfterProduct(url, slug);
    if (path && path.length > parent.length && startsWith(path, parent)) {
      return [...parent, path[parent.length]!];
    }
  }
  return undefined;
}

/**
 * 在页树里找某个模块节点。
 *
 * 不靠目录名匹配：`name` 是翻译后的标题，节点上也不带原始路径段。
 * 只能按位置找：先把每个节点反推成它在树里的路径，路径相等才是那个模块，
 * 走到路径是目标前缀的分组里再往下找一层（如桌面式的 `app-guide/settings`）。
 */
function findModuleNode(
  nodes: PageTree.Node[],
  slug: string,
  parent: string[],
  target: string[],
): PageTree.Node | undefined {
  for (const node of nodes) {
    const path = nodePath(node, slug, parent);
    if (!path || path.length !== target.length) continue;
    if (target.every((segment, i) => path[i] === segment)) return node;
  }

  for (const node of nodes) {
    if (node.type !== 'folder') continue;
    const path = nodePath(node, slug, parent);
    if (!path || path.length >= target.length || !startsWith(target, path)) continue;
    const found = findModuleNode(node.children, slug, path, target);
    if (found) return found;
  }
  return undefined;
}

export function getHomeModules(locale: string, slug: Product['slug']): HomeModuleCard[] {
  const folder = getProductFolder(locale, slug);
  if (!folder) return [];

  const byUrl = new Map(source.getPages(locale).map((page) => [page.url, page]));
  const cards: HomeModuleCard[] = [];

  for (const def of MODULES[slug]) {
    const prefix = segments(def.path);
    const node = findModuleNode(folder.children, slug, [], prefix);
    if (!node) continue;

    const title = String(node.name);
    const excluded = (def.exclude ?? []).map((path) => segments(path));
    // 卡片里只放本模块的页面：`meta.json` 里指向其他章节的链接、以及另有卡片的子章节都不算
    const urls = nodeUrls(node).filter((url) => {
      const path = pathAfterProduct(url, slug);
      if (!path || !startsWith(path, prefix)) return false;
      return !excluded.some((skip) => startsWith(path, skip));
    });

    const docs: { title: string; url: string }[] = [];
    const push = (url: string) => {
      if (docs.length >= 3 || docs.some((doc) => doc.url === url)) return;
      const page = byUrl.get(url);
      // 标题和卡片名一样的多半是模块自己的目录页，放在卡片里是废话
      if (page && page.data.title !== title) docs.push({ title: page.data.title, url });
    };

    for (const path of def.docs ?? []) {
      const page = source.getPage([slug, ...segments(path)], locale);
      if (page) push(page.url);
    }
    // 候选不够就按树顺序补齐，保证结构变化时卡片不会空掉
    for (const url of urls) {
      if (docs.length >= 3) break;
      push(url);
    }

    if (docs.length === 0) continue;
    cards.push({ title, icon: def.icon, docs });
  }

  return cards;
}

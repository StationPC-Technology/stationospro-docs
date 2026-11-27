import Link from 'next/link';
import * as PageTree from 'fumadocs-core/page-tree';
import { getProduct, productModels, productName, productUrl, type Product } from '@/lib/products';
import { getProductLabels } from '@/lib/product-labels';
import { getProductFolder } from '@/lib/product-tree';

/** 节点的落地 URL：页面取自身，分组取 index 或第一个可达的子页 */
function nodeHref(node: PageTree.Node): string {
  if (node.type === 'page') return node.url;
  if (node.type === 'folder') {
    if (node.index?.url) return node.index.url;
    for (const child of node.children) {
      const url = nodeHref(child);
      if (url) return url;
    }
  }
  return '';
}

function countLeaves(node: PageTree.Node): number {
  if (node.type === 'page') return 1;
  if (node.type === 'folder') return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
  return 0;
}

/**
 * 产品落地页正文（由 page.tsx 在产品根路径渲染，不走 MDX body）。
 *
 * 卡片取自该产品在页面树里的一级分组，标题/顺序由各语言的 meta.json 决定，
 * 因此不需要为 8 种语言各维护一份卡片文案。
 */
export function ProductLanding({ locale, slug }: { locale: string; slug: Product['slug'] }) {
  const product = getProduct(slug);
  const labels = getProductLabels(locale);
  const landingUrl = productUrl(slug, locale);
  const sections = (getProductFolder(locale, slug)?.children ?? []).filter(
    (node) => nodeHref(node) !== landingUrl,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fd-muted-foreground">
        <span className="rounded-full border px-2.5 py-0.5 font-medium">
          {product ? labels.line[slug] : slug}
        </span>
        {product && <span>{productName(product)}</span>}
        {product && <span>· {productModels(product)}</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section, index) => (
          <Link
            key={index}
            href={nodeHref(section)}
            className="flex flex-col gap-1 rounded-xl border bg-fd-card p-5 no-underline transition-colors hover:border-fd-primary/40 hover:bg-fd-accent"
          >
            <span className="font-medium">{section.name}</span>
            <span className="text-sm text-fd-muted-foreground">
              {labels.docsCount(countLeaves(section))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { source } from '@/lib/source';
import { languages } from '@/lib/i18n';
import {
  productModels,
  productName,
  productUrl,
  products,
  type Product,
} from '@/lib/products';
import { getProductLabels } from '@/lib/product-labels';
import { countProductDocs, getProductQuickLinks } from '@/lib/product-tree';

/** 两条产品线的标识色（卡片顶部色带 + 图标底色），只影响观感，不参与路由 */
const accent: Record<Product['slug'], string> = {
  desktop: '#2563eb',
  portable: '#0d9488',
};

/** 卡片上优先展示的分组（其余按 meta.json 顺序补齐） */
const quickLinkPrefer: Record<Product['slug'], string[]> = {
  desktop: ['quick-start', 'app-guide', 'compatible', 'faq'],
  portable: ['guides', 'hardware', 'backup', 'file-service'],
};

/**
 * 站首页：唯一的入口页。
 *
 * 结构（见 docs/merge-plan.md §2.2.1）：
 * hero + 热门直达 → 两张产品卡（产品名、型号、篇数、4 个直达入口）→ 站级链接。
 * 产品切换在文档页由侧栏 tabs 承担，这里靠卡片，两者不重复。
 */
export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const labels = getProductLabels(lang);
  const policies = source.getPage(['policies', 'privacy-policy'], lang);
  const contact = source.getPage(['contact'], lang);

  return (
    <main className="flex flex-1 flex-col px-6 py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{labels.hub.title}</h1>
          <p className="mt-3 max-w-xl text-fd-muted-foreground">{labels.hub.subtitle}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
            {labels.hot.map((item) => {
              const page = source.getPage(item.slug, lang);
              if (!page) return null;
              return (
                <Link
                  key={item.label}
                  href={page.url}
                  className="rounded-full border px-3 py-1 text-fd-muted-foreground no-underline transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {products.map((product) => {
            const docs = countProductDocs(lang, product.slug);
            const links = getProductQuickLinks(lang, product.slug, 4, quickLinkPrefer[product.slug]);

            return (
              <div
                key={product.slug}
                className="relative flex flex-col overflow-hidden rounded-2xl border bg-fd-card p-6 transition-colors hover:border-fd-primary/40"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: accent[product.slug] }}
                />

                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
                    style={{ background: accent[product.slug] }}
                  >
                    {product.slug === 'desktop' ? 'D' : 'P'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium tracking-wide text-fd-muted-foreground uppercase">
                      {labels.line[product.slug]}
                    </span>
                    <span className="text-lg font-semibold">{productName(product)}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1 text-sm text-fd-muted-foreground">
                  <span>{productModels(product)}</span>
                  <span>{labels.docsCount(docs)}</span>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {links.map((link) => (
                    <Link
                      key={link.url}
                      href={link.url}
                      className="truncate rounded-lg border px-3 py-2 text-sm text-fd-muted-foreground no-underline transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>

                <Link
                  href={productUrl(product.slug, lang)}
                  className="mt-5 text-sm font-semibold no-underline"
                  style={{ color: accent[product.slug] }}
                >
                  {labels.enter} →
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-6 text-sm text-fd-muted-foreground">
          {policies && (
            <Link href={policies.url} className="no-underline hover:text-fd-foreground">
              {labels.hub.policies}
            </Link>
          )}
          {contact && (
            <Link href={contact.url} className="no-underline hover:text-fd-foreground">
              {labels.hub.contact}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

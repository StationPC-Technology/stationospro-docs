import Link from 'next/link';
import { source } from '@/lib/source';
import { languages } from '@/lib/i18n';
import { products, productModels, productUrl } from '@/lib/products';
import { getProductLabels } from '@/lib/product-labels';

/**
 * 站首页：唯一的入口页。两个产品线卡片 + 站级链接。
 *
 * 产品落地页（/desktop、/portable）由 [lang]/[...slug] 渲染，
 * 这里只负责"选产品"这一步。
 */
export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const labels = getProductLabels(lang);
  const policies = source.getPage(['policies', 'privacy-policy'], lang);
  const contact = source.getPage(['contact'], lang);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{labels.hub.title}</h1>
        <p className="mt-3 text-fd-muted-foreground">{labels.hub.subtitle}</p>
      </div>

      <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <Link
            key={product.slug}
            href={productUrl(product.slug, lang)}
            className="flex flex-col gap-2 rounded-xl border bg-fd-card p-6 transition-colors hover:bg-fd-accent"
          >
            <span className="text-xs font-medium text-fd-muted-foreground">
              {labels.line[product.slug]}
            </span>
            <span className="text-lg font-semibold">{product.system}</span>
            <span className="text-sm text-fd-muted-foreground">{productModels(product)}</span>
            <span className="mt-2 text-sm font-medium">{labels.enter} →</span>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
        {policies && (
          <Link href={policies.url} className="rounded-full border px-4 py-1.5 hover:bg-fd-accent">
            {labels.hub.policies}
          </Link>
        )}
        {contact && (
          <Link href={contact.url} className="rounded-full border px-4 py-1.5 hover:bg-fd-accent">
            {labels.hub.contact}
          </Link>
        )}
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

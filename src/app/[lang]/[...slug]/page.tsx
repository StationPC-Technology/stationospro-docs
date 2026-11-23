import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';
import { localeConfigs } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { Feedback } from '@/components/feedback-adapter';
import { ProductLanding } from '@/components/product-nav';
import {
  isProductSlug,
  productName,
  productUrl,
  products,
} from '@/lib/products';
import { getProductLabels } from '@/lib/product-labels';
import { countProductDocs, getProductScopedTree } from '@/lib/product-tree';

/**
 * 侧栏只展示当前产品的子树；站级页面（/policies、/contact）没有侧栏。
 */
function scopedTree(lang: string, slug: string[]) {
  const root = slug[0];
  if (!isProductSlug(root)) return source.getPageTree(lang);
  return getProductScopedTree(lang, root);
}

export default async function Page(props: PageProps<'/[lang]/[...slug]'>) {
  const params = await props.params;
  const slug = params.slug;
  const page = source.getPage(slug, params.lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const labels = getProductLabels(params.lang);
  const homeUrl = source.getPage([], params.lang)?.url ?? '/';
  const productSlug = isProductSlug(slug[0]) ? slug[0] : undefined;
  // 产品根路径（/desktop、/portable）渲染代码生成的落地页；其余走 MDX
  const isLanding = !!productSlug && slug.length === 1;
  // 站级页面（/policies/*、/contact）不挂侧栏，也不进产品导航
  const standalone = !productSlug;

  // 产品切换用 fumadocs 内置的 sidebar tabs：tabMode='auto' 时它渲染成侧栏顶部那个下拉
  // （与 fumadocs.dev 官网同一套实现，见 layouts/docs/slots/sidebar.js），不再自造分段控件。
  const tabs = standalone
    ? undefined
    : products.map((product) => ({
        title: labels.line[product.slug],
        // 只保留「产品名 + 篇数」，型号已在首页卡片与落地页出现，这里再列一遍会显得杂乱
        description: `${productName(product)} · ${labels.docsCount(
          countProductDocs(params.lang, product.slug),
        )}`,
        url: productUrl(product.slug, params.lang),
      }));

  const layoutOptions = {
    ...baseOptions(params.lang),
    // 顶部不再重复产品导航项：切换统一交给侧栏 tabs
    links: [],
    tabMode: 'auto' as const,
    tabs,
    ...(standalone ? { sidebar: { enabled: false }, nav: { enabled: false } } : {}),
  };

  return (
    <DocsLayout tree={scopedTree(params.lang, slug)} {...layoutOptions}>
      <DocsPage
        toc={page.data.toc}
        full={standalone || page.data.full || isLanding}
        tableOfContent={standalone || isLanding ? { enabled: false } : undefined}
        tableOfContentPopover={standalone || isLanding ? { enabled: false } : undefined}
        footer={standalone || isLanding ? { enabled: false } : undefined}
      >
        {standalone && (
          <Link
            href={homeUrl}
            className="mb-2 self-start text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            ← {labels.hub.title}
          </Link>
        )}
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="mb-0">
          {page.data.description}
        </DocsDescription>
        {!isLanding && (
          <div className="flex flex-row gap-2 items-center border-b pb-6">
            <MarkdownCopyButton markdownUrl={markdownUrl} />
            <ViewOptionsPopover
              markdownUrl={markdownUrl}
              githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
            />
          </div>
        )}
        <DocsBody>
          {isLanding && productSlug ? (
            <ProductLanding locale={params.lang} slug={productSlug} />
          ) : (
            <MDX
              components={getMDXComponents({
                // this allows you to link to other pages with relative file paths
                a: createRelativeLink(source, page),
              })}
            />
          )}
        </DocsBody>
        {!isLanding && (
          <>
            <Feedback locale={params.lang} path={page.url} title={page.data.title} />
            {page.data.lastModified && (
              <PageLastUpdate date={page.data.lastModified} />
            )}
          </>
        )}
      </DocsPage>
    </DocsLayout>
  );
}

export async function generateStaticParams() {
  // 只预渲染真实存在的页面：语言之间暂时不齐平时（例如新增产品域还没翻译完），
  // source.generateParams() 可能吐出该语言下并不存在的 slug，交给动态渲染走 404 更安全。
  return source.generateParams().filter((params) => {
    const lang = (params as { lang?: string }).lang;
    const slug = (params as { slug?: string[] }).slug ?? [];
    return !!source.getPage(slug, lang);
  });
}

export async function generateMetadata(
  props: PageProps<'/[lang]/[...slug]'>,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: page.url,
      languages: Object.fromEntries([
        ...localeConfigs.flatMap((locale) => {
          const localizedPage = source.getPage(params.slug, locale.id);
          if (!localizedPage) return [];
          return [[locale.tag, localizedPage.url] as const];
        }),
        ['x-default', source.getPage(params.slug, 'en')?.url ?? page.url],
      ]),
    },
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}

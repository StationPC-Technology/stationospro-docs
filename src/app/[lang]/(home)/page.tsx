import Link from 'next/link';
import { HeroSearch } from '@/components/hero-search';
import { source } from '@/lib/source';
import { languages } from '@/lib/i18n';
import { HOME_FAQ_SLUGS, HOME_VIDEO_IDS, getHomeScenarios, getHomeStrings } from '@/lib/home-copy';
import {
  productModels,
  productName,
  productUrl,
  products,
  type Product,
} from '@/lib/products';
import { getProductLabels } from '@/lib/product-labels';
import { countProductDocs } from '@/lib/product-tree';

/** 两条产品线的标识色（图标底色 + 表头圆点），只影响观感，不参与路由 */
const accent: Record<Product['slug'], string> = {
  desktop: '#2563eb',
  portable: '#0d9488',
};

/**
 * 站首页：唯一入口页。
 *
 * 结构（见 docs/merge-plan.md §2.2.1）：
 * hero + 大搜索 → 按产品浏览（两条横条）→ 按场景找（两产品对照表）
 * → 视频教程（1 大 + 4 小，标题取自页面树）→ 常见问题 → 站级链接。
 *
 * 设计取舍：不放产品卡、不放侧栏；产品发现交给两条横条与文档页的侧栏 tabs。
 */
export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const labels = getProductLabels(lang);
  const copy = getHomeStrings(lang);
  const scenarios = getHomeScenarios(lang);

  const pages = source.getPages(lang);
  const policies = source.getPage(['policies', 'privacy-policy'], lang);
  const contact = source.getPage(['contact'], lang);

  /**
   * slug 解析成链接 + 标题。
   * 精确页找不到就退到同前缀的第一页（场景表里有些 slug 指向的是分组），
   * 再不济退到产品落地页——保证首页的任何一条链接都不会 404。
   */
  const resolve = (slugs: string[]): { url: string; title: string } => {
    const direct = source.getPage(slugs, lang);
    if (direct) return { url: direct.url, title: direct.data.title };

    const prefixed = pages.find((page) => slugs.every((seg, i) => page.slugs[i] === seg));
    if (prefixed) return { url: prefixed.url, title: prefixed.data.title };

    const fallback = productUrl((slugs[0] as Product['slug']) ?? 'portable', lang);
    return { url: fallback, title: labels.enter };
  };

  const link = (slugs: string[]): string => resolve(slugs).url;

  /** 视频：按 HOME_VIDEO_IDS 的顺序找页面，标题用页面树里的译文 */
  const videos = Object.entries(HOME_VIDEO_IDS)
    .map(([file, videoId]) => {
      const page = pages.find(
        (item) => item.slugs[1] === 'video_tutorial' && item.slugs.at(-1)?.toLowerCase() === file,
      );
      return page ? { videoId, url: page.url, title: page.data.title } : null;
    })
    .filter((item): item is { videoId: string; url: string; title: string } => item !== null);

  const [featured, ...rest] = videos;

  /** 视频总数（首页只展示 5 个，剩下的在 video_tutorial 里） */
  const videoTotal = pages.filter((page) => page.slugs[1] === 'video_tutorial').length;
  /** 常见问题总数 */
  const faqTotal = pages.filter((page) => page.slugs[0] === 'portable' && page.slugs[1] === 'faq').length;

  /** 常见问题：固定选页（标题取页面树里的译文） */
  const faqPages = HOME_FAQ_SLUGS.map((slugs) => source.getPage(slugs, lang)).filter(
    (page): page is NonNullable<typeof page> => page !== undefined,
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-14">
      <div className="mx-auto flex w-full max-w-[860px] flex-col">
        {/* hero + 大搜索 */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-fd-muted-foreground uppercase">
            {copy.kicker}
          </span>
          <h1 className="mt-3.5 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
          <p className="mt-2.5 max-w-[38rem] text-fd-muted-foreground">{copy.lede}</p>
          <div className="w-full">
            <HeroSearch placeholder={copy.searchPlaceholder} />
          </div>
        </div>

        {/* 按产品浏览：两条横条 */}
        <SectionLabel>{copy.browse}</SectionLabel>
        <div className="flex flex-col gap-2.5">
          {products.map((product) => {
            const docs = countProductDocs(lang, product.slug);
            return (
              <Link
                key={product.slug}
                href={productUrl(product.slug, lang)}
                className="flex items-center gap-3.5 rounded-xl border bg-fd-card px-4 py-3.5 no-underline transition-all hover:-translate-y-px hover:border-fd-primary/40 hover:shadow-sm"
              >
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white"
                  style={{ background: accent[product.slug] }}
                >
                  {product.slug === 'desktop' ? 'D' : 'P'}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-base font-semibold tracking-tight">{productName(product)}</span>
                  <span className="mt-px truncate font-mono text-xs text-fd-muted-foreground">
                    {labels.line[product.slug]} · {productModels(product)}
                  </span>
                </div>
                <span className="ml-auto flex shrink-0 items-center gap-3 text-xs text-fd-muted-foreground">
                  {labels.docsCount(docs)}
                  <span aria-hidden className="text-fd-border">
                    →
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* 按场景找：两条产品线并排对照 */}
        <SectionLabel
          action={{ label: copy.scenariosHint, href: productUrl('portable', lang) }}
        >
          {copy.scenarios}
        </SectionLabel>
        <div className="overflow-hidden rounded-xl border bg-fd-card">
          <div className="grid grid-cols-[1.15fr_1fr_1fr] items-center gap-3 border-b bg-fd-muted/40 px-4 py-2.5 text-[11.5px] font-semibold text-fd-muted-foreground">
            <span />
            {products.map((product) => (
              <span key={product.slug} className="flex items-center gap-1.5">
                <i
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: accent[product.slug] }}
                />
                {labels.line[product.slug]} · {product.slug === 'desktop' ? 'StationOS Pro' : productName(product)}
              </span>
            ))}
          </div>
          {scenarios.map((scenario) => {
            const desktop = resolve(scenario.desktop);
            const portable = resolve(scenario.portable);
            return (
              <div
                key={scenario.label}
                className="grid grid-cols-[1.15fr_1fr_1fr] items-center gap-3 border-b border-fd-border/60 px-4 py-2.5 text-[13.5px] last:border-0 hover:bg-fd-accent/40"
              >
                <span className="text-fd-foreground">{scenario.label}</span>
                <Link
                  href={desktop.url}
                  className="text-fd-muted-foreground no-underline hover:text-fd-foreground hover:underline"
                >
                  {desktop.title}
                </Link>
                <Link
                  href={portable.url}
                  className="text-fd-muted-foreground no-underline hover:text-fd-foreground hover:underline"
                >
                  {portable.title}
                </Link>
              </div>
            );
          })}
        </div>

        {/* 视频教程 */}
        {featured && (
          <>
            <SectionLabel
              action={{ label: copy.videosMore(videoTotal), href: link(['portable', 'video_tutorial']) }}
            >
              {copy.videos}
            </SectionLabel>
            <div className="grid grid-cols-[1.3fr_1fr] items-start gap-3">
              <VideoCard video={featured} featured />
              <div className="grid grid-cols-2 gap-3">
                {rest.map((video) => (
                  <VideoCard key={video.videoId} video={video} />
                ))}
              </div>
            </div>
          </>
        )}
        {/* 常见问题 */}
        {faqPages.length > 0 && (
          <>
            <SectionLabel
              action={{
                label: copy.faqMore(faqTotal),
                href: link(['portable', 'faq']),
              }}
            >
              {copy.faq}
            </SectionLabel>
            <div className="overflow-hidden rounded-xl border bg-fd-card">
              {faqPages.map((page, i) => (
                <Link
                  key={page.url}
                  href={page.url}
                  className="flex items-center gap-2.5 border-b border-fd-border/60 px-4 py-2.5 text-sm no-underline last:border-0 hover:bg-fd-accent/40"
                >
                  <span className="text-fd-foreground">{page.data.title}</span>
                  <span className="shrink-0 text-[11px] text-fd-muted-foreground">
                    {labels.line[page.slugs[0] as Product['slug']] ?? ''}
                  </span>
                  <span
                    className={`ml-auto shrink-0 rounded-full border px-2 py-px text-[11px] ${
                      i === 0
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'text-fd-muted-foreground'
                    }`}
                  >
                    {i === 0 ? copy.badges.hot : copy.badges.recommended}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* 站级链接 */}
        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-5 text-sm text-fd-muted-foreground">
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
          <Link href={link(['portable', 'changelog'])} className="no-underline hover:text-fd-foreground">
            {copy.footer.changelog}
          </Link>
          <Link href={link(['desktop', 'compatible'])} className="no-underline hover:text-fd-foreground">
            {copy.footer.compatible}
          </Link>
        </div>
      </div>
    </main>
  );
}

/** 分区标题：左侧小标题 + 细线，右侧可选动作链接 */
function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mt-13 mb-3.5 flex items-center gap-3 text-[12px] font-semibold tracking-[0.08em] text-fd-muted-foreground uppercase">
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-fd-border" />
      {action && (
        <Link
          href={action.href}
          className="shrink-0 text-[12.5px] font-medium tracking-normal normal-case no-underline hover:text-fd-foreground"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** 视频卡：缩略图走 YouTube 的 mqdefault（16:9），点击进对应的 video_tutorial 页面 */
function VideoCard({
  video,
  featured = false,
}: {
  video: { videoId: string; url: string; title: string };
  featured?: boolean;
}) {
  return (
    <Link
      href={video.url}
      className="group flex flex-col overflow-hidden rounded-xl border bg-fd-card no-underline transition-colors hover:border-fd-primary/40"
    >
      <span className="relative block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          className="block aspect-video w-full object-cover"
        />
        <span
          aria-hidden
          className={`absolute inset-0 m-auto flex items-center justify-center rounded-full bg-black/65 text-white ${
            featured ? 'size-11 text-sm' : 'hidden'
          }`}
        >
          ▶
        </span>
      </span>
      <span className={`block border-t px-3 py-2 text-[13px] leading-snug ${featured ? 'font-medium' : ''}`}>
        {video.title}
      </span>
    </Link>
  );
}

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

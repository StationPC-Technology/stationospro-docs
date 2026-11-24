import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DeviceArt } from '@/components/device-art';
import { HeroSearch } from '@/components/hero-search';
import { VideoThumb } from '@/components/video-thumb';
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

type Video = { videoId: string; url: string; title: string };

/** 键盘焦点环全页统一用品牌蓝，不用浏览器默认环 */
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400';

/**
 * 两条产品线的识别色，只影响观感，不参与路由。
 * panel 是产品面板的底色，ink 是线名、可点的文档名这类文字，glow 是线稿里点亮的部分。
 * 小字在亮色下要用 700/800 色阶才够对比度，线稿用 600 更鲜；暗色统一用 400。
 */
const lineTone: Record<Product['slug'], { panel: string; ink: string; glow: string }> = {
  desktop: {
    panel: 'bg-blue-600/13 hover:bg-blue-600/19 dark:bg-blue-400/18 dark:hover:bg-blue-400/28',
    ink: 'text-blue-700 dark:text-blue-400',
    glow: 'text-blue-600 dark:text-blue-400',
  },
  portable: {
    panel: 'bg-teal-600/13 hover:bg-teal-600/19 dark:bg-teal-400/18 dark:hover:bg-teal-400/28',
    ink: 'text-teal-800 dark:text-teal-400',
    glow: 'text-teal-600 dark:text-teal-400',
  },
};

/**
 * 站首页：唯一入口页。
 *
 * 结构：搜索入口 → 两块产品面板（「两扇门」，各站一台设备线稿）→ 按场景找（两条产品线对照）
 * → 视频教程（1 大 + 4 小，标题取自页面树）→ 常见问题 → 站级链接。
 *
 * 设计取舍：不放解释页面的标题区，顶栏已有站名，页面标题只留给读屏（视觉隐藏的 h1）；
 * 认产品靠面板上的设备形象，不靠字母图标；产品面板之外不加外框，靠留白和细行线分组；
 * 两条产品线的蓝、青从首屏一路带到场景表和常见问题，缩小看也知道哪一列属于哪条线。
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
    .filter((item): item is Video => item !== null);

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
    <div className="flex flex-1 flex-col px-5 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col">
        <h1 className="sr-only">{labels.hub.title}</h1>

        {/* 搜索入口 */}
        <HeroSearch placeholder={copy.searchPlaceholder} />

        {/* 两扇门：两条产品线各一块面板，整块可点；按下时轻微收一下，有「推门」的手感 */}
        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2">
          {products.map((product) => {
            const tone = lineTone[product.slug];
            return (
              <Link
                key={product.slug}
                href={productUrl(product.slug, lang)}
                className={`group relative flex min-h-[250px] flex-col rounded-2xl p-5 no-underline transition-[background-color,transform] duration-200 ease-out active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-[300px] sm:rounded-3xl sm:p-6 ${focusRing} ${tone.panel}`}
              >
                <span className={`flex items-center gap-2 text-[13px] font-medium ${tone.ink}`}>
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  {labels.line[product.slug]}
                </span>
                <h2 className="mt-2.5 text-[22px] leading-tight font-semibold tracking-tight text-fd-foreground sm:max-w-[60%] sm:text-[26px]">
                  {productName(product)}
                </h2>
                <span className="mt-1.5 block font-mono text-[13px] text-fd-foreground/70">
                  {productModels(product)}
                </span>
                <span className="mt-8 flex items-center gap-2 text-[15px] font-medium text-fd-foreground sm:mt-12">
                  {labels.docsCount(countProductDocs(lang, product.slug))}
                  <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
                </span>
                <span
                  aria-hidden
                  className={`home-art pointer-events-none absolute right-4 bottom-4 block w-[160px] transition-transform duration-200 ease-out group-hover:-translate-y-1 motion-reduce:transition-none sm:right-7 sm:bottom-5 sm:w-[232px] ${tone.glow}`}
                >
                  <DeviceArt product={product.slug} />
                </span>
              </Link>
            );
          })}
        </div>

        {/* 按场景找：两条产品线并排对照；窄屏时每个场景占一组，链接上方标出产品线 */}
        <section className="mt-14 sm:mt-16">
          <SectionHead
            title={copy.scenarios}
            action={{ label: copy.scenariosHint, href: productUrl('portable', lang) }}
          />
          <div className="hidden grid-cols-[1.15fr_1fr_1fr] gap-x-6 border-b border-fd-border pb-2.5 sm:-mx-4 sm:grid sm:px-4">
            <span />
            {products.map((product) => (
              <span
                key={product.slug}
                className={`flex items-center gap-1.5 text-[13px] font-medium ${lineTone[product.slug].ink}`}
              >
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
                {labels.line[product.slug]}
                <span className="truncate text-fd-foreground/60">
                  · {product.slug === 'desktop' ? 'StationOS Pro' : productName(product)}
                </span>
              </span>
            ))}
          </div>
          <ul className="m-0 list-none p-0">
            {scenarios.map((scenario) => (
              <li
                key={scenario.label}
                className="-mx-3 grid grid-cols-2 items-start gap-x-4 gap-y-2.5 border-b border-fd-border/70 px-3 py-4 transition-colors hover:bg-fd-accent/50 last:border-0 sm:-mx-4 sm:grid-cols-[1.15fr_1fr_1fr] sm:items-center sm:gap-x-6 sm:gap-y-0 sm:px-4 sm:py-3 motion-reduce:transition-none"
              >
                <span className="col-span-2 text-sm font-medium text-fd-foreground sm:col-span-1 sm:text-[13.5px] sm:font-normal sm:text-fd-foreground/70">
                  {scenario.label}
                </span>
                {(['desktop', 'portable'] as const).map((slug) => {
                  const target = resolve(scenario[slug]);
                  return (
                    <Link key={slug} href={target.url} className={`group/cell min-w-0 no-underline ${focusRing}`}>
                      <LineTag slug={slug} label={labels.line[slug]} className="mb-1.5 sm:hidden" />
                      <span
                        className={`text-sm leading-5 font-medium group-hover/cell:underline group-hover/cell:underline-offset-4 ${lineTone[slug].ink}`}
                      >
                        {target.title}
                      </span>
                    </Link>
                  );
                })}
              </li>
            ))}
          </ul>
        </section>

        {/* 视频教程：窄屏主视频占满一行，其余 2×2 */}
        {featured && (
          <section className="mt-14 sm:mt-16">
            <SectionHead
              title={copy.videos}
              action={{ label: copy.videosMore(videoTotal), href: link(['portable', 'video_tutorial']) }}
            />
            <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
              <VideoCard video={featured} featured />
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {rest.map((video) => (
                  <VideoCard key={video.videoId} video={video} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 常见问题：只有第一条带「热门」标，整列都是精选，不再逐条重复「推荐」 */}
        {faqPages.length > 0 && (
          <section className="mt-14 sm:mt-16">
            <SectionHead
              title={copy.faq}
              action={{ label: copy.faqMore(faqTotal), href: link(['portable', 'faq']) }}
            />
            <ul className="m-0 list-none p-0">
              {faqPages.map((page, i) => (
                <li key={page.url} className="border-b border-fd-border/70 last:border-0">
                  <Link
                    href={page.url}
                    className={`group -mx-3 flex items-start gap-x-3 rounded-xl px-3 py-3 no-underline transition-colors hover:bg-fd-accent/50 sm:-mx-4 sm:px-4 motion-reduce:transition-none ${focusRing}`}
                  >
                    <span className="min-w-0 flex-1 text-sm text-fd-foreground/85 sm:text-[13.5px]">
                      {page.data.title}
                    </span>
                    {i === 0 && (
                      <span className="mt-px shrink-0 rounded-full bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                        {copy.hotBadge}
                      </span>
                    )}
                    <LineTag
                      slug={page.slugs[0] as Product['slug']}
                      label={labels.line[page.slugs[0] as Product['slug']] ?? ''}
                      className="mt-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 站级链接 */}
        <div className="mt-10 flex flex-wrap gap-x-6 border-t border-fd-border text-sm sm:mt-12">
          {policies && <SiteLink href={policies.url}>{labels.hub.policies}</SiteLink>}
          {contact && <SiteLink href={contact.url}>{labels.hub.contact}</SiteLink>}
          <SiteLink href={link(['portable', 'changelog'])}>{copy.footer.changelog}</SiteLink>
          <SiteLink href={link(['desktop', 'compatible'])}>{copy.footer.compatible}</SiteLink>
        </div>
      </div>
    </div>
  );
}

/** 分区标题：左侧标题，右侧可选的「查看全部」动作，统一带一个箭头 */
function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-4 sm:mb-3">
      <h2 className="text-[17px] font-semibold tracking-tight sm:text-lg">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className={`group -my-2 flex shrink-0 items-center gap-1 py-2 text-[13px] text-fd-foreground/65 no-underline hover:text-fd-foreground sm:text-sm ${focusRing}`}
        >
          {action.label}
          <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      )}
    </div>
  );
}

/** 产品线小标：色点续上首屏的线色，文字退成次要色，不跟正文抢 */
function LineTag({ slug, label, className = '' }: { slug: Product['slug']; label: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-xs text-fd-foreground/60 ${className}`}>
      <span aria-hidden className={`size-1.5 rounded-full bg-current ${lineTone[slug].ink}`} />
      {label}
    </span>
  );
}

/** 视频卡：缩略图在上、标题在下，点击进对应的 video_tutorial 页面 */
function VideoCard({ video, featured = false }: { video: Video; featured?: boolean }) {
  return (
    <Link href={video.url} className={`group flex flex-col gap-2.5 no-underline sm:gap-3 ${focusRing}`}>
      <VideoThumb videoId={video.videoId} featured={featured} />
      <span
        className={`text-[13px] leading-5 text-fd-foreground/80 transition-colors group-hover:text-fd-foreground sm:text-sm motion-reduce:transition-none ${
          featured ? 'font-medium sm:text-[15px] sm:leading-6' : 'sm:line-clamp-2'
        }`}
      >
        {video.title}
      </span>
    </Link>
  );
}

function SiteLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`-my-px py-3 text-fd-foreground/65 no-underline transition-colors hover:text-fd-foreground motion-reduce:transition-none ${focusRing}`}
    >
      {children}
    </Link>
  );
}

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

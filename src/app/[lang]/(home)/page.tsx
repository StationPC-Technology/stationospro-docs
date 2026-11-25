import Link from 'next/link';
import { ArrowRight, Mail, icons } from 'lucide-react';
import { HeroSearch } from '@/components/hero-search';
import {
  DiscordIcon,
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/brand-icons';
import { source } from '@/lib/source';
import { languages } from '@/lib/i18n';
import { getHomeStrings } from '@/lib/home-copy';
import { HOME_FAQ, type HomeFaqBadge } from '@/lib/home-faq';
import { getHomeModules, type HomeModuleCard } from '@/lib/home-modules';
import { productModels, productUrl, products, type Product } from '@/lib/products';
import { getProductLabels } from '@/lib/product-labels';
import { getContactStrings } from '@/lib/contact-copy';
import { appName, socialLinks } from '@/lib/shared';

/**
 * 底栏法务入口：标题取本地页面树（各语言已翻译），链接指向主站正式条款页；
 * 本地页面仍在 /policies/*，只是底栏不再指向它。
 */
const FOOTER_LEGAL_LINKS: { slug: string; href: string }[] = [
  { slug: 'privacy-policy', href: 'https://www.stationpc.com/policies/privacy-policy' },
  { slug: 'user-agreement', href: 'https://www.stationpc.com/policies/terms-of-service' },
];

const SUPPORT_EMAIL = 'support@stationpc.com';

/** 键盘焦点环全页统一用品牌蓝，不用浏览器默认环 */
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400';

/** 常见问题条目标徽标的样式：热门、推荐各一种 */
const faqBadgeStyles: Record<HomeFaqBadge, string> = {
  hot: 'bg-amber-500/12 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  recommend: 'border border-fd-foreground/20 bg-fd-popover text-fd-foreground/70',
};

/**
 * 模块卡图标的胶囊底色：按产品线取色，和分区标题的识别色一致。
 *
 * `shell` 是圆角方底的浅色，`glyph` 是图标本身的颜色（Lucide 图标跟随 currentColor）；
 * 换成自定义图片时图片自带颜色，只借用 `shell` 的底。
 */
const iconTone: Record<Product['slug'], { shell: string; glyph: string }> = {
  desktop: {
    shell: 'bg-blue-600/10 dark:bg-blue-400/15',
    glyph: 'text-blue-700 dark:text-blue-300',
  },
  portable: {
    shell: 'bg-teal-700/10 dark:bg-teal-400/15',
    glyph: 'text-teal-800 dark:text-teal-300',
  },
};

/**
 * 站首页：唯一入口页。
 *
 * 结构：内联搜索（输入即出结果）→ 桌面式 NAS 模块卡 → 便携式 NAS 模块卡 → 常见问题 → 站级链接。
 *
 * 设计取舍：两条产品线不再各占一块「二选一」面板——用户常常并不知道自己属于哪条线，
 * 所以两棵树都直接摊开模块和热门文档，靠留白和线色区分，而不是要求先做一次选择。
 * 分区标题只保留两行：线名（桌面式 NAS）和型号，产品名交给卡片与文档页。
 * 模块名与卡片里的文档标题全部取自页面树（各语言已翻译），不在这里写死文案。
 */
export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const labels = getProductLabels(lang);
  const copy = getHomeStrings(lang);

  const pages = source.getPages(lang);
  const contactPage = source.getPage(['contact'], lang);
  const contactStrings = getContactStrings(lang);

  /**
   * slug 解析成链接 + 标题。
   * 精确页找不到就退到同前缀的第一页（有些 slug 指向的是分组），
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

  /** 搜索框下的热门搜索：直达几条被问得最多的页面 */
  const hot = labels.hot.map((item) => ({ label: item.label, href: link(item.slug) }));

  /** 常见问题：条目与「热门/推荐」徽标都写在 `home-faq.ts` 里，标题取页面树的译文 */
  const faqItems = HOME_FAQ.flatMap((item) => {
    const page = source.getPage(item.slug, lang);
    return page ? [{ page, badge: item.badge }] : [];
  });

  /** 底栏圆钮：正站在用的社交渠道 + 支持邮箱 */
  const socialChannels = [
    { label: 'Facebook', href: socialLinks.facebook, Icon: FacebookIcon },
    { label: 'Instagram', href: socialLinks.instagram, Icon: InstagramIcon },
    { label: 'TikTok', href: socialLinks.tiktok, Icon: TikTokIcon },
    { label: 'YouTube', href: socialLinks.youtube, Icon: YouTubeIcon },
    { label: 'Discord', href: socialLinks.discord, Icon: DiscordIcon },
    { label: contactStrings.items[1].label, href: `mailto:${SUPPORT_EMAIL}`, Icon: Mail },
  ];

  /** 底栏链接行：主站、社区在前，法务页与联系我们在后；标题全部来自既有文案或页面树 */
  const footerLinks = [
    ...[contactStrings.items[0], contactStrings.items[2]].flatMap((item) =>
      item.href ? [{ label: item.label, href: item.href, external: true }] : [],
    ),
    ...FOOTER_LEGAL_LINKS.flatMap(({ slug, href }) => {
      const page = source.getPage(['policies', slug], lang);
      return page ? [{ label: page.data.title, href, external: true }] : [];
    }),
    ...(contactPage
      ? [{ label: contactPage.data.title, href: contactPage.url, external: false }]
      : []),
  ];

  const year = new Date().getFullYear();

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col">
          {/* 页首：一句定位 + 内联搜索，主操作不隔一层点击 */}
          <header className="text-center">
            <h1 className="text-[26px] font-semibold tracking-tight sm:text-3xl">{labels.hub.title}</h1>
            <p className="mx-auto mt-2 max-w-[520px] text-sm leading-relaxed text-fd-foreground/65">
              {copy.subtitle}
            </p>
          </header>

          <div className="mt-7 sm:mt-8">
            <HeroSearch
              locale={lang}
              placeholder={copy.searchPlaceholder}
              hotSearch={copy.hotSearch}
              noResults={copy.noResults}
              clear={copy.clear}
              searchMore={copy.searchMore}
              hot={hot}
            />
        </div>

        {/* 两条产品线各按模块摊开：不要求用户先选产品，再进文档 */}
        {products.map((product) => {
          const cards = getHomeModules(lang, product.slug);
          if (cards.length === 0) return null;

          return (
            <section key={product.slug} className="mt-12 sm:mt-16">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[22px] font-semibold tracking-tight sm:text-2xl">
                    {labels.line[product.slug]}
                  </h2>
                  <p className="mt-1 font-mono text-[13px] text-fd-foreground/70">
                    {productModels(product)}
                  </p>
                </div>
                <Link
                  href={productUrl(product.slug, lang)}
                  className={`group -my-2 flex shrink-0 items-center gap-1 py-2 text-[13px] text-fd-foreground/70 no-underline hover:text-fd-foreground sm:text-sm ${focusRing}`}
                >
                  {labels.enter}
                  <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                  <ModuleCard key={`${product.slug}-${card.title}`} card={card} tone={product.slug} />
                ))}
              </div>
            </section>
          );
        })}

        {/* 常见问题 */}
        {faqItems.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <h2 className="mb-2 text-[17px] font-semibold tracking-tight sm:mb-3 sm:text-lg">{copy.faq}</h2>
            <ul className="mt-2 border-y border-fd-border">
              {faqItems.map(({ page, badge }) => (
                <li key={page.url} className="border-b border-fd-border last:border-b-0">
                  <Link
                    href={page.url}
                    className={`group flex items-center justify-between gap-4 py-3.5 text-sm no-underline ${focusRing}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="line-clamp-2 text-fd-foreground/80 transition-colors group-hover:text-fd-foreground motion-reduce:transition-none">
                        {page.data.title}
                      </span>
                      {badge && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${faqBadgeStyles[badge]}`}
                        >
                          {badge === 'hot' ? copy.hotBadge : copy.recommendBadge}
                        </span>
                      )}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-3.5 shrink-0 text-fd-muted-foreground transition-[transform,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-fd-foreground motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        </div>
      </div>

      <footer className="border-t border-fd-border bg-fd-secondary/50 print:hidden">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center px-5 py-10 text-center sm:px-6">
          {/* 社交圆钮：链接取自 shared.ts 的 socialLinks，增删渠道时两处一起改 */}
          <ul className="flex flex-wrap items-center justify-center gap-3">
            {socialChannels.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  title={label}
                  {...(href.startsWith('mailto:')
                    ? {}
                    : { target: '_blank', rel: 'noreferrer noopener' })}
                  className={`grid size-10 place-items-center rounded-full border border-fd-border text-fd-foreground/70 no-underline transition-colors hover:border-fd-foreground/25 hover:bg-fd-popover hover:text-fd-foreground motion-reduce:transition-none ${focusRing}`}
                >
                  <Icon className="size-[22px]" />
                </a>
              </li>
            ))}
          </ul>

          {/* 链接之间只用留白分隔：文案随语言变长会折行，竖线会掉到行首，反而不整齐 */}
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[13px]">
            {footerLinks.map((item) => (
              <li key={item.href} className="flex items-center">
                <a
                  href={item.href}
                  {...(item.external
                    ? { target: '_blank', rel: 'noreferrer noopener' }
                    : {})}
                  className={`inline-flex items-center gap-0.5 text-fd-foreground/70 no-underline transition-colors hover:text-fd-foreground motion-reduce:transition-none ${focusRing}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs text-fd-foreground/55">
            © {year} {appName}
          </p>
          {/* 备案号：拿到真实备案信息后再加一行指向 beian.miit.gov.cn 的链接 */}
        </div>
      </footer>
    </div>
  );
}

/**
 * 模块卡图标。
 *
 * 取 `ModuleDef.icon`：
 * - Lucide 图标名（`Rocket`）→ 32px 圆角浅色底 + 22px 图标，底色跟随所属产品线；
 * - `/` 开头的路径 → 直接按 32px 渲染图片，不再套浅色底，避免和图标自带的背景叠成两层。
 *
 * 名字不认识时不渲染，不会把卡片挤歪。
 */
function ModuleIcon({ name, tone }: { name: string; tone: Product['slug'] }) {
  const isAsset = name.startsWith('/');

  if (isAsset) {
    return (
      // 自定义图标来自 public/，尺寸固定 32px，不需要 next/image 优化
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={name}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-lg object-contain"
      />
    );
  }

  const Icon = icons[name as keyof typeof icons];
  if (!Icon) return null;

  const palette = iconTone[tone];
  return (
    <span
      aria-hidden
      className={`grid size-8 shrink-0 place-items-center rounded-lg ${palette.shell}`}
    >
      <Icon className={`size-[22px] ${palette.glyph}`} />
    </span>
  );
}

/** 模块卡：图标 + 模块名 + 最多三条热门文档；整卡不承担点击，避免误触 */
function ModuleCard({ card, tone }: { card: HomeModuleCard; tone: Product['slug'] }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-fd-border bg-fd-popover p-4 shadow-xs transition-[border-color,box-shadow] duration-200 ease-out hover:border-fd-foreground/25 hover:shadow-sm motion-reduce:transition-none">
      <h3 className="flex items-center gap-2.5 text-base leading-snug font-semibold">
        {card.icon && <ModuleIcon name={card.icon} tone={tone} />}
        <span className="line-clamp-2">{card.title}</span>
      </h3>
      <ul className="flex flex-col gap-1.5">
        {card.docs.map((doc) => (
          <li key={doc.url}>
            <Link
              href={doc.url}
              className={`group/link flex items-start gap-1.5 text-sm leading-[1.6] text-fd-foreground/85 no-underline transition-colors hover:text-fd-foreground motion-reduce:transition-none ${focusRing}`}
            >
              <span className="line-clamp-2">{doc.title}</span>
              <ArrowRight
                aria-hidden
                className="mt-1 size-3.5 shrink-0 text-fd-muted-foreground opacity-0 transition-opacity duration-200 ease-out group-hover/link:opacity-100 motion-reduce:transition-none"
              />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}


export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

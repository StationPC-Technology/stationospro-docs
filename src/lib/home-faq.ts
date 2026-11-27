/**
 * 首页底部「常见问题」的选页与徽标。
 *
 * 这里只写语言无关的东西：页面 slug（标题取页面树里各语言的译文），以及条目要不要徽标。
 * 想换问题、调顺序、改哪个是「热门」/「推荐」，改这个数组即可——
 * 不再按位置把第一条当成热门。
 *
 * 条目可以来自产品线 FAQ（如 `portable/faq`），也可以来自站级 FAQ（如
 * `faq/two-product-lines`）；后者不属于任何一条产品线，适合回答两条线都会遇到的问题。
 */

/** 条目徽标：`hot` 热门、`recommend` 推荐；不写就没有徽标 */
export type HomeFaqBadge = 'hot' | 'recommend';

export interface HomeFaqItem {
  /** 相对 `content/docs/<lang>` 的 slug，与语言无关 */
  slug: string[];
  badge?: HomeFaqBadge;
}

export const HOME_FAQ: HomeFaqItem[] = [
  { slug: ['faq', 'two-product-lines'], badge: 'recommend' },
  { slug: ['portable', 'faq', 'factoryreset'], badge: 'hot' },
  { slug: ['portable', 'faq', 'compatible-system'], badge: 'recommend' },
  { slug: ['portable', 'faq', 'uninterrupted-operation'] },
  { slug: ['portable', 'faq', 'support-multi-login'] },
  { slug: ['portable', 'faq', 'bind-account-1'] },
  { slug: ['portable', 'faq', 'indicator-led-off'] },
];

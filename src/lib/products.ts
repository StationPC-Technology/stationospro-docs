import { i18n } from './i18n';

/**
 * 产品线注册表（URL 一级段）。
 *
 * 只存稳定信息：产品线 slug、系统名、型号清单。
 * **不存品牌名**——便携式线当前叫 PocketCloud，但即将改名 PA100；URL 与注册表
 * 都不承载会变的品牌词（见 docs/adr/0007-line-based-url-slugs.md）。
 */
export interface Product {
  /** URL 一级段，同时也是 content/docs/<lang>/<slug>/ 目录名 */
  slug: 'desktop' | 'portable';
  /** 该产品线运行的系统。桌面式 = StationOS Pro（Debian），便携式 = StationOS（OpenWrt） */
  system: string;
  /** 型号清单；PocketCloud Dock 是底座配件，不是型号，不在此列 */
  models: string[];
}

export const products: Product[] = [
  { slug: 'desktop', system: 'StationOS Pro', models: ['DA400', 'DA400 Air'] },
  { slug: 'portable', system: 'StationOS', models: ['PA100', 'PA100 Pro', 'PA200'] },
];

export const productSlugs = products.map((p) => p.slug);

export function isProductSlug(slug?: string): slug is Product['slug'] {
  return !!slug && (productSlugs as string[]).includes(slug);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getOtherProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug !== slug);
}

/** 产品目录在指定语言下的站点内 URL（默认语言无前缀，见 src/lib/i18n.ts 的 hideLocale） */
export function productUrl(slug: string, locale: string): string {
  return locale === i18n.defaultLanguage ? `/${slug}` : `/${locale}/${slug}`;
}

export function productModels(product: Product): string {
  return product.models.join(' / ');
}

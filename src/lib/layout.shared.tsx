import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n, localeConfigs } from './i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { gitConfig } from './shared';
import { uiStrings } from './ui-translations';
import { products, productUrl } from './products';
import { getProductLabels } from './product-labels';

// UI translations: official Fumadocs language pack + per-locale display names
// + localized UI strings (src/lib/ui-translations.ts; missing keys fall back to
// Fumadocs' English defaults). `displayName` is the language switcher label.
export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add(
    'ui',
    Object.fromEntries(
      localeConfigs.map((locale) => [
        locale.id,
        { displayName: locale.displayName, ...uiStrings[locale.id] },
      ]),
    ),
  );

export function baseOptions(locale: string): BaseLayoutProps {
  const labels = getProductLabels(locale);

  return {
    nav: {
      // 站名（各语言文案在 src/lib/product-labels.ts 的 hub.title）
      title: labels.hub.title,
    },
    // 顶部产品切换：两个产品线平铺，当前所在由 fumadocs 依据 URL 自动高亮
    links: products.map((product) => ({
      type: 'main' as const,
      text: labels.line[product.slug],
      url: productUrl(product.slug, locale),
    })),
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

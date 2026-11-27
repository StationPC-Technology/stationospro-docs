import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n, localeConfigs } from './i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { gitConfig } from './shared';
import { uiStrings } from './ui-translations';
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
    // 产品切换不放顶栏：文档页由侧栏 tabs 承担（tabMode='auto'），站首页由产品卡承担
    links: [],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

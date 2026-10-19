import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n, localeConfigs } from './i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { appName, gitConfig } from './shared';
import { uiStrings } from './ui-translations';

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
  return {
    nav: {
      // JSX supported
      title: appName,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

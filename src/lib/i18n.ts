import { defineI18n } from 'fumadocs-core/i18n';
import locales from '../../locales.json';

// 语言清单单一来源是根目录 locales.json（新增语言只改它 + 下面的 localeConfigs
// 元数据 + glossary.json）。`content/docs/zh/**` 是唯一人工编写的源语言，其余
// 语言由 LLM 翻译流程（.agents/skills/translate-docs）生成。
export const languages: readonly string[] = locales.languages;
export const defaultLanguage: string = locales.default;
export const sourceLanguage: string = locales.source;

export type Locale = (typeof languages)[number];

// UI 显示名与搜索分词配置（仅元数据，语言清单见 locales.json）
export const localeConfigs = [
  { id: 'zh', tag: 'zh-Hans', displayName: '简体中文', direction: 'ltr', search: 'cjk' },
  { id: 'zh-Hant', tag: 'zh-Hant', displayName: '繁體中文', direction: 'ltr', search: 'cjk' },
  { id: 'en', tag: 'en', displayName: 'English', direction: 'ltr', search: 'english' },
  { id: 'ja', tag: 'ja', displayName: '日本語', direction: 'ltr', search: 'cjk' },
  { id: 'ko', tag: 'ko', displayName: '한국어', direction: 'ltr', search: 'cjk' },
  { id: 'de', tag: 'de', displayName: 'Deutsch', direction: 'ltr', search: 'english' },
  { id: 'fr', tag: 'fr', displayName: 'Français', direction: 'ltr', search: 'english' },
  { id: 'es', tag: 'es', displayName: 'Español', direction: 'ltr', search: 'english' },
];

export type LocaleConfig = (typeof localeConfigs)[number];

export function getLocaleConfig(locale: string): LocaleConfig {
  return localeConfigs.find((item) => item.id === locale) ?? localeConfigs[0];
}

export const i18n = defineI18n({
  defaultLanguage,
  languages: [...languages],
  parser: 'dir',
  // Default locale (en) is served without a URL prefix:
  //   /docs    -> English (rewritten internally to /en/docs)
  //   /zh/docs -> Chinese, /ja/docs -> Japanese, ...
  hideLocale: 'default-locale',
});

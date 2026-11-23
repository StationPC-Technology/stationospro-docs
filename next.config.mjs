import { readFileSync } from 'node:fs';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// 语言清单单一来源：locales.json
const {
  source: SOURCE_LOCALE,
  default: DEFAULT_LOCALE,
  languages,
} = JSON.parse(readFileSync(new URL('./locales.json', import.meta.url), 'utf8'));

// 译文语言（源语言直引 /images/common/，不在列表内）。
// 译文 MDX 统一引用 /images/<语言>/...；图片在 public/images/<语言>/ 下不存在时
// 由 afterFiles rewrite 自动回退到 /images/common/——本地化某张图只需把文件
// 放进 public/images/<语言>/，无需改动任何 MDX。
const TRANSLATED_LOCALES = languages.filter((l) => l !== SOURCE_LOCALE);

// 历史 URL：帮助中心曾经挂在 `/docs` 前缀下（/docs/desktop/... 与 /docs/policies/...）。
// 去掉前缀后需要把老链接 301 到新地址。规则顺序敏感：精确路径在通配之前。
// 默认语言（en）有两种历史写法：`/docs/x` 与 `/en/docs/x`，都要落回无前缀地址。
function legacyDocsRedirects() {
  // 默认语言 en 有两种历史写法：无前缀 与 `/en` 前缀（`/en` 是隐藏段，会先被
  // 中间件跳到无前缀地址；这里也直接给出规则，少一跳）
  const prefixes = [
    '',
    `/${DEFAULT_LOCALE}`,
    ...languages.filter((l) => l !== DEFAULT_LOCALE).map((l) => `/${l}`),
  ];
  const rules = [];

  for (const prefix of prefixes) {
    // `/en/docs/x` → `/x`：默认语言不保留前缀（`/en` 是隐藏的默认语言段）
    const base = prefix === `/${DEFAULT_LOCALE}` ? '' : prefix;

    rules.push(
      { source: `${prefix}/docs`, destination: base ? `${base}/` : '/', permanent: true },
      { source: `${prefix}/docs/policies/:slug`, destination: `${base}/policies/:slug`, permanent: true },
      { source: `${prefix}/docs/contact`, destination: `${base}/contact`, permanent: true },
      { source: `${prefix}/docs/:path*`, destination: `${base}/desktop/:path*`, permanent: true },
    );
  }

  return rules;
}

// 旧站 URL（VuePress 时期）：`/pocketcloud/...` 与带语言前缀的 `/zh-CN/pocketcloud/...`。
// 旧站六种语言前缀与新站不同名（zh-CN→zh、zh-TW→zh-Hant、ja-JP→ja、ko-KR→ko、de-DE→de）。
// 交付后如果历史链接直接打到 docs.stationpc.com（而不是还在跑的 help.stationpc.*），
// 这些规则能让它落到正确页面，而不是 404。
const LEGACY_LOCALES = {
  'zh-CN': 'zh',
  'zh-TW': 'zh-Hant',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'de-DE': 'de',
};

function legacySiteRedirects() {
  const rules = [];

  for (const [oldLocale, newLocale] of Object.entries(LEGACY_LOCALES)) {
    rules.push(
      { source: `/${oldLocale}/pocketcloud`, destination: `/${newLocale}/portable`, permanent: true },
      {
        source: `/${oldLocale}/pocketcloud/:path*`,
        destination: `/${newLocale}/portable/:path*`,
        permanent: true,
      },
      // 旧站语言首页（`/zh-CN/`）落到新站对应语言首页
      { source: `/${oldLocale}`, destination: `/${newLocale}`, permanent: true },
    );
  }

  // 新站语言前缀 + 旧产品名（`/zh/pocketcloud/x`，手工拼过的链接会遇到）
  for (const locale of languages) {
    const base = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    rules.push({
      source: `/${locale}/pocketcloud/:path*`,
      destination: `${base}/portable/:path*`,
      permanent: true,
    });
  }

  // 旧站英文站没有语言前缀（`/pocketcloud/...`）。
  // 顺序敏感：`/pocketcloud/search`（已废弃的站内搜索页）必须排在通配之前。
  rules.push(
    { source: '/pocketcloud/search', destination: '/portable', permanent: true },
    { source: '/pocketcloud', destination: '/portable', permanent: true },
    { source: '/pocketcloud/:path*', destination: '/portable/:path*', permanent: true },
  );

  return rules;
}

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // standalone 输出：产出可直接运行的 server.js，供 Docker 化部署使用
  output: 'standalone',
  async rewrites() {
    return {
      // afterFiles：public 静态文件优先命中，未命中才走 rewrite 回退
      afterFiles: [
        {
          source: `/images/:lang(${TRANSLATED_LOCALES.join('|')})/:path*`,
          destination: '/images/common/:path*',
        },
      ],
    };
  },
  async redirects() {
    // 顺序：VuePress 旧站规则在前（更具体），`/docs` 前缀规则在后
    return [...legacySiteRedirects(), ...legacyDocsRedirects()];
  },
};

export default withMDX(config);

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
    return legacyDocsRedirects();
  },
};

export default withMDX(config);

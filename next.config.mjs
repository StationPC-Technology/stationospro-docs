import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// 译文语言（与 src/lib/i18n.ts 保持一致，zh 为源语言直引 common，不在列表内）。
// 译文 MDX 统一引用 /images/<语言>/...；图片在 public/images/<语言>/ 下不存在时
// 由 afterFiles rewrite 自动回退到 /images/common/——本地化某张图只需把文件
// 放进 public/images/<语言>/，无需改动任何 MDX。
const TRANSLATED_LOCALES = ['zh-Hant', 'en', 'ja', 'ko', 'de', 'fr', 'es'];

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
};

export default withMDX(config);
